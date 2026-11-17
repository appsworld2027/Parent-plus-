import {expect,it} from 'vitest';
import {photoLimit,photoType} from '../src/photos/model';
it('accepts only supported photo byte signatures and enforces the byte limit',()=>{
  expect(photoType(new Uint8Array([255,216,255,1]))).toEqual({mime:'image/jpeg',extension:'jpg'});
  expect(photoType(new Uint8Array([137,80,78,71,13,10,26,10]))).toEqual({mime:'image/png',extension:'png'});
  expect(photoType(new TextEncoder().encode('RIFF0000WEBP'))).toEqual({mime:'image/webp',extension:'webp'});
  for(const bytes of [new Uint8Array(),new TextEncoder().encode('<svg onload="alert(1)">'),new Uint8Array(photoLimit+1)])expect(()=>photoType(bytes)).toThrow();
});
