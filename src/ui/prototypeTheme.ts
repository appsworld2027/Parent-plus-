// Literal final cascade in both owner-supplied prototypes (9905456, 19 Nov 2026).
// The earlier light/system-font declarations are overridden by the Aurora skin.
import { Platform, type TextStyle } from 'react-native';
export const prototypeColors = {
  background: '#0c1722', surface: '#132231', raised: '#1c2f40', outline: '#284054',
  border: '#24384a', text: '#ffffff', muted: '#9eb2c4', dim: '#6f8597',
  sun: '#FFD23F', rose: '#FF5D8F', sky: '#3ABEFF', mint: '#2EE6A6',
  grape: '#A27BFF', tangerine: '#FF8A3D', white: '#ffffff', black: '#000000',
} as const;

export const prototypeFontFamily = 'Bricolage';
// CSS supports the prototype's intermediate variable weights. Native RN's
// accepted values are hundreds; keep those valid rather than passing 750/830.
export function prototypeWeight(weight:number):TextStyle['fontWeight'] {
  return String(Platform.OS==='web'?weight:Math.min(800,Math.max(200,Math.round(weight/100)*100))) as TextStyle['fontWeight'];
}
export const prototypeGeometry = {
  coach: { card: 18, button: 14, input: 12, heading: 30, section: 15.5 },
  parent: { card: 22, button: 16, input: 13, heading: 34, section: 19 },
  gutter: 18,
} as const;
