import { describe, expect, it } from 'vitest';
import { checkSafetyNote, safetyFailure, safetyNoteCounter, SAFETY_NOTE_MAX } from '../src/safety/rules';
describe('safety note rules (M2-43)', () => {
  it('SN-06 accepts exactly 500 and refuses 501 with a clear message', () => {
    expect(checkSafetyNote('x'.repeat(SAFETY_NOTE_MAX)).ok).toBe(true);
    const r = checkSafetyNote('x'.repeat(501)); expect(r.ok).toBe(false); expect(r.ok === false && r.message).toContain('500');
  });
  it('SN-07 blank or spaces-only becomes empty text (means clear)', () => { expect(checkSafetyNote('   ')).toEqual({ ok: true, text: '' }); });
  it('trims, and counts after trimming', () => { expect(checkSafetyNote('  Asthma ')).toEqual({ ok: true, text: 'Asthma' }); expect(safetyNoteCounter(' ab ')).toBe('2/500'); });
  it('SN-08 failures are plain and never leak details', () => {
    expect(safetyFailure({ code: '42501', message: 'secret internals' })).not.toContain('secret');
    expect(safetyFailure(new Error('boom'))).toContain('Your text is kept');
  });
});
