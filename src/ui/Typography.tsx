import React from 'react';
import { Text as NativeText, type TextProps } from 'react-native';
import { isLoaded } from 'expo-font';
// The supplied Coach/Aurora references use Bricolage Grotesque. Self-host the
// OFL font; fall back to system text if loading fails rather than blocking access.
export function Text({style,...props}:TextProps) { return <NativeText {...props} style={[isLoaded('Bricolage')&&{fontFamily:'Bricolage'},style]} />; }
