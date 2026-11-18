// Route checks for an anchored v2 item before voicing (ticket 03, D23). Not the validator: a throwaway helper.
// Checks: every `at` on a corridor line, a door point or a letter point; every leg starts with a move at a landmark
// linked to an entrance; one destination per leg, exactly on a letter; every `word` in its cue, in event order;
// every segment walkable (along a corridor, corridor to the door in front of it, door into its own room);
// hints (level 1 a landmark/turn on the same leg before the destination, not the entrance; level 2 at or before it).
// Usage: node .scratch/map-format-v2/scripts/check-route.mjs <item.json>
import { readFileSync } from 'node:fs';
const item = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const { map, events, questions } = item;
const cues = new Map(item.transcript.cues.map((c) => [c.id, c]));
const cueOrder = item.transcript.cues.map((c) => c.id);
const bad = [];
const TOL = 1;

// Corridor segments, door points (with their room) and letter points.
const segs = map.paths.filter((p) => p.kind === 'corridor').flatMap((p) => p.points.slice(1).map((q, i) => [p.points[i], q]));
// Visitors stand just outside an entrance: a corridor that ends at an entrance door runs on to the entrance landmark.
for (const l of map.landmarks.filter((x) => x.entrance)) {
  const d = map.entrances.find((x) => x.id === l.entrance);
  for (const sg of segs) for (const k of [0, 1]) if (sg[k][0] === d.x && sg[k][1] === d.y) sg[k] = [l.x, l.y];
}
const rooms = map.areas.filter((a) => a.kind === 'room' && a.door);
const doorOf = (a) => {
  const [x, y, w, h] = a.rect, s = a.door.side, at = a.door.at;
  if (s === 'n' || s === 's') return { x: at ?? x + w / 2, y: s === 'n' ? y : y + h };
  return { x: s === 'w' ? x : x + w, y: at ?? y + h / 2 };
};
const doors = rooms.map((a) => ({ room: a.id, ...doorOf(a) }));
const onSeg = (p, [a, b]) => {
  const [x1, y1] = a, [x2, y2] = b;
  const cross = Math.abs((x2 - x1) * (p.y - y1) - (y2 - y1) * (p.x - x1)) / Math.hypot(x2 - x1, y2 - y1);
  const within = p.x >= Math.min(x1, x2) - TOL && p.x <= Math.max(x1, x2) + TOL && p.y >= Math.min(y1, y2) - TOL && p.y <= Math.max(y1, y2) + TOL;
  return cross <= TOL && within;
};
const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) <= TOL;
const corridorSeg = (p) => segs.find((s) => onSeg(p, s));
const doorAt = (p) => doors.find((d) => near(p, d));
const letterAt = (p) => map.targets.find((t) => near(p, t));
const inRoom = (p, id) => { const [x, y, w, h] = map.areas.find((a) => a.id === id).rect; return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h; };
const entranceAnchors = new Set(map.landmarks.filter((l) => l.entrance).map((l) => l.id));

for (const e of events) {
  if (!corridorSeg(e.at) && !doorAt(e.at) && !letterAt(e.at)) bad.push(`${e.id}: at (${e.at.x}, ${e.at.y}) is not on a corridor, door or letter point`);
}
// Legs
const legs = [];
for (const e of events) { if (!legs.length || e.startsLeg) legs.push([]); legs[legs.length - 1].push(e); }
legs.forEach((leg, i) => {
  const s = leg[0];
  if (s.kind !== 'move' || !entranceAnchors.has(s.landmarkId)) bad.push(`leg ${i + 1}: starts at ${s.id} (${s.kind}, ${s.landmarkId ?? 'no landmark'}), not a move at an entrance`);
  else { const l = map.landmarks.find((x) => x.id === s.landmarkId); if (!near(s.at, l)) bad.push(`leg ${i + 1}: ${s.id} is not at its anchor ${l.id}`); }
  if (s.fromAnswer || s.how) bad.push(`leg ${i + 1}: ${s.id} has fromAnswer or how`);
  const dests = leg.filter((e) => e.kind === 'destination');
  if (dests.length !== 1) bad.push(`leg ${i + 1}: ${dests.length} destinations`);
  // Walkable segments: skip correction events (they mark a place, the walk does not go there).
  const walk = leg.filter((e) => e.kind !== 'correction');
  for (let k = 1; k < walk.length; k++) {
    const a = walk[k - 1].at, b = walk[k].at;
    if (near(a, b)) continue;
    const alongCorridor = segs.some((sg) => onSeg(a, sg) && onSeg(b, sg));
    const dB = doorAt(b), dA = doorAt(a);
    const toDoor = dB && corridorSeg(a) && (a.x === b.x || a.y === b.y) && !rooms.some((r) => r.id !== dB.room && segCrossesRoom(a, b, r));
    const intoRoom = dA && inRoom(b, dA.room);
    const viaDoor = corridorSeg(a) && doors.some((d) => onSeg(d, [[a.x, a.y], [b.x, b.y]]) && inRoom(b, d.room)) && (a.x === b.x || a.y === b.y);
    if (!alongCorridor && !toDoor && !intoRoom && !viaDoor) bad.push(`leg ${i + 1}: segment ${walk[k - 1].id} (${a.x}, ${a.y}) to ${walk[k].id} (${b.x}, ${b.y}) is not walkable`);
  }
});
function segCrossesRoom(a, b, r) {
  const [x, y, w, h] = r.rect;
  for (let t = 0.02; t < 0.98; t += 0.02) { const px = a.x + (b.x - a.x) * t, py = a.y + (b.y - a.y) * t; if (px > x + TOL && px < x + w - TOL && py > y + TOL && py < y + h - TOL) return true; }
  return false;
}
// Destinations exactly on their answer letter
for (const q of questions) {
  const e = events.find((x) => x.id === q.eventId);
  const t = map.targets.find((x) => x.label === q.answerLabel);
  if (!e || e.kind !== 'destination') bad.push(`${q.id}: eventId ${q.eventId} is not a destination`);
  else if (e.at.x !== t.x || e.at.y !== t.y) bad.push(`${q.id}: destination (${e.at.x}, ${e.at.y}) is not exactly on letter ${t.label} (${t.x}, ${t.y})`);
}
// Words: in their cue, in event order within a cue; events in audio order
const cursor = new Map();
let lastCue = -1;
for (const e of events) {
  const c = cues.get(e.cueId);
  if (!c) { bad.push(`${e.id}: missing cue ${e.cueId}`); continue; }
  const ci = cueOrder.indexOf(e.cueId);
  if (ci < lastCue) bad.push(`${e.id}: out of audio order`);
  lastCue = ci;
  if (!e.word) { bad.push(`${e.id}: no word`); continue; }
  const k = c.text.indexOf(e.word, cursor.get(e.cueId) ?? 0);
  if (k < 0) bad.push(`${e.id}: word "${e.word}" not in ${e.cueId} after the previous events' words`);
  else cursor.set(e.cueId, k + e.word.length);
}
// Hints
for (const q of questions) {
  const leg = legs.find((l) => l.some((e) => e.id === q.eventId)) ?? [];
  const di = leg.findIndex((e) => e.id === q.eventId);
  const h1 = q.hints.find((h) => h.level === 1), h2 = q.hints.find((h) => h.level === 2);
  if (q.hints.length !== 2 || !h1 || !h2) bad.push(`${q.id}: needs exactly a level 1 and a level 2 hint`);
  if (h1 && (h1.landmarkId === 'main-entrance' || !leg.slice(0, di).some((e) => ['landmark', 'turn'].includes(e.kind) && e.landmarkId === h1.landmarkId))) bad.push(`${q.id}: level 1 hint ${h1.landmarkId} is not a landmark or turn on its leg before the answer`);
  const dest = events.find((e) => e.id === q.eventId);
  if (h2 && dest && cueOrder.indexOf(h2.cueId) > cueOrder.indexOf(dest.cueId)) bad.push(`${q.id}: level 2 hint cue ${h2.cueId} is after the answer's cue`);
}
console.log(`${legs.length} legs, ${events.length} events, ${questions.length} questions`);
console.log(bad.length ? 'FAIL:\n- ' + bad.join('\n- ') : 'PASS');
if (bad.length) process.exitCode = 1;
