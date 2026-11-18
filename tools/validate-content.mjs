#!/usr/bin/env node
// Dependency-free validator for Listening Map Labelling guided tour items (content format v1).
// Usage: node tools/validate-content.mjs <item.json> [more.json ...] [--assets <dir>] [--require-published]
// Exit codes: 0 all valid | 1 at least one item invalid | 2 usage or unreadable file
// NOTE: when the stack is chosen, port the structural checks to its schema library (e.g. zod) and keep
// the cross-field invariants below as tests. Protected file: see CODING_STANDARDS.md.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const TOL = 20; // map units: how close the destination event must be to its answer target
// Letter discs must not touch on the smallest supported phone (owner decision 2026-11-18, ticket 07). The player draws
// each disc 15 px in radius with a 1 px half-stroke (web/src/ItemMap.tsx) and fits the map plus 40 map units of margin
// on each side into 326 px at a 360 px wide screen; a 4 px gap keeps neighbouring letters readable as separate places.
const PHONE_MAP_PX = 326, MAP_MARGIN = 40, MIN_DISC_GAP_PX = 2 * (15 + 1) + 4;
export const minTargetDistance = (mapWidth) => (MIN_DISC_GAP_PX * (mapWidth + 2 * MAP_MARGIN)) / PHONE_MAP_PX;
// The five prototype micro-skills (spec: .scratch/listening-map-prototype/spec.md).
export const MICRO_SKILLS = Object.freeze(['spatial-language', 'following-sequence', 'landmark-vs-answer', 'corrections-distractors', 'orientation']);
const PURPOSES = new Set(['standard', 'first-challenge', 'skill-challenge', 'pilot-transfer']);
const ARABIC = /[\u0600-\u06FF]/;
// Licences of speech engines (code and model) that allow use in the app, commercial use included (D24).
// Non-commercial licences (for example CC-BY-NC) are left out on purpose.
export const APP_LICENCES = new Set(['Apache-2.0', 'MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'CC0-1.0', 'CC-BY-4.0']);

export function validateItem(item, { assetsDir = null, requirePublished = false } = {}) {
  const errors = [];
  const err = (code, msg) => errors.push({ code, msg });
  const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
  const isStr = (s) => typeof s === 'string' && s.trim() !== '';
  const o = (v) => v && typeof v === 'object' && !Array.isArray(v);

  if (!o(item)) return [{ code: 'shape', msg: 'item must be an object' }];

  // --- structure ---------------------------------------------------------------------------
  if (!isStr(item.id)) err('id', 'id is required');
  if (item.type !== 'listening.map-labelling') err('type', `type must be "listening.map-labelling", got ${JSON.stringify(item.type)}`);
  if (!Number.isInteger(item.version) || item.version < 1) err('version', 'version must be an integer >= 1');
  const skillSet = new Set(MICRO_SKILLS);
  if (!Array.isArray(item.skills) || item.skills.length === 0 || !item.skills.every((k) => skillSet.has(k))) err('skills', `skills must be a non-empty array of micro-skills from: ${MICRO_SKILLS.join(', ')}`);
  const itemSkills = new Set(Array.isArray(item.skills) ? item.skills : []);
  if (![1, 2, 3].includes(item.tier)) err('tier', `tier must be 1, 2 or 3, got ${JSON.stringify(item.tier)}`);
  if (!PURPOSES.has(item.purpose)) err('purpose', `purpose must be one of ${[...PURPOSES].join('|')}, got ${JSON.stringify(item.purpose)}`);
  if (item.purpose === 'skill-challenge') { if (!itemSkills.has(item.focusSkill)) err('purpose', 'a skill-challenge needs focusSkill, one of the item\'s skills'); }
  else if (item.focusSkill !== undefined) err('purpose', 'focusSkill is only allowed on a skill-challenge');
  if (item.purpose === 'first-challenge' && (item.tier !== 2 || !Array.isArray(item.questions) || item.questions.length !== 3)) err('purpose', 'the first challenge must be tier 2 with exactly 3 questions');
  if (item.purpose === 'pilot-transfer' && item.tier !== 2) err('purpose', 'a pilot transfer item must be tier 2');
  if (!o(item.difficulty)) err('difficulty', 'difficulty object is required (dimensions, not a single number)');
  if (!o(item.supportPolicy) || !o(item.supportPolicy.learning) || !o(item.supportPolicy.exam)) err('supportPolicy', 'supportPolicy.learning and supportPolicy.exam are required');
  if (o(item.supportPolicy) && o(item.supportPolicy.exam) && item.supportPolicy.exam.replay === true) err('exam-replay', 'exam mode must not allow replay (independent-readiness checks are one-listen)');
  if (!o(item.audio) || !isStr(item.audio.file) || !isNum(item.audio.durationSec) || item.audio.durationSec <= 0) err('audio', 'audio.file and positive audio.durationSec are required');
  if (o(item.audio) && !['synthetic', 'human'].includes(item.audio.source)) err('audio-source', 'audio.source must be "synthetic" or "human"');
  const map = item.map;
  if (!o(map) || !isNum(map.width) || !isNum(map.height) || !Array.isArray(map.landmarks) || !Array.isArray(map.targets)) {
    err('map', 'map.width, map.height, map.landmarks[], map.targets[] are required');
    return errors; // cannot check cross-field rules without a map
  }
  if (!o(item.transcript) || !Array.isArray(item.transcript.cues) || item.transcript.cues.length === 0) { err('transcript', 'transcript.cues[] is required'); return errors; }
  if (!Array.isArray(item.events) || item.events.length === 0) { err('events', 'events[] (authored route) is required'); return errors; }
  if (!Array.isArray(item.questions) || item.questions.length === 0) { err('questions', 'questions[] is required'); return errors; }

  const inBounds = (p) => o(p) && isNum(p.x) && isNum(p.y) && p.x >= 0 && p.y >= 0 && p.x <= map.width && p.y <= map.height;
  const dup = (arr, key, what) => { const seen = new Set(); for (const e of arr) { if (seen.has(e?.[key])) err('duplicate', `duplicate ${what} ${JSON.stringify(e?.[key])}`); seen.add(e?.[key]); } };

  // --- map ---------------------------------------------------------------------------------
  dup(map.landmarks, 'id', 'landmark id'); dup(map.targets, 'label', 'target label');
  for (const l of map.landmarks) if (!isStr(l.id) || !isStr(l.label) || !inBounds(l)) err('landmark', `landmark ${JSON.stringify(l?.id)} needs id, label and x/y inside the ${map.width}x${map.height} map`);
  for (const t of map.targets) if (!isStr(t.label) || !inBounds(t)) err('target', `target ${JSON.stringify(t?.label)} needs a label and x/y inside the map`);
  const minGap = minTargetDistance(map.width);
  const placed = map.targets.filter((t) => isStr(t?.label) && inBounds(t));
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    const [a, b] = [placed[i], placed[j]], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < minGap) err('target-spacing', `targets ${a.label} and ${b.label} are ${Math.round(d)} map units apart; at least ${Math.ceil(minGap)} keeps their letters apart on a 360 px phone`);
  }
  const landmarks = new Map(map.landmarks.map((l) => [l.id, l]));
  const targets = new Map(map.targets.map((t) => [t.label, t]));

  // --- transcript cues: ordered, inside the audio ----------------------------------------------
  const cues = item.transcript.cues; dup(cues, 'id', 'cue id');
  let prevStart = -Infinity;
  for (const c of cues) {
    if (!isStr(c.id) || !isStr(c.text) || !isNum(c.start) || !isNum(c.end)) { err('cue', `cue ${JSON.stringify(c?.id)} needs id, text, start, end`); continue; }
    if (c.start < 0 || c.end <= c.start) err('cue-time', `cue ${c.id}: need 0 <= start < end (got ${c.start}..${c.end})`);
    if (isNum(item.audio.durationSec) && c.end > item.audio.durationSec + 0.001) err('cue-beyond-audio', `cue ${c.id} ends at ${c.end}s but audio is ${item.audio.durationSec}s`);
    if (c.start < prevStart) err('cue-order', `cue ${c.id} starts before the previous cue (cues must be sorted by start)`);
    prevStart = c.start;
  }
  const cueById = new Map(cues.map((c) => [c.id, c]));

  // --- events: the authored, verified route ----------------------------------------------------
  const KINDS = new Set(['move', 'landmark', 'turn', 'distractor', 'correction', 'destination']);
  dup(item.events, 'id', 'event id');
  let prevCueStart = -Infinity;
  for (const e of item.events) {
    if (!isStr(e.id) || !KINDS.has(e.kind)) { err('event', `event ${JSON.stringify(e?.id)} needs an id and kind in ${[...KINDS].join('|')}`); continue; }
    const cue = cueById.get(e.cueId);
    if (!cue) err('event-cue', `event ${e.id} references unknown cue ${JSON.stringify(e.cueId)}`);
    else { if (cue.start < prevCueStart) err('event-order', `event ${e.id} is out of audio order (its cue starts before the previous event's cue)`); prevCueStart = cue.start; }
    if (!inBounds(e.at)) err('event-bounds', `event ${e.id}: "at" must be a point inside the map`);
    if (e.landmarkId !== undefined && !landmarks.has(e.landmarkId)) err('event-landmark', `event ${e.id} references unknown landmark ${JSON.stringify(e.landmarkId)}`);
    if ((e.kind === 'landmark' || e.kind === 'distractor') && e.landmarkId === undefined) err('event-landmark', `event ${e.id} (${e.kind}) must name a landmarkId`);
    if (e.kind === 'distractor' && !isStr(e.note)) err('distractor-note', `distractor event ${e.id} needs a note explaining why it is misleading (used by Answer Replay)`);
    if (e.kind === 'correction' && !isStr(e.note)) err('correction-note', `correction event ${e.id} needs a note explaining what the speaker corrected (used by Answer Replay)`);
  }
  const events = new Map(item.events.map((e) => [e.id, e]));
  const routeIndex = new Map(item.events.map((e, i) => [e?.id, i]));

  // --- questions <-> destination events <-> answer targets -------------------------------------
  dup(item.questions, 'id', 'question id');
  const usedLabels = new Set();
  const destinationRefs = new Map();
  let prevDestIndex = -1;
  for (const q of item.questions) {
    if (!isStr(q.id) || !isStr(q.prompt)) { err('question', `question ${JSON.stringify(q?.id)} needs id and prompt`); continue; }
    if (!targets.has(q.answerLabel)) { err('answer-label', `question ${q.id}: answerLabel ${JSON.stringify(q.answerLabel)} is not a map target`); continue; }
    if (usedLabels.has(q.answerLabel)) err('answer-collision', `question ${q.id}: answerLabel ${q.answerLabel} is already the answer to another question`);
    usedLabels.add(q.answerLabel);
    const ev = events.get(q.eventId);
    if (!ev) { err('question-event', `question ${q.id}: eventId ${JSON.stringify(q.eventId)} does not exist`); continue; }
    if (ev.kind !== 'destination') err('question-event', `question ${q.id}: its event ${ev.id} must be kind "destination" (is "${ev.kind}")`);
    destinationRefs.set(ev.id, (destinationRefs.get(ev.id) || 0) + 1);
    // guided tour: questions follow the route, so their destinations appear in route order
    const destIndex = routeIndex.get(ev.id);
    if (destIndex < prevDestIndex) err('question-order', `question ${q.id}: its destination comes earlier on the route than the previous question's`);
    prevDestIndex = Math.max(prevDestIndex, destIndex);
    if (!itemSkills.has(q.microSkill)) err('question-skill', `question ${q.id}: microSkill ${JSON.stringify(q.microSkill)} must be one of the item's skills`);
    if (!o(q.explanation) || !isStr(q.explanation.en) || !isStr(q.explanation.ar)) err('explanation', `question ${q.id}: explanation.en and explanation.ar are required`);
    else if (!ARABIC.test(q.explanation.ar)) err('explanation', `question ${q.id}: explanation.ar must be written in Arabic`);
    const hints = Array.isArray(q.hints) ? q.hints : [];
    const h1 = hints[0], h2 = hints[1];
    if (hints.length !== 2 || !o(h1) || h1.level !== 1 || !isStr(h1.landmarkId) || !o(h2) || h2.level !== 2 || !isStr(h2.cueId)) {
      err('hint', `question ${q.id}: hints must be [{level: 1, landmarkId}, {level: 2, cueId}] in that order`);
    } else {
      // level 1 names a real landmark the route passes before this answer place (never a distractor)
      const passed = item.events.slice(0, destIndex).some((e) => (e.kind === 'landmark' || e.kind === 'turn') && e.landmarkId === h1.landmarkId);
      if (!passed) err('hint-landmark', `question ${q.id}: level 1 hint landmark ${JSON.stringify(h1.landmarkId)} is not a landmark on the route before the answer place`);
      const hintCue = cueById.get(h2.cueId), destCue = cueById.get(ev.cueId);
      if (!hintCue) err('hint-cue', `question ${q.id}: level 2 hint cue ${JSON.stringify(h2.cueId)} does not exist`);
      else if (destCue && hintCue.start > destCue.start) err('hint-cue', `question ${q.id}: level 2 hint cue ${h2.cueId} comes after the answer place is spoken`);
    }
    const t = targets.get(q.answerLabel);
    if (inBounds(ev.at) && Math.hypot(ev.at.x - t.x, ev.at.y - t.y) > TOL) err('answer-mismatch', `question ${q.id}: route ends at (${ev.at.x},${ev.at.y}) but target ${q.answerLabel} is at (${t.x},${t.y}); Answer Replay would teach the wrong place`);
  }
  for (const [id, n] of destinationRefs) if (n > 1) err('destination-shared', `event ${id} is the destination of ${n} questions`);
  for (const e of item.events) if (e.kind === 'destination' && !destinationRefs.has(e.id)) err('orphan-destination', `destination event ${e.id} is not used by any question`);
  // a distractor must not sit on a real answer target (that would make the "wrong" place a right one)
  for (const e of item.events) if (e.kind === 'distractor' && inBounds(e.at)) for (const t of map.targets) if (usedLabels.has(t.label) && Math.hypot(e.at.x - t.x, e.at.y - t.y) <= TOL) err('distractor-on-answer', `distractor ${e.id} lies on answer target ${t.label}`);

  // --- editorial status --------------------------------------------------------------------------
  const v = item.validation;
  if (!o(v) || !['draft', 'reviewed', 'published'].includes(v.status)) err('validation', 'validation.status must be draft|reviewed|published');
  else if (v.status !== 'draft' && (!isStr(v.reviewer) || !isStr(v.reviewedOn))) err('validation', `status "${v.status}" requires validation.reviewer and validation.reviewedOn`);
  if (requirePublished && o(v) && v.status !== 'published') err('not-published', `item is "${v?.status}", not "published"`);
  // Owner decision D24 (2026-11-18): a published item uses a human recording, or synthetic audio whose record
  // (audio.synthetic) shows the engine's licence allows use in the app, the owner listened to it, and the timing
  // checks passed. The listening and the timing check are human steps; this only checks they were recorded.
  if (o(v) && v.status === 'published' && item.audio?.source !== 'human') {
    const s = item.audio?.synthetic;
    if (item.audio?.source !== 'synthetic' || !o(s)) err('audio-source', 'a published item needs a human recording, or synthetic audio with an audio.synthetic record (D24)');
    else {
      if (!isStr(s.engine)) err('audio-source', 'audio.synthetic.engine is required (D24)');
      if (!APP_LICENCES.has(s.licence)) err('audio-source', `audio.synthetic.licence must be one that allows use in the app: ${[...APP_LICENCES].join(', ')} (D24)`);
      if (!isStr(s.listenedBy) || !isStr(s.listenedOn)) err('audio-source', 'audio.synthetic.listenedBy and listenedOn are required: the owner listens before publishing (D24)');
      if (s.timingCheck !== 'pass') err('audio-source', 'audio.synthetic.timingCheck must be "pass" (D24)');
    }
  }

  // --- text is plain text (CODING_STANDARDS 2.5; owner decision 2026-11-12) -------------------------
  // Defence in depth only: rendering must still escape. Rejects HTML-like tags, javascript: URLs,
  // C0 control characters (except tab/newline) and bidi overrides (U+202D/U+202E) that visually reverse text.
  // Allowed: a bare "<" before a space or digit ("5 < 6"), and LRM/RLM marks used in Arabic text.
  const MARKUP = [
    [/<[a-zA-Z!\/?]/, 'HTML-like tag'],
    [/javascript\s*:/i, 'javascript: URL'],
    [/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/, 'control character'],
    [/[\u202D\u202E]/, 'bidi override character'],
  ];
  const walk = (v, at) => {
    if (typeof v === 'string') { for (const [re, what] of MARKUP) if (re.test(v)) err('markup', `${at}: ${what} not allowed in content text`); }
    else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${at}[${i}]`));
    else if (o(v)) for (const [k, x] of Object.entries(v)) walk(x, at ? `${at}.${k}` : k);
  };
  walk(item, '');

  // --- asset files ---------------------------------------------------------------------------------
  if (assetsDir && isStr(item.audio?.file)) {
    const resolved = path.resolve(assetsDir, item.audio.file);
    if (!resolved.startsWith(path.resolve(assetsDir) + path.sep)) err('audio-path', `audio.file escapes the assets directory: ${item.audio.file}`);
    else if (!existsSync(resolved)) err('audio-missing', `audio file not found: ${resolved}`);
  }
  return errors;
}

// ---- CLI ---------------------------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2); const files = []; let assetsDir = null; let requirePublished = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--assets') assetsDir = args[++i]; else if (args[i] === '--require-published') requirePublished = true; else files.push(args[i]);
  }
  if (files.length === 0 || (args.includes('--assets') && !assetsDir)) { console.error('usage: validate-content.mjs <item.json>... [--assets <dir>] [--require-published]'); process.exit(2); }
  let bad = 0;
  for (const f of files) {
    let item; try { item = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { console.error(`${f}: cannot read/parse: ${e.message}`); process.exit(2); }
    const errors = validateItem(item, { assetsDir, requirePublished });
    if (errors.length === 0) console.log(`OK    ${f}`); else { bad++; console.log(`FAIL  ${f}`); for (const e of errors) console.log(`  - [${e.code}] ${e.msg}`); }
  }
  console.log(bad === 0 ? `\n${files.length} item(s) valid. This proves internal consistency only; it does NOT prove the item is unambiguous, natural, or at the right IELTS difficulty (human review required).` : `\n${bad} of ${files.length} item(s) invalid.`);
  process.exit(bad === 0 ? 0 : 1);
}
