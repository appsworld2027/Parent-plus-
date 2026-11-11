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

// SecureStore values have platform-dependent size limits. Commit a manifest only
// after every new ASCII chunk is written, so interrupted refreshes keep the old session.
export function createSessionStorage(driver: StorageDriver) {
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
      const manifest = parseManifest(await driver.getItem(key));
      await driver.removeItem(key);
      if (manifest) await cleanup(key, manifest);
    }),
  };
}
