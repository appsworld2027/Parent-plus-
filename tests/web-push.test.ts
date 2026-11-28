// Rules for docs/product/web-push (copy and key handling).
import { describe, expect, it } from 'vitest';
import { pushCopy, toKey } from '../src/parent/pushRules';

describe('web push client rules', () => {
  it('WPN-05 unsupported shows nothing; other states have copy', () => {
    expect(pushCopy.unsupported).toBeNull();
    for (const s of ['ios-install', 'blocked', 'off', 'on'] as const) expect(pushCopy[s]?.title.length).toBeGreaterThan(5);
  });
  it('WPN-04 iPhone guidance names Add to Home Screen', () => expect(pushCopy['ios-install']?.body).toContain('Add to Home Screen'));
  it('WPN-03 blocked guidance explains how to allow', () => expect(pushCopy.blocked?.body).toContain('browser settings'));
  it('public key decodes to 65 bytes starting with 0x04', () => {
    const k = toKey('BEKNN0zoffLW3RgCg7uggfl5VTbzYlqAw3Mco_rjkyrLpBlQTiIRfsGu2o-UlS4Tje-vwSs6gAx6f7n_ZcqzybQ');
    expect(k.length).toBe(65); expect(k[0]).toBe(4);
  });
});
