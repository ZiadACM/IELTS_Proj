// Run: node --test tools/*.test.mjs
// Property-based tests for the content validator (ticket 01, content format v1).
// No PBT library is installed (adding one is an owner decision), so this file uses a small seeded generator.
// Every generated item is a valid guided tour item by construction; each property then breaks ONE rule
// and expects the validator to report it. A failure message names the seed so the case can be replayed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateItem, MICRO_SKILLS } from './validate-content.mjs';

const RUNS = 300;
const codes = (item) => validateItem(item).map((e) => e.code);

// mulberry32: small deterministic PRNG
function rng(seed) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = (arr) => arr[int(0, arr.length - 1)];
  const shuffle = (arr) => { const c = [...arr]; for (let i = c.length - 1; i > 0; i--) { const j = int(0, i); [c[i], c[j]] = [c[j], c[i]]; } return c; };
  return { next, int, pick, shuffle };
}

// Targets sit on one row and landmarks on another, 90 map units apart, so no landmark or distractor
// can fall within the validator's 20-unit answer tolerance by accident.
function genItem(seed) {
  const r = rng(seed);
  const nQuestions = r.int(1, 6);
  const nTargets = r.int(nQuestions, 9);
  const nLandmarks = r.int(2, 9);
  const labels = 'ABCDEFGHI'.split('').slice(0, nTargets);
  const targets = labels.map((label, i) => ({ label, x: 100 + i * 90, y: 100 }));
  const landmarks = Array.from({ length: nLandmarks }, (_, j) => ({ id: `lm${j}`, label: `Place ${j}`, x: 100 + j * 90, y: 500 }));
  const answers = r.shuffle(labels).slice(0, nQuestions);
  const skills = r.shuffle(MICRO_SKILLS).slice(0, r.int(1, MICRO_SKILLS.length));

  const cues = []; const events = []; let t = 0;
  const addEvent = (kind, extra) => {
    const id = `c${cues.length + 1}`; const len = r.int(1, 6);
    cues.push({ id, start: t, end: t + len, text: `Cue ${cues.length + 1}.` }); t += len;
    events.push({ id: `e${events.length + 1}`, cueId: id, kind, ...extra });
    return events[events.length - 1];
  };
  const questions = [];
  for (let q = 0; q < nQuestions; q++) {
    const steps = r.int(q === 0 ? 1 : 0, 3); // at least one landmark before the first answer place
    for (let s = 0; s < steps; s++) {
      const lm = r.pick(landmarks);
      const kind = r.pick(['landmark', 'landmark', 'turn', 'distractor', 'correction']);
      const extra = { landmarkId: lm.id, at: { x: lm.x, y: lm.y } };
      if (kind === 'distractor' || kind === 'correction') extra.note = 'Authored note.';
      addEvent(kind, extra);
    }
    if (q === 0 && !events.some((e) => e.kind === 'landmark' || e.kind === 'turn')) {
      const lm = r.pick(landmarks); addEvent('landmark', { landmarkId: lm.id, at: { x: lm.x, y: lm.y } });
    }
    const target = targets.find((x) => x.label === answers[q]);
    const dest = addEvent('destination', { at: { x: target.x, y: target.y } });
    const passed = events.filter((e) => e.kind === 'landmark' || e.kind === 'turn').map((e) => e.landmarkId);
    const earlierCues = cues.filter((c) => c.start <= cues.find((x) => x.id === dest.cueId).start);
    questions.push({
      id: `q${q + 1}`, prompt: `Place for question ${q + 1}`, answerLabel: answers[q], eventId: dest.id,
      microSkill: r.pick(skills),
      hints: [{ level: 1, landmarkId: r.pick(passed) }, { level: 2, cueId: r.pick(earlierCues).id }],
      explanation: { en: 'Authored explanation.', ar: 'شرح مكتوب.' },
    });
  }
  return {
    id: `gen-${seed}`, type: 'listening.map-labelling', version: 1,
    skills, tier: r.int(1, 3), purpose: 'standard',
    difficulty: { landmarks: nLandmarks, routeSteps: events.length },
    supportPolicy: { learning: { replay: true, hints: true }, exam: { replay: false, hints: false } },
    audio: { file: `audio/gen-${seed}.mp3`, durationSec: t + r.int(0, 10), source: 'synthetic' },
    map: { width: 1000, height: 700, landmarks, targets },
    transcript: { cues }, events, questions,
    validation: { status: 'draft' },
  };
}

// Runs a property over RUNS seeds. `mutate` returns false when the generated item cannot express the
// break (e.g. only one question); the test then requires that most seeds did exercise it (no vacuity).
function property(name, code, mutate) {
  test(`property: ${name}`, () => {
    let exercised = 0;
    for (let seed = 1; seed <= RUNS; seed++) {
      const item = genItem(seed);
      if (code === null) { assert.deepEqual(codes(item), [], `seed ${seed}: generated item should be valid`); exercised++; continue; }
      const r = rng(seed * 7919);
      if (mutate(item, r) === false) continue;
      exercised++;
      assert.ok(codes(item).includes(code), `seed ${seed}: expected ${code}, got ${codes(item).join(',') || 'nothing'}`);
    }
    assert.ok(exercised >= RUNS / 4, `only ${exercised} of ${RUNS} seeds exercised this property`);
  });
}

property('every generated guided tour item is valid (no false positives)', null);

property('cue times must not go backwards', 'cue-order', (item, r) => {
  const cs = item.transcript.cues; if (cs.length < 2) return false;
  const i = r.int(0, cs.length - 2); [cs[i], cs[i + 1]] = [cs[i + 1], cs[i]];
});

property('each answer place lies at the end of its route segment', 'answer-mismatch', (item, r) => {
  const q = r.pick(item.questions);
  const used = new Set(item.questions.map((x) => x.answerLabel));
  const free = item.map.targets.filter((t) => !used.has(t.label));
  if (free.length === 0) return false;
  q.answerLabel = r.pick(free).label;
});

property('questions follow the route order', 'question-order', (item, r) => {
  const qs = item.questions; if (qs.length < 2) return false;
  const i = r.int(0, qs.length - 2); [qs[i], qs[i + 1]] = [qs[i + 1], qs[i]];
});

property('level 1 hint names a landmark passed before the answer place', 'hint-landmark', (item, r) => {
  const q = r.pick(item.questions);
  const destIndex = item.events.findIndex((e) => e.id === q.eventId);
  const passed = new Set(item.events.slice(0, destIndex).filter((e) => e.kind === 'landmark' || e.kind === 'turn').map((e) => e.landmarkId));
  const notPassed = item.map.landmarks.filter((l) => !passed.has(l.id));
  if (notPassed.length === 0) return false;
  q.hints[0].landmarkId = r.pick(notPassed).id;
});

property('level 2 hint cue is not after the answer place is spoken', 'hint-cue', (item, r) => {
  const q = r.pick(item.questions);
  const dest = item.events.find((e) => e.id === q.eventId);
  const destStart = item.transcript.cues.find((c) => c.id === dest.cueId).start;
  const later = item.transcript.cues.filter((c) => c.start > destStart);
  if (later.length === 0) return false;
  q.hints[1].cueId = r.pick(later).id;
});

property('every question trains one of the item skills', 'question-skill', (item, r) => {
  const outside = MICRO_SKILLS.filter((k) => !item.skills.includes(k));
  if (outside.length === 0) return false;
  r.pick(item.questions).microSkill = r.pick(outside);
});
