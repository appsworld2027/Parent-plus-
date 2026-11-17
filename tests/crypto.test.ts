import { webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { installAuthCrypto } from '../src/auth/cryptoSupport';

describe('native authentication cryptography adapter', () => {
  it('delegates random bytes and SHA-256 to the platform driver', async () => {
    const host: { crypto?: Partial<Crypto> } = {};
    const random = vi.fn(webcrypto.getRandomValues.bind(webcrypto)) as unknown as Crypto['getRandomValues'];
    const sha256 = vi.fn((data: BufferSource) => {
      const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
      return webcrypto.subtle.digest('SHA-256', Uint8Array.from(bytes));
    });
    installAuthCrypto(host, { random, sha256 });
    const array = new Uint32Array(5);
    expect(host.crypto!.getRandomValues!(array)).toBe(array);
    expect(random).toHaveBeenCalled();
    const result = await host.crypto!.subtle!.digest('SHA-256', new TextEncoder().encode('abc'));
    expect(Buffer.from(result).toString('hex')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256).toHaveBeenCalled();
    await expect(host.crypto!.subtle!.digest('MD5', new Uint8Array())).rejects.toThrow('Unsupported');
  });
  it('preserves an existing complete WebCrypto implementation', () => {
    const existing = globalThis.crypto;
    const host = { crypto: existing };
    const random = vi.fn() as unknown as Crypto['getRandomValues'];
    const sha256 = vi.fn();
    installAuthCrypto(host, { random, sha256 });
    expect(host.crypto).toBe(existing);
    expect(host.crypto.getRandomValues).toBe(existing.getRandomValues);
    expect(random).not.toHaveBeenCalled();
    expect(sha256).not.toHaveBeenCalled();
  });
});
