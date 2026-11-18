// Builds the anchored rewrite of first-challenge-001 (ticket 02) from the v2 redraw: same map, new talk, legs, questions.
import { readFileSync, writeFileSync } from 'node:fs';
const [src, out] = process.argv.slice(2);
const v2 = JSON.parse(readFileSync(src, 'utf8'));
const map = structuredClone(v2.map);
// The café becomes a landmark (it anchors Q3), so its area loses its own label; the corridor junction is no longer spoken.
map.areas.find((a) => a.id === 'cafe').label = undefined;
map.landmarks = map.landmarks.filter((l) => l.id !== 'corridor-junction');
// Anchor points sit inside the room but below its label, so the replay's start ring never covers the name.
map.landmarks.find((l) => l.id === 'staff-office').y = 548;
map.landmarks.push({ id: 'cafe', label: 'Café', x: 392, y: 375, area: 'cafe' });
const cues = [
  ['c1', 'Hello, everyone, and welcome to our Open Day at Riverside Community Centre.'],
  ['c2', "I'm one of the volunteers, and I'm going to show you where three of our activity rooms are."],
  ['c3', "Have a look at the map. We're at the main entrance, right at the bottom, and north is at the top."],
  ['c4', 'First, the Quiet Lounge. From the main entrance, go straight up the main hall to the noticeboard, and turn right.'],
  ['c5', "You'll pass the meeting room on your right. The Quiet Lounge is at the far end of that corridor, also on your right."],
  ['c6', 'Next, the Craft Room. Find the staff office, over on the west side of the map.'],
  ['c7', 'The Craft Room is directly north of the staff office, next door to it.'],
  ['c8', 'And finally, the table tennis room. For this one, start at the café.'],
  ['c9', "The table tennis room is directly south of the café... oh, sorry, I mean north. It's just across the corridor from it."],
  ['c10', "So that's the Quiet Lounge, the Craft Room and the table tennis room. Enjoy the Open Day!"],
].map(([id, text]) => ({ id, start: 0, end: 0, text })); // times filled in after the audio is rendered
const at = (x, y) => ({ x, y });
const events = [
  { id: 'e1', cueId: 'c3', kind: 'move', landmarkId: 'main-entrance', at: at(500, 840) },
  { id: 'e2', cueId: 'c4', kind: 'turn', landmarkId: 'noticeboard', at: at(500, 560) },
  { id: 'e3', cueId: 'c5', kind: 'landmark', landmarkId: 'meeting-room', at: at(640, 560) },
  { id: 'm1', cueId: 'c5', kind: 'move', at: at(933, 560) },
  { id: 'e4', cueId: 'c5', kind: 'destination', at: at(933, 702) },
  { id: 'e5', cueId: 'c6', kind: 'landmark', landmarkId: 'staff-office', at: at(182, 548), startsLeg: true, how: 'point' },
  { id: 'e6', cueId: 'c7', kind: 'destination', at: at(182, 335) },
  { id: 'e7', cueId: 'c8', kind: 'landmark', landmarkId: 'cafe', at: at(392, 375), startsLeg: true, how: 'point' },
  { id: 'e8', cueId: 'c9', kind: 'correction', at: at(392, 467), note: 'The guide first says the table tennis room is directly south of the café (letter E), then corrects herself to north.' },
  { id: 'e9', cueId: 'c9', kind: 'destination', at: at(392, 92) },
];
const q = (id, prompt, answerLabel, eventId, microSkill, landmarkId, cueId, en, ar) =>
  ({ id, prompt, answerLabel, eventId, microSkill, hints: [{ level: 1, landmarkId }, { level: 2, cueId }], explanation: { en, ar } });
const questions = [
  q('q1', 'Quiet Lounge', 'C', 'e4', 'spatial-language', 'meeting-room', 'c5',
    "The guide starts from the main entrance: up the main hall, right at the noticeboard, past the meeting room. The Quiet Lounge is 'at the far end of that corridor', on your right. D is also on the right, but not at the far end, and A is on the left. Only C is at the far end, on the right.",
    'تبدأ المرشدة من المدخل الرئيسي: تصعد في القاعة الرئيسية حتى لوحة الإعلانات، ثم تنعطف يميناً وتمرّ بغرفة الاجتماعات. وتقول إن غرفة الهدوء تقع «at the far end» من الممر، أي في آخره تماماً، وعلى يمينك. الحرف D على اليمين أيضاً لكنه ليس في آخر الممر، والحرف A على اليسار. لذلك فالحرف C وحده يقع في آخر الممر وعلى اليمين.'),
  q('q2', 'Craft Room', 'F', 'e6', 'landmark-vs-answer', 'staff-office', 'c7',
    "The staff office is only the reference point, not the answer. The guide says the Craft Room is 'directly north of the staff office, next door to it'. Don't confuse it with E, which is opposite the staff office, across the corridor, or with the store, which is further north but not next door. Only F is next door, to the north.",
    'تذكر المرشدة مكتب الموظفين لتوجيهك فقط، وليس هو الإجابة. فهي تقول إن غرفة الأشغال اليدوية تقع شمال المكتب مباشرة، أي «next door to it» من جهة الشمال. فلا تخلط بينها وبين الحرف E الذي يقع مقابل المكتب على الجهة الأخرى من الممر، ولا المخزن الذي يقع أبعد نحو الشمال ولا يجاور المكتب. لذلك فالإجابة هي الحرف F.'),
  q('q3', 'Table tennis room', 'H', 'e9', 'corrections-distractors', 'cafe', 'c9',
    "The guide first says 'directly south of the café', then corrects herself: 'oh, sorry, I mean north'. Always trust the correction. South of the café is E, which she said by mistake; north of it, just across the corridor, is H.",
    'تقول المرشدة أولاً إن غرفة تنس الطاولة تقع جنوب المقهى، ثم تعتذر وتصحّح كلامها قائلةً «I mean north» أي إنها شمال المقهى. عندما يصحّح المتحدث نفسه، اعتمد دائماً على التصحيح الأخير. فالحرف E جنوب المقهى هو ما قالته خطأً، والإجابة الصحيحة هي الحرف H شمال المقهى، بعد الممر.'),
];
const item = {
  ...v2,
  version: 3,
  difficulty: { landmarks: map.landmarks.length, routeSteps: events.filter((e) => ['move', 'landmark', 'turn'].includes(e.kind)).length, distractors: 0, selfCorrections: 1, audioPace: 'natural' },
  audio: { file: 'audio/first-challenge-001-anchored.m4a', durationSec: 0, source: 'synthetic' },
  map, transcript: { cues }, events, questions,
  validation: { status: 'draft' },
};
writeFileSync(out, JSON.stringify(item, null, 2) + '\n');
