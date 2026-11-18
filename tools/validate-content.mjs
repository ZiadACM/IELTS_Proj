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
  if (map.format !== undefined) validateMapV2(item, err);
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

// ---- content format v2 maps (docs/content/map-format-v2.md) ----------------------------------------------
// Rules approved by the owner on 2026-11-19 (map-v2-app ticket 03): v2-shape, v2-ref, v2-inside, v2-wrong-path.
// The other planned v2 rules in map-format-v2.md are not approved yet.
const AREA_KINDS = new Set(['building', 'room', 'water', 'grass', 'car-park', 'courtyard', 'field']);
const PATH_KINDS = new Set(['corridor', 'road', 'path', 'footpath', 'covered-walkway', 'river', 'railway']);
const ENTRANCE_KINDS = new Set(['main', 'door', 'gate']);
const SYMBOL_KINDS = new Set(['tree', 'noticeboard', 'information-board', 'bench', 'toilets', 'stairs', 'cafe', 'bridge', 'parking']);
const SIDES = new Set(['n', 'e', 's', 'w']);
const DOOR_TOL = 20; // map units: how close a wrong-path point must be to a door or entrance to count as at it

const segmentDistance = (p, [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  const k = len2 ? Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / len2)) : 0;
  return Math.hypot(p.x - (ax + k * dx), p.y - (ay + k * dy));
};
// Even-odd ray casting; a point on the edge of a rect counts as inside.
function insideArea(p, a) {
  if (Array.isArray(a.rect)) { const [x, y, w, h] = a.rect; return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; }
  let inside = false;
  for (let i = 0, j = a.polygon.length - 1; i < a.polygon.length; j = i++) {
    const [xi, yi] = a.polygon[i], [xj, yj] = a.polygon[j];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// Where a room's door is: the middle of its side, or `at` along it.
function doorPoint(a) {
  const [x, y, w, h] = a.rect, { side, at } = a.door;
  if (side === 'n' || side === 's') return { x: at ?? x + w / 2, y: side === 'n' ? y : y + h };
  return { x: side === 'w' ? x : x + w, y: at ?? y + h / 2 };
}

function validateMapV2(item, err) {
  const map = item.map;
  const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
  const isStr = (s) => typeof s === 'string' && s.trim() !== '';
  const o = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const inMap = (x, y) => isNum(x) && isNum(y) && x >= 0 && y >= 0 && x <= map.width && y <= map.height;
  const isPair = (p) => Array.isArray(p) && p.length === 2 && inMap(p[0], p[1]);
  const shape = (msg) => err('v2-shape', msg);
  if (map.format !== 2) { shape(`map.format must be 2, got ${JSON.stringify(map.format)}`); return; }
  const list = (key) => { if (map[key] === undefined) return []; if (Array.isArray(map[key])) return map[key]; shape(`map.${key} must be an array`); return []; };
  const areas = list('areas'), paths = list('paths'), entrances = list('entrances'), symbols = list('symbols');

  // --- v2-shape: kinds, shapes, everything inside the map, ids unique across areas, paths and entrances ---
  const ids = new Set();
  const uniqueId = (x, what) => {
    if (!isStr(x?.id)) shape(`${what} needs an id`);
    else if (ids.has(x.id)) shape(`id ${JSON.stringify(x.id)} is used twice (areas, paths and entrances share one set of ids)`);
    else ids.add(x.id);
  };
  const goodAreas = new Map();
  for (const a of areas) {
    uniqueId(a, 'an area');
    const at = `area ${JSON.stringify(a?.id)}`;
    if (!AREA_KINDS.has(a?.kind)) { shape(`${at}: kind must be one of ${[...AREA_KINDS].join('|')}`); continue; }
    const hasRect = a.rect !== undefined, hasPoly = a.polygon !== undefined;
    if (hasRect === hasPoly) { shape(`${at} needs exactly one of rect or polygon`); continue; }
    if (hasRect) {
      const r = a.rect;
      if (!Array.isArray(r) || r.length !== 4 || !r.every(isNum) || r[2] <= 0 || r[3] <= 0) { shape(`${at}: rect must be [x, y, width, height] with width and height above 0`); continue; }
      if (!inMap(r[0], r[1]) || !inMap(r[0] + r[2], r[1] + r[3])) { shape(`${at}: rect goes outside the ${map.width}x${map.height} map`); continue; }
    } else if (!Array.isArray(a.polygon) || a.polygon.length < 3 || !a.polygon.every(isPair)) { shape(`${at}: polygon must be 3 or more [x, y] points inside the map`); continue; }
    if (a.label !== undefined && !isStr(a.label)) shape(`${at}: label must be text`);
    if (a.door !== undefined) {
      if (!hasRect || !o(a.door) || !SIDES.has(a.door.side)) { shape(`${at}: door needs side n, e, s or w, on a rect area`); continue; }
      const along = a.door.side === 'n' || a.door.side === 's' ? [a.rect[0], a.rect[0] + a.rect[2]] : [a.rect[1], a.rect[1] + a.rect[3]];
      if (a.door.at !== undefined && (!isNum(a.door.at) || a.door.at < along[0] || a.door.at > along[1])) { shape(`${at}: door.at must lie along its side`); continue; }
    }
    goodAreas.set(a.id, a);
  }
  const goodPaths = [];
  for (const p of paths) {
    uniqueId(p, 'a path');
    const at = `path ${JSON.stringify(p?.id)}`;
    if (!PATH_KINDS.has(p?.kind)) { shape(`${at}: kind must be one of ${[...PATH_KINDS].join('|')}`); continue; }
    if (!Array.isArray(p.points) || p.points.length < 2 || !p.points.every(isPair)) { shape(`${at}: points must be 2 or more [x, y] points inside the map`); continue; }
    if (!isNum(p.width) || p.width <= 0) { shape(`${at}: width must be a number above 0`); continue; }
    goodPaths.push(p);
  }
  const goodEntrances = new Map();
  for (const e of entrances) {
    uniqueId(e, 'an entrance');
    const at = `entrance ${JSON.stringify(e?.id)}`;
    if (!ENTRANCE_KINDS.has(e?.kind)) { shape(`${at}: kind must be one of ${[...ENTRANCE_KINDS].join('|')}`); continue; }
    if (!inMap(e.x, e.y)) { shape(`${at}: x/y must be inside the map`); continue; }
    if (e.side !== undefined && !SIDES.has(e.side)) { shape(`${at}: side must be n, e, s or w`); continue; }
    goodEntrances.set(e.id, e);
  }
  if (entrances.filter((e) => e?.youAreHere === true).length > 1) shape('at most one entrance may have youAreHere');
  for (const s of symbols) {
    if (!SYMBOL_KINDS.has(s?.kind)) shape(`symbol kind must be one of ${[...SYMBOL_KINDS].join('|')}, got ${JSON.stringify(s?.kind)}`);
    else if (!inMap(s.x, s.y)) shape(`symbol ${s.kind}: x/y must be inside the map`);
  }
  if (map.compass !== undefined) {
    if (!o(map.compass) || !inMap(map.compass.x, map.compass.y)) shape('compass needs x/y inside the map');
    if (map.compass?.north !== 0) shape('compass.north must be 0 (other directions are not allowed yet)');
  }
  if (map.title !== undefined && !isStr(map.title)) shape('map.title must be text');

  // --- v2-ref and v2-inside: what landmarks and targets link to, and that they sit inside their area ---
  const symbolKinds = new Set(symbols.map((s) => s?.kind));
  const pathIds = new Set(paths.map((p) => p?.id));
  const linkArea = (what, id, p) => {
    const a = goodAreas.get(id);
    if (!a) { if (!areas.some((x) => x?.id === id)) err('v2-ref', `${what} links to area ${JSON.stringify(id)}, which does not exist`); return; }
    if (isNum(p?.x) && isNum(p?.y) && !insideArea(p, a)) err('v2-inside', `${what} at (${p.x},${p.y}) is not inside its area ${JSON.stringify(id)}`);
  };
  for (const l of map.landmarks) {
    const what = `landmark ${JSON.stringify(l?.id)}`;
    const links = ['area', 'symbol', 'entrance', 'path'].filter((k) => l?.[k] !== undefined);
    if (links.length > 1) { err('v2-ref', `${what} has ${links.join(' and ')}; a landmark has one link`); continue; }
    if (l?.area !== undefined) linkArea(what, l.area, l);
    if (l?.symbol !== undefined && !symbolKinds.has(l.symbol)) err('v2-ref', `${what} links to symbol ${JSON.stringify(l.symbol)}, which is not drawn on the map`);
    if (l?.entrance !== undefined && !entrances.some((e) => e?.id === l.entrance)) err('v2-ref', `${what} links to entrance ${JSON.stringify(l.entrance)}, which does not exist`);
    if (l?.path !== undefined && !pathIds.has(l.path)) err('v2-ref', `${what} links to path ${JSON.stringify(l.path)}, which does not exist`);
  }
  for (const t of map.targets) if (t?.area !== undefined) linkArea(`target ${JSON.stringify(t?.label)}`, t.area, t);

  // --- v2-wrong-path (D25): a correction's short wrong path, along corridors or at doors, ending at `at` ---
  const doors = [...[...goodAreas.values()].filter((a) => a.door && Array.isArray(a.rect)).map(doorPoint), ...goodEntrances.values()];
  const onTheWay = (p) =>
    goodPaths.some((path) => path.points.slice(1).some((b, i) => segmentDistance(p, path.points[i], b) <= path.width / 2)) ||
    doors.some((d) => Math.hypot(p.x - d.x, p.y - d.y) <= DOOR_TOL);
  for (const e of item.events) {
    if (e?.kind !== 'correction') continue;
    const wp = e.wrongPath, what = `correction ${e.id}`;
    if (!Array.isArray(wp) || wp.length < 1 || wp.length > 3) { err('v2-wrong-path', `${what}: wrongPath must be 1 to 3 points (D25)`); continue; }
    if (!wp.every((p) => o(p) && inMap(p.x, p.y))) { err('v2-wrong-path', `${what}: every wrongPath point needs x/y inside the map`); continue; }
    for (const p of wp) if (!onTheWay(p)) err('v2-wrong-path', `${what}: wrongPath point (${p.x},${p.y}) is not on a path or corridor or at a door`);
    const last = wp[wp.length - 1];
    if (!o(e.at) || e.at.x !== last.x || e.at.y !== last.y) err('v2-wrong-path', `${what}: "at" must equal the last wrongPath point`);
  }
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
