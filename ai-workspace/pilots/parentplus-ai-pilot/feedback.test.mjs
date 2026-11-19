import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { visibleFeedback } from './feedback.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8'));

test('PILOT-01 draft feedback is hidden', () => {
  assert.equal(visibleFeedback(fixture).some(({ id }) => id === 'draft-class'), false);
});

test('PILOT-02 published feedback is visible', () => {
  assert.deepEqual(visibleFeedback(fixture), [fixture[1]]);
});
