// Copies the cue times, length and event word times (atSec) written by render.py into an item file, checks the
// word times (D23: each atSec inside its cue, never going down in event order), and prints the pace.
// Usage: node .scratch/map-format-v2/scripts/fill-times.mjs <item.json> <times.json>
import { readFileSync, writeFileSync } from 'node:fs';
const [itemPath, timesPath] = process.argv.slice(2);
const item = JSON.parse(readFileSync(itemPath, 'utf8')), times = JSON.parse(readFileSync(timesPath, 'utf8'));
item.audio.durationSec = times.durationSec;
for (const c of item.transcript.cues) { const t = times.cues.find((x) => x.id === c.id); c.start = t.start; c.end = t.end; }
const at = new Map((times.events ?? []).map((e) => [e.id, e.atSec]));
for (const e of item.events) { if (at.has(e.id)) e.atSec = at.get(e.id); else delete e.atSec; }
writeFileSync(itemPath, JSON.stringify(item, null, 2) + '\n');

const cues = new Map(item.transcript.cues.map((c) => [c.id, c]));
const bad = [];
let prev = -Infinity;
for (const e of item.events) {
  if (e.word && e.atSec === undefined) bad.push(`${e.id}: has a word but no atSec`);
  if (e.atSec === undefined) continue;
  const c = cues.get(e.cueId);
  if (e.atSec < c.start || e.atSec > c.end) bad.push(`${e.id}: atSec ${e.atSec} outside ${c.id} (${c.start} to ${c.end})`);
  if (e.atSec < prev) bad.push(`${e.id}: atSec ${e.atSec} goes down (previous ${prev})`);
  prev = e.atSec;
}
const words = item.transcript.cues.reduce((n, c) => n + c.text.split(/\s+/).length, 0);
const speech = item.transcript.cues.reduce((n, c) => n + c.end - c.start, 0);
console.log(`${words} words; ${Math.round((words / speech) * 60)} wpm during speech, ${Math.round((words / item.audio.durationSec) * 60)} overall`);
console.log(`word times: ${at.size} set; ` + (bad.length ? 'FAIL: ' + bad.join('; ') : 'PASS (inside their cues, never going down)'));
if (bad.length) process.exitCode = 1;
