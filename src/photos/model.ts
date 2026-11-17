export const photoLimit = 5 * 1024 * 1024;
export function photoType(bytes: Uint8Array): { mime: string; extension: string } {
  if (!bytes.length || bytes.length > photoLimit) throw new Error('Choose a photo up to 5 MB.');
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { mime: 'image/jpeg', extension: 'jpg' };
  if ([137,80,78,71,13,10,26,10].every((n,i) => bytes[i]===n)) return { mime: 'image/png', extension: 'png' };
  if (String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP') return { mime: 'image/webp', extension: 'webp' };
  throw new Error('Choose a JPEG, PNG or WebP photo.');
}
