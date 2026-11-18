// Run: node --test tools/*.test.mjs
// Each case breaks ONE rule in the valid fixture and expects that rule's code to be among the reported errors.
// Protected file: do not weaken these tests to make a change pass (see CODING_STANDARDS.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { minTargetDistance, validateItem } from './validate-content.mjs';

const base = () => JSON.parse(readFileSync(new URL('./fixtures/map-001.valid.json', import.meta.url), 'utf8'));
const codes = (item, opts) => validateItem(item, opts).map((e) => e.code);

test('valid fixture passes with no errors', () => assert.deepEqual(codes(base()), []));

const cases = [
  ['exam-replay', (i) => { i.supportPolicy.exam.replay = true; }],
  ['cue-beyond-audio', (i) => { i.audio.durationSec = 30; }],
  ['cue-order', (i) => { [i.transcript.cues[1], i.transcript.cues[2]] = [i.transcript.cues[2], i.transcript.cues[1]]; }],
  ['cue-time', (i) => { i.transcript.cues[0].end = 0; }],
  ['event-cue', (i) => { i.events[1].cueId = 'nope'; }],
  ['event-order', (i) => { i.events[2].cueId = 'c1'; }],
  ['event-bounds', (i) => { i.events[0].at = { x: 5000, y: 5 }; }],
  ['event-landmark', (i) => { i.events[1].landmarkId = 'ghost'; }],
  ['distractor-note', (i) => { delete i.events[3].note; }],
  ['answer-mismatch', (i) => { i.questions[0].answerLabel = 'A'; }],
  ['answer-collision', (i) => { i.questions[1].answerLabel = 'C'; }],
  ['answer-label', (i) => { i.questions[0].answerLabel = 'Z'; }],
  ['question-event', (i) => { i.questions[0].eventId = 'e3'; }],
  ['orphan-destination', (i) => { i.questions.pop(); }],
  ['distractor-on-answer', (i) => { i.events[3].at = { x: 800, y: 250 }; }],
  ['validation', (i) => { i.validation = { status: 'published' }; }],
  ['audio', (i) => { delete i.audio.durationSec; }],
  ['duplicate', (i) => { i.map.landmarks[1].id = 'entrance'; }],
  // content format v1 (ticket 01)
  ['tier', (i) => { delete i.tier; }],
  ['tier', (i) => { i.tier = 4; }],
  ['skills', (i) => { i.skills = ['directions.basic']; }],
  ['question-skill', (i) => { i.questions[0].microSkill = 'orientation'; }],
  ['question-skill', (i) => { delete i.questions[1].microSkill; }],
  ['hint', (i) => { i.questions[0].hints.pop(); }],
  ['hint', (i) => { i.questions[0].hints.reverse(); }],
  ['hint-landmark', (i) => { i.questions[0].hints[0].landmarkId = 'old-library'; }],
  ['hint-landmark', (i) => { i.questions[0].hints[0].landmarkId = 'fountain'; }],
  ['hint-cue', (i) => { i.questions[0].hints[1].cueId = 'nope'; }],
  ['hint-cue', (i) => { i.questions[0].hints[1].cueId = 'c7'; }],
  ['explanation', (i) => { delete i.questions[0].explanation.en; }],
  ['explanation', (i) => { delete i.questions[0].explanation.ar; }],
  ['explanation', (i) => { i.questions[0].explanation.ar = 'Not Arabic at all'; }],
  ['correction-note', (i) => { i.events[3].kind = 'correction'; delete i.events[3].note; }],
  ['question-order', (i) => { [i.questions[0], i.questions[1]] = [i.questions[1], i.questions[0]]; }],
  ['purpose', (i) => { delete i.purpose; }],
  ['purpose', (i) => { i.purpose = 'skill-challenge'; }],
  ['purpose', (i) => { i.focusSkill = 'orientation'; }],
  ['purpose', (i) => { i.purpose = 'first-challenge'; }],
  ['purpose', (i) => { i.purpose = 'pilot-transfer'; }],
  ['audio-source', (i) => { delete i.audio.source; }],
  // letter discs too close to read apart on a 360 px phone (owner decision 2026-11-18, ticket 07)
  ['target-spacing', (i) => { i.map.targets[1].x = i.map.targets[0].x; i.map.targets[1].y = i.map.targets[0].y + 50; }],
  ['audio-source', (i) => { i.validation = { status: 'published', reviewer: 'A. Reviewer', reviewedOn: '2026-11-15' }; }],
];
for (const [code, mutate] of cases) {
  test(`detects: ${code}`, () => { const i = base(); mutate(i); assert.ok(codes(i).includes(code), `expected ${code}, got ${codes(i).join(',') || 'nothing'}`); });
}

test('missing audio file is reported when --assets is given', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'assets-'));
  assert.ok(codes(base(), { assetsDir: dir }).includes('audio-missing'));
});
test('audio.file may not escape the assets directory', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'assets-'));
  const i = base(); i.audio.file = '../../etc/passwd';
  assert.ok(codes(i, { assetsDir: dir }).includes('audio-path'));
});
test('--require-published rejects drafts', () => assert.ok(codes(base(), { requirePublished: true }).includes('not-published')));
test('published with reviewer and human audio passes', () => { const i = base(); i.audio.source = 'human'; i.validation = { status: 'published', reviewer: 'A. Reviewer', reviewedOn: '2026-11-12' }; assert.deepEqual(codes(i, { requirePublished: true }), []); });

// Owner decision D24 (2026-11-18): a published item may use synthetic audio when the engine's licence allows use in
// the app, the owner has listened to it, and it passed the timing checks; audio.synthetic records all three.
const publishedSynthetic = () => {
  const i = base();
  i.validation = { status: 'published', reviewer: 'A. Reviewer', reviewedOn: '2026-11-18' };
  i.audio.synthetic = { engine: 'Kokoro-82M', voice: 'bf_isabella', speed: 0.75, licence: 'Apache-2.0', listenedBy: 'owner', listenedOn: '2026-11-18', timingCheck: 'pass' };
  return i;
};
test('D24: published synthetic audio with licence, listening and timing record passes', () => assert.deepEqual(codes(publishedSynthetic(), { requirePublished: true }), []));
for (const [name, mutate] of [
  ['no synthetic record', (i) => { delete i.audio.synthetic; }],
  ['no engine', (i) => { delete i.audio.synthetic.engine; }],
  ['a non-commercial licence', (i) => { i.audio.synthetic.licence = 'CC-BY-NC-4.0'; }],
  ['no licence', (i) => { delete i.audio.synthetic.licence; }],
  ['not listened to', (i) => { delete i.audio.synthetic.listenedBy; }],
  ['no listening date', (i) => { i.audio.synthetic.listenedOn = ' '; }],
  ['a failed timing check', (i) => { i.audio.synthetic.timingCheck = 'fail'; }],
  ['no timing check', (i) => { delete i.audio.synthetic.timingCheck; }],
]) test(`D24: published synthetic audio is refused with ${name}`, () => { const i = publishedSynthetic(); mutate(i); assert.ok(codes(i).includes('audio-source'), `expected audio-source, got ${codes(i).join(',') || 'nothing'}`); });
test('D24: a draft with synthetic audio needs no record', () => { const i = base(); delete i.audio.synthetic; assert.deepEqual(codes(i), []); });
test('non-object input does not throw', () => { assert.ok(codes(null).length > 0); assert.ok(codes([]).length > 0); });

// Plain-text rule (owner decision 2026-11-12): markup in any text field is rejected.
const markupCases = [
  ['script tag in transcript cue', (i) => { i.transcript.cues[1].text = 'Walk ahead <script>alert(1)</script>'; }],
  ['img onerror in landmark label', (i) => { i.map.landmarks[1].label = '<img src=x onerror=alert(1)>'; }],
  ['closing tag in question prompt', (i) => { i.questions[0].prompt = 'Reading room</b>'; }],
  ['javascript: URL in distractor note', (i) => { i.events[3].note = 'see JavaScript :alert(1)'; }],
  ['bidi override in prompt', (i) => { i.questions[1].prompt = 'Sports \u202Ehall'; }],
  ['control character in cue', (i) => { i.transcript.cues[0].text = 'You are\u0000 here.'; }],
  ['markup in a field the schema does not know yet', (i) => { i.explanation = { ar: '<iframe src=x>' }; }],
];
for (const [name, mutate] of markupCases) {
  test(`detects markup: ${name}`, () => { const i = base(); mutate(i); assert.ok(codes(i).includes('markup'), `expected markup, got ${codes(i).join(',') || 'nothing'}`); });
}
test('plain text with a bare "<", ampersand and Arabic RLM mark passes', () => {
  const i = base();
  i.transcript.cues[0].text = 'Rooms 5 < 6 & 7 are closed.';
  i.explanation = { ar: 'المكتبة\u200F القديمة' };
  assert.deepEqual(codes(i), []);
});

// content format v1: valid variants of the purpose flags (ticket 01)
test('a skill challenge naming one of its skills passes', () => { const i = base(); i.purpose = 'skill-challenge'; i.focusSkill = 'landmark-vs-answer'; assert.deepEqual(codes(i), []); });
test('a tier 2 first challenge with 3 questions passes', () => { const i = base(); i.tier = 2; i.purpose = 'first-challenge'; assert.deepEqual(codes(i), []); });
test('a tier 2 pilot transfer item passes', () => { const i = base(); i.tier = 2; i.purpose = 'pilot-transfer'; assert.deepEqual(codes(i), []); });
test('markup in an Arabic explanation is rejected', () => { const i = base(); i.questions[0].explanation.ar = 'شرح <b>عريض</b>'; assert.ok(codes(i).includes('markup')); });

// Letter spacing (ticket 07): the limit itself, not just a far-off case.
test('two letters exactly at the minimum distance pass; one unit closer fails', () => {
  const at = (gap) => { const i = base(); const [a, b] = i.map.targets; b.x = a.x; b.y = a.y + gap; return codes(i).includes('target-spacing'); };
  const min = Math.ceil(minTargetDistance(base().map.width));
  assert.equal(at(min), false); assert.equal(at(min - 1), true);
});

// Content format v2 maps (docs/content/map-format-v2.md; map-v2-app ticket 03, rules approved by the owner 2026-11-19:
// v2-shape, v2-ref, v2-inside, v2-wrong-path). The fixture is the reviewed v2 first challenge; each case breaks one rule.
const v2 = () => JSON.parse(readFileSync(new URL('./fixtures/map-002-v2.valid.json', import.meta.url), 'utf8'));
const area = (i, id) => i.map.areas.find((a) => a.id === id);
const correction = (i) => i.events.find((e) => e.kind === 'correction');
test('valid v2 fixture passes with no errors', () => assert.deepEqual(codes(v2()), []));
const v2Cases = [
  ['v2-shape', 'format other than 2', (i) => { i.map.format = 3; }],
  ['v2-shape', 'unknown area kind', (i) => { area(i, 'store').kind = 'lava'; }],
  ['v2-shape', 'rect with three numbers', (i) => { area(i, 'store').rect = [100, 165, 165]; }],
  ['v2-shape', 'rect with no width', (i) => { area(i, 'store').rect = [100, 165, 0, 105]; }],
  ['v2-shape', 'polygon with two points', (i) => { delete area(i, 'garden').rect; area(i, 'garden').polygon = [[0, 20], [100, 20]]; }],
  ['v2-shape', 'area with both rect and polygon', (i) => { area(i, 'garden').polygon = [[0, 20], [100, 20], [100, 660]]; }],
  ['v2-shape', 'area outside the map', (i) => { area(i, 'sports-hall').rect = [470, 20, 600, 380]; }],
  ['v2-shape', 'door on an unknown side', (i) => { area(i, 'store').door = { side: 'x' }; }],
  ['v2-shape', 'unknown path kind', (i) => { i.map.paths[0].kind = 'tunnel'; }],
  ['v2-shape', 'path point outside the map', (i) => { i.map.paths[0].points[0] = [500, 950]; }],
  ['v2-shape', 'path with one point', (i) => { i.map.paths[0].points = [[500, 820]]; }],
  ['v2-shape', 'path with no width', (i) => { delete i.map.paths[0].width; }],
  ['v2-shape', 'unknown entrance kind', (i) => { i.map.entrances[0].kind = 'window'; }],
  ['v2-shape', 'entrance outside the map', (i) => { i.map.entrances[0].y = 950; }],
  ['v2-shape', 'two "You are here" marks', (i) => { i.map.entrances.push({ id: 'side-door', kind: 'door', x: 980, y: 560, side: 'e', youAreHere: true }); }],
  ['v2-shape', 'unknown symbol kind', (i) => { i.map.symbols[1].kind = 'fountain'; }],
  ['v2-shape', 'symbol outside the map', (i) => { i.map.symbols[1].x = -5; }],
  ['v2-shape', 'compass turned', (i) => { i.map.compass.north = 90; }],
  ['v2-shape', 'compass outside the map', (i) => { i.map.compass.y = 950; }],
  ['v2-shape', 'id shared by an area and a path', (i) => { i.map.paths[0].id = 'store'; }],
  ['v2-shape', 'id shared by an area and an entrance', (i) => { i.map.entrances[0].id = 'store'; i.map.landmarks.find((l) => l.entrance).entrance = 'store'; }],
  ['v2-ref', 'landmark in a missing area', (i) => { i.map.landmarks.find((l) => l.area).area = 'attic'; }],
  ['v2-ref', 'landmark on a symbol not drawn', (i) => { i.map.landmarks.find((l) => l.symbol).symbol = 'bench'; }],
  ['v2-ref', 'landmark at a missing entrance', (i) => { i.map.landmarks.find((l) => l.entrance).entrance = 'back-door'; }],
  ['v2-ref', 'landmark on a missing path', (i) => { i.map.landmarks.find((l) => l.area).path = 'ghost-corridor'; delete i.map.landmarks.find((l) => l.path).area; }],
  ['v2-ref', 'landmark with two links', (i) => { i.map.landmarks.find((l) => l.symbol).area = 'room-a'; }],
  ['v2-ref', 'target in a missing area', (i) => { i.map.targets[0].area = 'attic'; }],
  ['v2-inside', 'landmark outside its area', (i) => { const l = i.map.landmarks.find((x) => x.id === 'reception'); l.x = 640; l.y = 650; }],
  ['v2-inside', 'target outside its area', (i) => { const t = i.map.targets.find((x) => x.label === 'A'); t.y = 560; }],
  ['v2-wrong-path', 'correction without a wrong path', (i) => { delete correction(i).wrongPath; }],
  ['v2-wrong-path', 'empty wrong path', (i) => { correction(i).wrongPath = []; }],
  ['v2-wrong-path', 'four points', (i) => { const c = correction(i); c.wrongPath = [{ x: 290, y: 150 }, { x: 290, y: 120 }, { x: 290, y: 92 }, { x: 265, y: 92 }]; }],
  ['v2-wrong-path', 'a point inside a room, off every corridor and door', (i) => { correction(i).wrongPath[0] = { x: 200, y: 92 }; }],
  ['v2-wrong-path', '"at" is not the last point', (i) => { correction(i).at = { x: 290, y: 92 }; }],
];
for (const [code, name, mutate] of v2Cases) {
  test(`v2 detects ${code}: ${name}`, () => { const i = v2(); mutate(i); assert.ok(codes(i).includes(code), `expected ${code}, got ${codes(i).join(',') || 'nothing'}`); });
}
test('v2: a point within half a corridor\'s width of its centre line and a point at a room door are on the way', () => {
  const i = v2(); correction(i).wrongPath = [{ x: 314, y: 120 }, { x: 265, y: 92 }]; correction(i).at = { x: 265, y: 92 };
  assert.deepEqual(codes(i), []);
});
test('v2: a polygon area holds the landmark inside it', () => {
  const i = v2(); const r = area(i, 'reception'); delete r.rect; delete r.door; r.polygon = [[530, 710], [750, 710], [750, 820], [530, 820]];
  assert.deepEqual(codes(i), []);
});
test('v2 rules do not apply to a v1 map: a v1 correction needs no wrong path', () => {
  const i = base(); i.events[3].kind = 'correction';
  assert.ok(!codes(i).some((c) => c.startsWith('v2-')));
});
