// The server clock used for deadlines, audio grants and retention. Only test support moves it.

export type Clock = { now(): Date; advance(seconds: number): Date };

export function createClock(): Clock {
  let offsetMs = 0;
  const now = () => new Date(Date.now() + offsetMs);
  return {
    now,
    advance(seconds) {
      offsetMs += seconds * 1000;
      return now();
    },
  };
}
