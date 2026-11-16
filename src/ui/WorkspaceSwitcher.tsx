import React from 'react';
import { Platform } from 'react-native';

// Same-tab navigation preserves the shared Auth session. Workspace ownership
// remains enforced by Supabase; selecting a space does not grant access.
export function WorkspaceSwitcher({ current, disabled = false }: {
  current: 'coach' | 'parent'; disabled?: boolean;
}) {
  if (Platform.OS !== 'web') return null;
  const dark = current === 'parent';
  const item: React.CSSProperties = {
    minHeight: 44, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 12px', boxSizing: 'border-box', borderRadius: 12,
    fontFamily: 'Bricolage, system-ui, sans-serif', fontSize: 14, fontWeight: 700, textDecoration: 'none',
    color: dark ? '#F9FBFC' : '#22303A', border: `1px solid ${dark ? '#415567' : '#CED8CC'}`,
  };
  return React.createElement('nav', { 'aria-label': 'Choose workspace', style: { padding: '10px 18px', backgroundColor: dark ? '#0C1722' : '#F3F5F1' } },
    React.createElement('div', { style: { display: 'flex', gap: 8 } },
      ...(['coach', 'parent'] as const).map(space => {
        const selected = space === current, label = space === 'coach' ? 'Coach space' : 'Parent space';
        const style = { ...item, backgroundColor: selected ? (dark ? '#253A4D' : '#DCEDEA') : (dark ? '#151A20' : '#FFF'), opacity: !selected && disabled ? 0.5 : 1 };
        if (selected) return React.createElement('span', { key: space, 'aria-current': 'page', style }, label);
        if (disabled) return React.createElement('span', { key: space, role: 'link', 'aria-label': `Open ${label}`, 'aria-disabled': true, style }, label);
        return React.createElement('a', { key: space, href: space === 'parent' ? '/parent' : '/', 'aria-label': `Open ${label}`, style }, label);
      })),
    disabled && React.createElement('p', { style: { margin: '7px 0 0', fontSize: 12, color: dark ? '#A9B3BF' : '#5C6B73' } }, 'Save or close your current form before switching spaces.'));
}
