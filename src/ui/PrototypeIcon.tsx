import React from 'react';
import { SvgXml } from 'react-native-svg';
import paths from './prototypeIcons.json';

// SVG geometry is copied verbatim from the owner's I/P icon dictionaries.
// No user markup is accepted and the native/web renderer uses the same paths.
export function PrototypeIcon({name,source='coach',size=22,color='#ffffff',strokeWidth=1.9}:{
  name:string;source?:'coach'|'parent';size?:number;color?:string;strokeWidth?:number;
}) {
  const geometry=(paths[source] as Record<string,string>)[name];
  if(!geometry)return null;
  return <SvgXml accessible={false} aria-hidden width={size} height={size} color={color}
    xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${geometry}</svg>`} />;
}
