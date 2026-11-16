// Fixed-window request counter per client key, on the server clock so tests can move it.
// shortcut: in memory, so limits reset on restart and are per process; fine for one Node service in the pilot.
// Revisit before running more than one instance.
import type { Clock } from '../clock.ts';

export type RateLimit = { allow(key: string): boolean; reset(): void };

export function createRateLimit({
  limit,
  windowSeconds,
  clock,
}: {
  limit: number;
  windowSeconds: number;
  clock: Clock;
}) {
  const windowMs = windowSeconds * 1000;
  const windows = new Map<string, { start: number; count: number }>();

  return {
    allow(key: string) {
      const now = clock.now().getTime();
      if (windows.size > 10_000) {
        for (const [k, w] of windows) if (now - w.start >= windowMs) windows.delete(k);
      }
      const current = windows.get(key);
      if (!current || now - current.start >= windowMs) {
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      current.count++;
      return current.count <= limit;
    },
    reset() {
      windows.clear();
    },
  } satisfies RateLimit;
}
