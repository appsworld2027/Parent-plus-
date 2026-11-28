// Pure push rules (no platform imports) so they are unit-testable.
export type PushState = 'unsupported' | 'ios-install' | 'blocked' | 'off' | 'on';
// Copy for each state (WPN-02..06). 'unsupported' shows nothing.
export const pushCopy: Record<PushState, { title: string; body: string } | null> = {
  unsupported: null,
  'ios-install': { title: 'Get alerts on your iPhone', body: 'Tap Share, then Add to Home Screen, then open Parent Plus from your Home Screen and turn on alerts.' },
  blocked: { title: 'Alerts are blocked', body: 'Allow notifications for this site in your browser settings, then come back and turn them on.' },
  off: { title: 'Get alerts from your coach', body: 'Hear about holidays, class changes and new updates even when the app is closed.' },
  on: { title: 'Alerts are on for this device', body: 'You will be told when your coach posts something new.' },
};
export const toKey = (b64: string) => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
