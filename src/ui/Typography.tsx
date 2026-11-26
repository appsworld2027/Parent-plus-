import React from 'react';
import { Text as NativeText, TextInput as NativeTextInput, type TextProps, type TextInputProps } from 'react-native';
import { isLoaded } from 'expo-font';
import { prototypeColors as c, prototypeFontFamily } from './prototypeTheme';

// Both final prototype skins use Bricolage, including controls. Keep the OFL
// font local; its absence must not prevent sign-in or hide a form's content.
export function Text({style,...props}:TextProps) {
  return <NativeText {...props} style={[{color:c.text},isLoaded(prototypeFontFamily)&&{fontFamily:prototypeFontFamily},style]} />;
}
export const TextInput = React.forwardRef<React.ComponentRef<typeof NativeTextInput>, TextInputProps>(function TextInput({style,placeholderTextColor,...props},ref) {
  return <NativeTextInput {...props} ref={ref} placeholderTextColor={placeholderTextColor??c.dim}
    style={[{color:c.text},isLoaded(prototypeFontFamily)&&{fontFamily:prototypeFontFamily},style]} />;
});
