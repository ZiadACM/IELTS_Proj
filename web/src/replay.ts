// Answer Replay timing (ticket 10; D23 rule 3, D25, D27; docs/content/map-format-v2.md "Route legs"). Pure: what the
// map shows at a moment of the recording, from the authored route alone. Nothing here is generated or eased toward a
// point: each point appears whole once its words have been said. The only motion is a correction's wrong path pulling
// back (D25).
import type { Point } from './api.ts';

export type RouteEvent = {
  id: string;
  cueId: string;
  kind: 'move' | 'turn' | 'landmark' | 'distractor' | 'destination' | 'correction';
  at: Point;
  landmarkId?: string;
  startsLeg?: boolean;
  atSec?: number;
  wrongPath?: Point[];
  note?: string; // a distractor's or correction's authored note: why it misleads, or what was corrected
};
export type Cue = { id: string; start: number; end: number };

export const HOLD_SEC = 0.8; // the wrong path holds this long, then
export const PULL_BACK_SEC = 0.45; // pulls back over this long (D27)
export const SUMMARY_AFTER_SEC = 0.8; // all answers shown together this long after the last one is reached

// The place lit on the map: a named room or symbol, or the answer place once it is reached. One at a time (D27).
export type Lit = { landmarkId: string } | { answerAt: Point } | null;
// A place named by mistake: a correction's wrong place (a point), or a distractor's landmark. Framed, never lit.
export type Mistaken = { at: Point; landmarkId?: string };
export type Note = { kind: 'distractor' | 'correction'; text: string };
type WrongPath = { points: Point[]; at: number; backFrom: number; goneAt: number };
type Leg = {
  start: Point;
  startsAt: number;
  walk: { to: Point; at: number }[];
  marks: { lit: Lit; at: number }[]; // from each time on, until the next
  wrong: WrongPath[];
  mistaken: (Mistaken & { from: number })[]; // framed from its time on
  notes: (Note & { from: number })[]; // shown while that moment is the latest step
};
export type ReplayPlan = {
  legs: Leg[];
  summaryAt: number | null;
  steps: number[]; // every moment something new appears, in order: step back and forward land on these
  questionStarts: number[]; // per question, the start of the cue where its part of the walk begins
};

export type ReplayView = {
  leg: number; // the leg being drawn, -1 before the first
  line: Point[]; // the current leg's walked line so far
  earlier: Point[][]; // the legs before it, whole (drawn faded); in the summary, every leg
  lit: Lit;
  wrong: { points: Point[]; dashed: boolean }[];
  mistaken: Mistaken[];
  note: Note | null;
  head: Point | null; // where the walker is: the line's end, or the tip of a wrong path while it is out
  summary: boolean; // the end: every answer framed and numbered together, nothing single lit
};

// An event is reached once the speaker has said it: its atSec, else the end of its cue (never the cue's start).
const shownAt = (e: RouteEvent, cues: Cue[]) => e.atSec ?? cues.find((c) => c.id === e.cueId)?.end ?? 0;
// The last element that passes, and its index (the web build targets ES2022, which has no findLast).
function lastIndex<T>(list: T[], pass: (x: T) => boolean) {
  for (let i = list.length - 1; i >= 0; i--) if (pass(list[i])) return i;
  return -1;
}
const last = <T>(list: T[], pass: (x: T) => boolean): T | undefined => list[lastIndex(list, pass)];
const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
// Derived times are rounded to the millisecond, so 68.89 + 0.8 + 0.45 is 70.14 (authored times are in hundredths).
const ms = (sec: number) => Math.round(sec * 1000) / 1000;
const ease = (f: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, f)))) / 2; // sine, for the pull back only

// The first fraction f (0 to 1) of a polyline, measured along its length.
function partial(points: Point[], f: number): Point[] {
  if (f >= 1) return points;
  const total = points.slice(1).reduce((sum, p, i) => sum + dist(points[i], p), 0);
  const out = [points[0]];
  let left = Math.max(0, f) * total;
  for (let i = 1; i < points.length; i++) {
    const d = dist(points[i - 1], points[i]);
    if (left >= d) {
      out.push(points[i]);
      left -= d;
      continue;
    }
    const k = d ? left / d : 0;
    out.push({
      x: points[i - 1].x + (points[i].x - points[i - 1].x) * k,
      y: points[i - 1].y + (points[i].y - points[i - 1].y) * k,
    });
    break;
  }
  return out;
}

export function replayPlan({ events, cues }: { events: RouteEvent[]; cues: Cue[] }): ReplayPlan {
  const legs: Leg[] = [];
  const questionStarts: number[] = [];
  let free = 0; // the walk may not move on before this (it waits for a wrong path to be pulled back)
  for (const [i, e] of events.entries()) {
    // A question's part begins with the first event after the previous answer (v2: its leg's first event).
    if (i === 0 || events[i - 1].kind === 'destination')
      questionStarts.push(cues.find((c) => c.id === e.cueId)?.start ?? 0);
    if (!legs.length || e.startsLeg) {
      const T = shownAt(e, cues);
      // a new leg starts unlit
      legs.push({
        start: e.at,
        startsAt: T,
        walk: [],
        marks: [{ lit: null, at: T }],
        wrong: [],
        mistaken: [],
        notes: [],
      });
      free = T;
      continue;
    }
    const leg = legs[legs.length - 1];
    const T = Math.max(shownAt(e, cues), free);
    if (e.kind === 'correction' || e.kind === 'distractor') {
      // The place named by mistake is framed, not lit, and the line stays where it is (a distractor never changes the
      // route); a correction's wrong path runs on from there and is pulled back.
      leg.marks.push({ lit: null, at: T });
      leg.mistaken.push({
        at: e.at,
        ...(e.landmarkId && e.kind === 'distractor' ? { landmarkId: e.landmarkId } : {}),
        from: T,
      });
      if (e.note) leg.notes.push({ kind: e.kind, text: e.note, from: T });
      if (e.kind === 'distractor') continue;
      if (e.wrongPath?.length) {
        const from = leg.walk.at(-1)?.to ?? leg.start;
        const points = same(from, e.wrongPath[0]) ? e.wrongPath : [from, ...e.wrongPath];
        const backFrom = ms(T + HOLD_SEC);
        const goneAt = ms(backFrom + PULL_BACK_SEC);
        leg.wrong.push({ points, at: T, backFrom, goneAt });
        free = goneAt;
      }
      continue;
    }
    leg.walk.push({ to: e.at, at: T });
    if (e.kind === 'destination') leg.marks.push({ lit: { answerAt: e.at }, at: T });
    else if (e.landmarkId) leg.marks.push({ lit: { landmarkId: e.landmarkId }, at: T });
    free = T;
  }
  const answersAt = legs.flatMap((l) => l.marks.filter((m) => m.lit && 'answerAt' in m.lit).map((m) => m.at));
  const summaryAt = answersAt.length ? ms(Math.max(...answersAt) + SUMMARY_AFTER_SEC) : null;
  const moments = legs.flatMap((l) => [l.startsAt, ...l.walk.map((w) => w.at), ...l.mistaken.map((m) => m.from)]);
  if (summaryAt !== null) moments.push(summaryAt);
  const steps = [...new Set(moments)].sort((a, b) => a - b);
  return { legs, summaryAt, steps, questionStarts };
}

// A seek lands near its time, not always on it: within this much, the clock counts as on that step.
const ON_STEP_SEC = 0.05;

// The next (dir 1) or previous (dir -1) step from time t, or null at either end.
export function stepFrom(plan: ReplayPlan, t: number, dir: 1 | -1): number | null {
  const step = dir === 1 ? plan.steps.find((s) => s > t + ON_STEP_SEC) : last(plan.steps, (s) => s < t - ON_STEP_SEC);
  return step ?? null;
}

// The transcript line being spoken at time t: the last one started (it stays marked through the pause after it).
export const cueAt = (cues: Cue[], t: number) => last(cues, (c) => c.start <= t)?.id ?? null;

function noteAt(leg: Leg, step: number | undefined): Note | null {
  const n = leg.notes.find((x) => x.from === step);
  return n ? { kind: n.kind, text: n.text } : null;
}

const lineAt = (l: Leg, t: number) => [l.start, ...l.walk.filter((w) => w.at <= t).map((w) => w.to)];

export function replayAt(plan: ReplayPlan, t: number, reduced: boolean): ReplayView {
  const leg = lastIndex(plan.legs, (l) => l.startsAt <= t);
  if (leg < 0)
    return { leg, line: [], earlier: [], lit: null, wrong: [], mistaken: [], note: null, head: null, summary: false };
  const summary = plan.summaryAt !== null && t >= plan.summaryAt;
  const current = plan.legs[leg];
  const line = summary ? [] : lineAt(current, t);
  let head: Point | null = summary ? null : line[line.length - 1];
  const shown = plan.legs.slice(0, leg + 1);
  const wrong: ReplayView['wrong'] = [];
  for (const w of shown.flatMap((l) => l.wrong)) {
    if (t < w.at) continue;
    if (reduced) {
      wrong.push({ points: w.points, dashed: true });
      continue;
    }
    if (t >= w.goneAt) continue;
    const points = t < w.backFrom ? w.points : partial(w.points, 1 - ease((t - w.backFrom) / PULL_BACK_SEC));
    wrong.push({ points, dashed: false });
    head = points[points.length - 1];
  }
  return {
    leg,
    line,
    earlier: (summary ? shown : shown.slice(0, -1)).map((l) => lineAt(l, Number.POSITIVE_INFINITY)),
    lit: summary ? null : (last(current.marks, (m) => m.at <= t)?.lit ?? null),
    wrong,
    mistaken: shown.flatMap((l) => l.mistaken.filter((m) => m.from <= t).map(({ from: _, ...m }) => m)),
    note: noteAt(
      current,
      last(plan.steps, (s) => s <= t),
    ),
    head,
    summary,
  };
}
