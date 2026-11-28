// Browserless render of the Spotlight card (M2-18).
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SpotlightView } from '../../src/today/SpotlightView';

const text = (h: string) => h.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|').replace(/&#x27;/g, "'");
const row = (id: string, name: string, daysAgo: number | null, classes = ['Clay']) => ({ id, name, classes, lastNote: daysAgo === null ? null : 'x', daysAgo });
const render = (data: Parameters<typeof SpotlightView>[0]['data']) => renderToStaticMarkup(<SpotlightView data={data} onOpen={() => {}} />);

describe('SpotlightView', () => {
  it('renders nothing when no class has candidates today', () => { expect(render({ rows: [], candidates: 0, everyoneNotedToday: false })).toBe(''); });
  it('shows the heading, one hooked button per child, class and note wording', () => {
    const html = render({ rows: [row('a', 'Ann', null), row('b', 'Bo', 3, ['Clay', 'Art'])], candidates: 2, everyoneNotedToday: false });
    expect(html).toContain('data-testid="spotlight-section"'); expect(html.match(/data-testid="spotlight-row"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="Write a note for Ann"');
    const t = text(html);
    expect(t).toContain('Spotlight today'); expect(t).toContain('Clay · No note yet'); expect(t).toContain('Clay, Art · Last note 3 days ago');
  });
  it('shows the muted everyone-noted line and no rows', () => {
    const html = render({ rows: [], candidates: 4, everyoneNotedToday: true });
    expect(text(html)).toContain("Everyone in today's classes has a note today"); expect(html).not.toContain('spotlight-row');
  });
  it('lists children in the order given', () => {
    const t = text(render({ rows: [row('a', 'Zed', null), row('b', 'Amy', 9)], candidates: 2, everyoneNotedToday: false }));
    expect(t.indexOf('Zed')).toBeLessThan(t.indexOf('Amy'));
  });
});
