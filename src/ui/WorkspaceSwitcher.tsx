import React from 'react';
import { Platform } from 'react-native';
import { prototypeColors as c, prototypeFontFamily } from './prototypeTheme';

// Same-tab navigation preserves the shared Auth session. Workspace ownership
// remains enforced by Supabase; selecting a space does not grant access.
export function WorkspaceSwitcher({ current, disabled = false, signup = false }: {
  current: 'coach' | 'parent'; disabled?: boolean; signup?: boolean;
}) {
  if (Platform.OS !== 'web') return null;
  const item: React.CSSProperties = {
    minHeight: 38, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '8px 12px', boxSizing: 'border-box', borderRadius: 999,
    fontFamily: `${prototypeFontFamily}, system-ui, sans-serif`, fontSize: 12, fontWeight: 750, textDecoration: 'none',
    color:c.muted,border:`1px solid ${c.outline}`,
  };
  return React.createElement('nav', { 'aria-label': 'Choose workspace', style: { padding: '10px 18px', backgroundColor:c.background } },
    React.createElement('div', { style: { display: 'flex', gap: 8 } },
      ...(['coach', 'parent'] as const).map(space => {
        const selected = space === current, label = space === 'coach' ? 'Coach space' : 'Parent space';
        const style = { ...item, backgroundColor:selected?c.white:c.surface,color:selected?c.black:c.muted,borderColor:selected?c.white:c.outline, opacity: !selected && disabled ? 0.5 : 1 };
        const text = signup ? `Sign up as a ${space === 'coach' ? 'Coach' : 'Parent'}` : label;
        const accessibleName = signup ? text : `Open ${label}`;
        if (selected && !signup) return React.createElement('span', { key: space, 'aria-current': 'page', style }, label);
        if (disabled) return React.createElement('span', { key: space, role: 'link', 'aria-label': accessibleName, 'aria-disabled': true, style }, text);
        return React.createElement('a', { key: space, href: signup ? `/${space}/signup` : space === 'parent' ? '/parent' : '/', 'aria-label': accessibleName, style }, text);
      })),
    disabled && React.createElement('p', { style: { margin: '7px 0 0', fontFamily:prototypeFontFamily,fontSize: 12, color:c.muted } }, 'Save or close your current form before switching spaces.'));
}
