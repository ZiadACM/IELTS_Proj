// Time shown to the learner: the playback clock as m:ss, and a share (0 to 1) for the saffron time line.
import type { CSSProperties } from 'react';

export const minutesSeconds = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// React sets this through the CSSOM, which the page's CSP allows (it forbids inline style attributes in markup).
export const lineShare = (share: number) => ({ '--share': Math.min(1, Math.max(0, share)) }) as CSSProperties;
