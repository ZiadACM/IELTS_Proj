// Answer Replay timing (ticket 10, D23 rule 3, D25, D27). Expected values are read by hand from the authored times of
// the v2 first challenge (tools/fixtures/map-002-v2.valid.json: each event's atSec and cue start) and the D27
// constants (hold 0.8 s, pull back 0.45 s with sine easing, summary 0.8 s after the last answer), never produced by the
// code under test. The prototype's checks (check-replay.mjs, agent/map-format-v2-prototype) are the behaviour reference.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { cueAt, type ReplayView, replayAt, replayPlan, stepFrom } from '../src/replay.ts';

const item = JSON.parse(readFileSync(new URL('../../tools/fixtures/map-002-v2.valid.json', import.meta.url), 'utf8'));
const plan = replayPlan({ events: item.events, cues: item.transcript.cues });
const at = (t: number, reduced = false): ReplayView => replayAt(plan, t, reduced);
const P = (x: number, y: number) => ({ x, y });

test('before the first leg starts (16.42 s) nothing is drawn', () => {
  const v = at(16.4);
  assert.equal(v.leg, -1);
  assert.deepEqual(v.line, []);
  assert.equal(v.summary, false);
});

test('leg 1: the line jumps to each point when its words end, never before', () => {
  assert.deepEqual(at(16.42).line, [P(500, 840)]); // e1, the entrance ring
  assert.deepEqual(at(20.41).line, [P(500, 840)]); // e2 is said at 20.42
  assert.deepEqual(at(20.42).line, [P(500, 840), P(500, 560)]);
  assert.deepEqual(at(26.02).line, [P(500, 840), P(500, 560), P(640, 560)]);
  assert.deepEqual(at(28.64).line, [P(500, 840), P(500, 560), P(640, 560), P(922, 560), P(922, 585), P(933, 702)]);
  assert.equal(at(28.64).leg, 0);
});

const leg1Whole = [P(500, 840), P(500, 560), P(640, 560), P(922, 560), P(922, 585), P(933, 702)];

test('a new leg starts over at the entrance; earlier legs stay whole behind it', () => {
  const v = at(34.01); // e7 "Starting from the main entrance again"
  assert.equal(v.leg, 1);
  assert.deepEqual(v.line, [P(500, 840)]);
  assert.deepEqual(v.earlier, [leg1Whole]);
  assert.deepEqual(at(34.0).earlier, []); // still leg 1
});

test('the place just named is lit until the next is named; a new leg starts unlit (D27)', () => {
  assert.equal(at(16.42).lit, null); // the entrance: the start ring marks it
  assert.equal(at(20.41).lit, null);
  assert.deepEqual(at(20.42).lit, { landmarkId: 'noticeboard' }); // e2 "turn right"
  assert.deepEqual(at(23.35).lit, { landmarkId: 'meeting-room' });
  assert.deepEqual(at(26.03).lit, { landmarkId: 'meeting-room' }); // e4 names no place: the meeting room stays lit
  assert.deepEqual(at(28.64).lit, { answerAt: P(933, 702) }); // e6, the answer place C
  assert.equal(at(34.01).lit, null); // leg 2 starts unlit
  assert.deepEqual(at(37.48).lit, { landmarkId: 'noticeboard' });
  assert.deepEqual(at(45.15).lit, { landmarkId: 'staff-office' });
});

const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-6, `${JSON.stringify(a)} is not ${JSON.stringify(b)}`);

test('correction (e19, 68.89 s): the wrong path appears whole, holds 0.8 s, pulls back over 0.45 s, then is gone', () => {
  assert.deepEqual(at(68.88).wrong, []);
  const shown = at(68.89);
  assert.deepEqual(shown.wrong, [{ points: [P(290, 92), P(265, 92)], dashed: false }]); // from the corridor end to room G's door
  near(shown.head, P(265, 92));
  assert.equal(shown.lit, null); // the place named by mistake gets a frame, not the highlight
  assert.deepEqual(shown.mistaken, [P(265, 92)]);
  assert.deepEqual(at(69.68).wrong[0].points, [P(290, 92), P(265, 92)]); // still holding at 68.89 + 0.8
  // Halfway through the pull back (69.69 + 0.225 s) the sine easing is at one half: 12.5 of the 25 units are left.
  const half = at(69.915).wrong[0].points;
  assert.equal(half.length, 2);
  near(half[1], P(277.5, 92));
  near(at(69.915).head, P(277.5, 92));
  const gone = at(70.14);
  assert.deepEqual(gone.wrong, []);
  assert.deepEqual(gone.mistaken, [P(265, 92)]); // the mistaken place stays framed
  near(gone.head, P(290, 92));
});

test('reduced motion: the wrong path appears dashed at its time and stays; the head never follows it', () => {
  assert.deepEqual(at(68.88, true).wrong, []);
  assert.deepEqual(at(68.89, true).wrong, [{ points: [P(290, 92), P(265, 92)], dashed: true }]);
  assert.deepEqual(at(75, true).wrong, [{ points: [P(290, 92), P(265, 92)], dashed: true }]);
  near(at(68.89, true).head, P(290, 92));
});

test('the walk waits for the pull back: a point said during the hold appears when the wrong path is gone', () => {
  const small = replayPlan({
    cues: [{ id: 'c1', start: 0, end: 20 }],
    events: [
      { id: 'e1', cueId: 'c1', kind: 'move', at: P(0, 0), atSec: 1 },
      { id: 'e2', cueId: 'c1', kind: 'move', at: P(0, 10), atSec: 5 },
      { id: 'e3', cueId: 'c1', kind: 'correction', at: P(-10, 10), wrongPath: [P(-10, 10)], atSec: 10 },
      { id: 'e4', cueId: 'c1', kind: 'move', at: P(10, 10), atSec: 10.5 },
    ],
  });
  // 10 + 0.8 hold + 0.45 pull back = 11.25
  assert.deepEqual(replayAt(small, 11.24, false).line, [P(0, 0), P(0, 10)]);
  assert.deepEqual(replayAt(small, 11.25, false).line, [P(0, 0), P(0, 10), P(10, 10)]);
  assert.deepEqual(replayAt(small, 10, false).wrong[0].points, [P(0, 10), P(-10, 10)]); // starts at the line's end
});

test('summary: 0.8 s after the last answer (76.08 s) all legs show whole and the single highlight goes', () => {
  const before = at(76.87);
  assert.equal(before.summary, false);
  assert.deepEqual(before.lit, { answerAt: P(392, 92) }); // e21, H
  const v = at(76.88);
  assert.equal(v.summary, true);
  assert.equal(v.lit, null);
  assert.equal(v.head, null);
  assert.deepEqual(v.line, []);
  assert.equal(v.earlier.length, 3);
  assert.deepEqual(v.earlier[0], leg1Whole);
  assert.deepEqual(v.earlier[2].at(-1), P(392, 92));
  assert.deepEqual(v.mistaken, [P(265, 92)]); // the framed wrong place stays
  assert.deepEqual(v.wrong, []);
  assert.deepEqual(at(76.88, true).wrong, [{ points: [P(290, 92), P(265, 92)], dashed: true }]); // reduced: stays
});

// Every moment something new appears: each point and the correction (one step), then the summary.
const STEPS = [
  16.42, 20.42, 23.35, 26.03, 27.15, 28.64, 34.01, 37.48, 40.45, 45.15, 48.46, 49.66, 50.11, 56.28, 58.41, 59.67, 63.62,
  65.12, 68.89, 72.95, 76.08, 76.88,
];

test('step forward goes to the next moment something appears; step back to the one before', () => {
  assert.equal(stepFrom(plan, 0, 1), 16.42);
  assert.equal(stepFrom(plan, 20.42, 1), 23.35);
  assert.equal(stepFrom(plan, 20.42, -1), 16.42);
  assert.equal(stepFrom(plan, 21, -1), 20.42);
  assert.equal(stepFrom(plan, 20.43, -1), 16.42); // a seek lands a hair after its step: that still counts as being on it
  assert.equal(stepFrom(plan, 68.89, 1), 72.95); // the correction is one step; the hold and pull back are not
  assert.equal(stepFrom(plan, 76.88, 1), null);
  assert.equal(stepFrom(plan, 16.42, -1), null);
  const walked: number[] = [];
  let next = stepFrom(plan, 0, 1);
  while (next !== null) {
    walked.push(next);
    next = stepFrom(plan, next, 1);
  }
  assert.deepEqual(walked, STEPS);
});

test("jump to a question starts at the cue holding its leg's first words", () => {
  assert.deepEqual(plan.questionStarts, [12.95, 29.64, 51.11]); // c3, c5, c8
});

test('v1 route (one leg, no atSec): points at the end of their cue; questions start after the previous answer', () => {
  const v1 = JSON.parse(
    readFileSync(new URL('../../docs/content/items/first-challenge-001.json', import.meta.url), 'utf8'),
  );
  const p1 = replayPlan({ events: v1.events, cues: v1.transcript.cues });
  assert.equal(p1.legs.length, 1);
  assert.deepEqual(p1.questionStarts, [12.72, 48.69, 64.16]); // c3; c10 after e7; c13 after e12
  assert.deepEqual(replayAt(p1, 22.7, false).line, [P(500, 660)]); // e2 at the end of c4, 22.71
  assert.deepEqual(replayAt(p1, 22.71, false).line, [P(500, 660), P(580, 610)]);
  assert.equal(p1.summaryAt, 75.57); // e15 at the end of c14 (74.77) + 0.8
});

test('the transcript line being spoken is the last one started', () => {
  const cues = item.transcript.cues;
  assert.equal(cueAt(cues, 0.1), null);
  assert.equal(cueAt(cues, 0.3), 'c1');
  assert.equal(cueAt(cues, 29.0), 'c4'); // the gap after c4 keeps it
  assert.equal(cueAt(cues, 29.64), 'c5');
});

test('sweep every 10 ms of the recording: no point is on the line before an event at that point has been said', () => {
  const said = (p: { x: number; y: number }, t: number) =>
    item.events.some((e: { at: { x: number; y: number }; atSec: number }) => same(e.at, p) && e.atSec <= t);
  const same = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x === b.x && a.y === b.y;
  const early: string[] = [];
  for (let n = 0; n <= 8200; n++) {
    const t = n / 100;
    for (const p of at(t).line) if (!said(p, t)) early.push(`${JSON.stringify(p)} at ${t}`);
  }
  assert.deepEqual(early, []);
});
