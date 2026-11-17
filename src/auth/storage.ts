export interface StorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
type Manifest = { version: 1; generation: string; count: number };
const chunkSize = 1500;

function parseManifest(raw: string | null): Manifest | null {
  if (!raw) return null;
  const value = JSON.parse(raw) as Manifest;
  if (value.version !== 1 || !/^[a-z0-9-]+$/.test(value.generation)
    || !Number.isInteger(value.count) || value.count < 1 || value.count > 200) throw new Error('Invalid session manifest');
  return value;
}

// Used for auth sessions and separately named private-metadata keys. The driver
// supplies platform protection; this adapter only coordinates chunks and commits.
// SecureStore values have platform-dependent size limits. Commit a manifest only
// after every new ASCII chunk is written, so interrupted refreshes keep the old session.
export function createSessionStorage(driver: StorageDriver) {
  // Supabase can refresh/write while another operation reads the session. Serialize
  // the whole logical operation so readers never assemble two different generations.
  let queue: Promise<unknown> = Promise.resolve();
  function serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  }
  const chunkKey = (key: string, manifest: Manifest, index: number) => `${key}.${manifest.generation}.${index}`;
  async function cleanup(key: string, manifest: Manifest) {
    await Promise.all(Array.from({ length: manifest.count }, (_, i) => driver.removeItem(chunkKey(key, manifest, i))));
  }
  return {
    getItem: (key: string) => serial(async () => {
      const manifest = parseManifest(await driver.getItem(key));
      if (!manifest) return null;
      const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => driver.getItem(chunkKey(key, manifest, i))));
      if (chunks.some(value => value === null)) throw new Error('Session storage incomplete');
      return decodeURIComponent(chunks.join(''));
    }),
    setItem: (key: string, value: string) => serial(async () => {
      const encoded = encodeURIComponent(value);
      const previous = parseManifest(await driver.getItem(key));
      const next: Manifest = { version: 1, generation: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`, count: Math.max(1, Math.ceil(encoded.length / chunkSize)) };
      if (next.count > 200) throw new Error('Session storage limit exceeded');
      try {
        for (let i = 0; i < next.count; i++) await driver.setItem(chunkKey(key, next, i), encoded.slice(i * chunkSize, (i + 1) * chunkSize));
        await driver.setItem(key, JSON.stringify(next));
      } catch (error) {
        await cleanup(key, next).catch(() => undefined);
        throw error;
      }
      // A cleanup failure must not turn a committed refresh into a failed login.
      if (previous) await cleanup(key, previous).catch(() => undefined);
    }),
    removeItem: (key: string) => serial(async () => {
      const raw = await driver.getItem(key);
      let manifest: Manifest | null = null;
      try { manifest = parseManifest(raw); }
      catch { /* Explicit discard/sign-out must work even with a corrupt index. */ }
      // SecureStore cannot enumerate unknown orphan chunks after index corruption.
      // Remove the index regardless; clean known chunks only from a valid manifest.
      await driver.removeItem(key);
      if (manifest) await cleanup(key, manifest);
    }),
  };
}

// Email apps commonly open a new tab. Share only each addressed PKCE proof,
// with an expiry, so that tab can redeem its one-time code. Sessions remain in
// sessionStorage; no password/access/refresh token is copied to localStorage.
export function createWebAuthStorage(tabDriver:StorageDriver,sharedDriver:StorageDriver,storageKey:string,options:{projectStorageKey?:string;now?:()=>number;ttlMs?:number}={}):StorageDriver {
  const {projectStorageKey=storageKey,now=Date.now,ttlMs=60*60*1000}=options;
  const tab=createSessionStorage(tabDriver),prefix='parentplus.pkce.v1.';
  // The SDK's notification channel is per document; persisted per-tab keys and
  // shared pending email proofs retain the stable project namespace on reload.
  const flowIndex=`${storageKey}-flows-code-verifier`;
  const normalize=(key:string)=>key===flowIndex?key:key===storageKey||key.startsWith(`${storageKey}-`)?projectStorageKey+key.slice(storageKey.length):key;
  const sharedProof=(key:string)=>key.startsWith(`${projectStorageKey}-flow-`)&&/^[a-zA-Z0-9_-]{8,64}-code-verifier$/.test(key.slice(`${projectStorageKey}-flow-`.length));
  const proofKey=(key:string)=>key===`${projectStorageKey}-code-verifier`||key===flowIndex||sharedProof(key);
  const unpack=(raw:string,legacy=false):string|null=>{
    try {
      const value=JSON.parse(raw);
      if(legacy&&(typeof value==='string'||Array.isArray(value)))return raw;
      return value&&value.version===1&&typeof value.value==='string'&&value.value.length<=2048
        &&Number.isFinite(value.expiresAt)&&value.expiresAt>now()?value.value:null;
    }catch{return null;}
  };
  const remove=async(key:string)=>{
    await tab.removeItem(key);
    if(sharedProof(key))try{await sharedDriver.removeItem(prefix+key);}catch{/* Same-tab fallback works when shared browser storage is blocked. */}
  };
  return {
    async getItem(key){
      key=normalize(key);
      if(!proofKey(key))return tab.getItem(key);
      let shared:string|null=null;
      if(sharedProof(key))try{shared=await sharedDriver.getItem(prefix+key);}catch{/* Read the same-tab fallback below. */}
      if(shared!==null){
        const value=unpack(shared);
        if(value===null)await remove(key);
        return value;
      }
      const previous=await tab.getItem(key);
      if(previous===null)return null;
      const value=unpack(previous,true);
      if(value===null)await remove(key);
      return value;
    },
    async setItem(key,value){
      key=normalize(key);
      if(!proofKey(key)){await tab.setItem(key,value);return;}
      if(value.length>2048)throw new Error('Email-link proof is too large');
      const wrapped=JSON.stringify({version:1,expiresAt:now()+ttlMs,value});
      // The SDK uses its flow index for logout cleanup. Keep that index per
      // document (even across cloned tabs), and the legacy fallback per tab.
      if(!sharedProof(key)){await tab.setItem(key,wrapped);return;}
      let stored=false;
      try{await sharedDriver.setItem(prefix+key,wrapped);stored=true;}catch{/* Private mode may permit only the current tab. */}
      if(stored){
        // Avoid a second unexpired copy reviving a proof consumed in another tab.
        await tab.removeItem(key);
      }else await tab.setItem(key,wrapped);
    },
    async removeItem(key){key=normalize(key);if(proofKey(key))await remove(key);else await tab.removeItem(key);},
  };
}
