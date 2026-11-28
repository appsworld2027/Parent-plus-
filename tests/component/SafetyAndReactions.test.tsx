// Browserless render (react-native-web, static markup) of the safety note card and the parent reaction row.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../src/auth/client', () => ({ supabase: null }));
import { SafetyNote } from '../../src/safety/SafetyNote';
import { FeedbackReactions } from '../../src/parent/FeedbackReactions';
import { CoachReactions } from '../../src/today/CoachReactions';
const text = (html: string) => html.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
const never = () => new Promise<never>(() => undefined);
describe('SafetyNote card', () => {
  it('SN-03 states it is private and shows Checking while loading, with no editor yet', () => {
    const html = renderToStaticMarkup(<SafetyNote studentId="s" load={never} />);
    expect(text(html)).toContain('Private to you. Parents never see this.'); expect(text(html)).toContain('Checking…'); expect(html).not.toContain('Save safety note');
  });
});
describe('FeedbackReactions row', () => {
  const client = { load: never, react: never, remove: never };
  it('PR-01 shows the three reactions and the prompt, no Undo before reacting', () => {
    const t = text(renderToStaticMarkup(<FeedbackReactions handoffId="h" client={client} />));
    for (const label of ['Thank you', 'Helpful', 'We will try this', 'Let your coach know:']) expect(t).toContain(label);
    expect(t).not.toContain('Undo');
  });
});
describe('CoachReactions card', () => {
  it('PR-11 renders nothing when there are no reactions', () => { expect(renderToStaticMarkup(<CoachReactions academyId="a" rows={[]} />)).toBe(''); });
  it('PR-05 shows total and per-note counts without parent names', () => {
    const t = text(renderToStaticMarkup(<CoachReactions academyId="a" rows={[{ handoff_id: 'a', reaction: 'thanks', reacted_at: '2026-11-28T10:00:00Z' }, { handoff_id: 'a', reaction: 'helpful', reacted_at: '2026-11-28T11:00:00Z' }]} />));
    expect(t).toContain('Parents reacted to your feedback (2)'); expect(t).toContain('Thank you ×1 · Helpful ×1');
  });
});
