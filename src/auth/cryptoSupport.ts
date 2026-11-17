type CryptoHost = { crypto?: Partial<Crypto> };
type Driver = { random: Crypto['getRandomValues']; sha256: (data: BufferSource) => Promise<ArrayBuffer> };

// Adapt native Expo cryptography to the two WebCrypto methods used by Supabase
// PKCE. No random generation or hashing algorithm is implemented in app code.
export function installAuthCrypto(host: CryptoHost, driver: Driver) {
  const value = host.crypto ?? {};
  if (!value.getRandomValues) Object.defineProperty(value, 'getRandomValues', { value: driver.random });
  if (!value.subtle?.digest) {
    const subtle = Object.create(value.subtle ?? null);
    Object.defineProperty(subtle, 'digest', { value: (algorithm: AlgorithmIdentifier, data: BufferSource) => {
      const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
      if (name.toUpperCase() !== 'SHA-256') return Promise.reject(new Error('Unsupported auth digest'));
      return driver.sha256(data);
    } });
    Object.defineProperty(value, 'subtle', { value: subtle });
  }
  if (!host.crypto) Object.defineProperty(host, 'crypto', { value, configurable: true });
}
