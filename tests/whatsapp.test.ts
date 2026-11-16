import { expect, it } from 'vitest';
import { feedbackMessage, whatsappLink, whatsappNumber } from '../src/observations/whatsapp';
import { parseBatchFee, parseFee } from '../src/roster/model';

it('requires an explicit international recipient and rejects link injection or ambiguous local numbers', () => {
  expect(whatsappNumber('+91 (98765) 43210')).toBe('919876543210');
  for (const value of ['9876543210', '+0123456789', '+919876543210?text=other', '+12', '+1234567890123456']) expect(whatsappNumber(value)).toBeNull();
});
it('encodes feedback as a single message and refuses blank or oversized text', () => {
  const message = feedbackMessage('Academy', 'Ria', 'Art', 'Great work & practice? #1');
  const link = whatsappLink('+919876543210', message)!;
  const url = new URL(link);
  expect(url.origin).toBe('https://wa.me');
  expect([...url.searchParams.keys()]).toEqual(['text']);
  expect(url.searchParams.get('text')).toBe(message);
  expect(message).toContain('Feedback for Ria · Art');
  expect(whatsappLink('+919876543210', '')).toBeNull();
  expect(whatsappLink('+919876543210', 'a'.repeat(10001))).toBeNull();
});
it('allows a teaching batch without fee setup while financial input remains strict', () => {
  expect(parseBatchFee('')).toBe(0);
  expect(parseBatchFee('  ')).toBe(0);
  expect(parseFee('')).toBeNull();
  expect(parseBatchFee('-10')).toBeNull();
  expect(parseBatchFee('2500.50')).toBe(250050);
});
