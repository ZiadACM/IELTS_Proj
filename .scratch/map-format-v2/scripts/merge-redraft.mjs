// Merges an external AI's redraft (ticket 03) into the anchored item: takes only transcript, events and questions,
// keeps the map and every other field, bumps version, recomputes difficulty as make-anchored.mjs does,
// and resets cue times and audio length to 0 (filled after voicing).
// Usage: node .scratch/map-format-v2/scripts/merge-redraft.mjs <answer.md> <item.json>
// <answer.md> is the AI's answer; its JSON is the text between the "2. JSON" and "3. Self-check" headings.
import { readFileSync, writeFileSync } from 'node:fs';
const [answerPath, itemPath] = process.argv.slice(2);
const answer = readFileSync(answerPath, 'utf8');
const json = answer.slice(answer.search(/^#*[ \t]*2\. JSON/m)).replace(/^.*\n/, '');
const draft = JSON.parse(json.slice(0, json.search(/^#*[ \t]*3\. Self-check/m)));
const item = JSON.parse(readFileSync(itemPath, 'utf8'));
const notes = [];
const questions = draft.questions.map((q, i) => {
  if (q.id) return q;
  notes.push(`question ${i + 1} had no id: set q${i + 1}`);
  return { id: `q${i + 1}`, ...q };
});
const cues = draft.transcript.cues.map((c) => ({ ...c, start: 0, end: 0 }));
const events = draft.events;
const out = {
  ...item,
  version: item.version + 1,
  difficulty: {
    landmarks: new Set(events.map((e) => e.landmarkId).filter(Boolean)).size, // landmarks the talk names
    routeSteps: events.filter((e) => ['move', 'landmark', 'turn'].includes(e.kind)).length,
    distractors: events.filter((e) => e.kind === 'distractor').length,
    selfCorrections: events.filter((e) => e.kind === 'correction').length,
    audioPace: 'natural',
  },
  audio: { ...item.audio, durationSec: 0 },
  transcript: { cues },
  events,
  questions,
  validation: { status: 'draft' },
};
writeFileSync(itemPath, JSON.stringify(out, null, 2) + '\n');
console.log(`merged: version ${out.version}, ${cues.length} cues, ${events.length} events, ${questions.length} questions`);
for (const n of notes) console.log('note:', n);
