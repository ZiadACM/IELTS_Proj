// Run: node --test tools/*.test.mjs
// Each case breaks ONE rule in the valid fixture and expects that rule's code to be among the reported errors.
// Protected file: do not weaken these tests to make a change pass (see CODING_STANDARDS.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateItem } from './validate-content.mjs';

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
test('published with reviewer passes', () => { const i = base(); i.validation = { status: 'published', reviewer: 'A. Reviewer', reviewedOn: '2026-11-12' }; assert.deepEqual(codes(i, { requirePublished: true }), []); });
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
