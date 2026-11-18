# Prompt: redraft the first challenge's talk on the fixed v2 map (external AI)

Owner use: copy everything below the line into a new chat with the drafting AI, and bring its full answer back to the coding agent (ticket `.scratch/map-format-v2/issues/02-first-challenge-anchored.md`). The coding agent voices it with Kokoro, times it, validates it, and has it reviewed. The drafting AI never marks anything reviewed or published.

Rules behind this prompt: owner decisions D21, D22 and D23 (`docs/product/owner-decisions.md`).

---

You are drafting the spoken talk for ONE original practice item in an IELTS preparation app for adult Arabic-speaking learners. Task type: **Listening, map labelling** (like IELTS Listening Part 2: one speaker describes a place; the learner matches place names to letters on a map). The map is already drawn and fixed. You write the talk, the route the answer replay will draw, the questions, hints and explanations. A strict validator and then a human reviewer check your work, so precision matters more than length.

Do not copy or closely paraphrase any Cambridge or IELTS published test, script or map, or any commercial practice test. Everything here is original.

## The item

- Purpose: the **first challenge**, the first task every new learner sees. Fair, clear, not easy. Tier 2 of 3.
- Setting: **Riverside Community Centre**, an Open Day. One female volunteer guide speaks to visitors. She is standing at the main entrance.
- **Exactly 3 questions**, always these places with these answers: **Quiet Lounge = C**, **Craft Room = F**, **Table tennis room = H**. Ask them in this order.
- One micro-skill per question, each used once: `spatial-language` (Quiet Lounge), `landmark-vs-answer` (Craft Room), `corrections-distractors` (Table tennis room).
- Exactly **one self-correction** by the speaker, in the table tennis room question (she names a wrong direction or side, then corrects it), and no other distractor or correction.
- Pace: natural, about 150 words per minute. Total talk about 170 to 200 words (about 65 to 80 seconds). Short sentences written for the ear; one speaker; no stage directions inside the spoken text.

## How the talk must work (the most important part)

Real IELTS map talks do not walk on from one answer to the next. So:

1. **Every question starts again at the main entrance**, the only entrance of this building. Say so naturally each time ("Starting from the main entrance again, ..."). Never start a question from a room or from the previous answer.
2. The guide **walks** the listener from the entrance along the corridors to the answer room. The route may only follow the corridors listed below and enter a room through its door. It never cuts through a room or a wall.
3. To pin down the final room, she may use the rooms she passes and compass words, as real tests do: "on your left", "the second door on the right", "directly north of the staff office", "opposite the café", "at the far end". North is at the top of the map.
4. Name a few rooms she passes (the labelled rooms below), so the learner has landmarks. **Only labelled rooms may be named.** Lettered rooms have no names; never describe a lettered room by a name other than the place being asked.
5. Every direction must be true on the coordinates below. Check each left or right against the walking direction (walking north, left is west; walking east, right is south; walking west, right is north).

## The fixed map (do not change anything here)

Coordinates: the map is 1000 wide and 900 high. The origin is the top-left corner. **x grows to the east, y grows to the south** (smaller y is further north).

Corridors (walkable lines; a route point must lie on one of these lines, at a door, or at the answer letter):
- **Main hall**: from the main entrance (500, 840) north to the junction by the noticeboard (500, 560).
- **East corridor**: from the junction (500, 560) east to its far end (980, 560).
- **West corridor**: from the junction (500, 560) west to the corner (290, 560), then north along x = 290 to its end (290, 20).
- **Small cross corridor**: from (290, 190) east to the sports hall door (470, 190).

The **main entrance** is in the middle of the south wall at (500, 820); visitors stand just outside it at (500, 840). The **noticeboard** hangs on the wall at the junction (500, 545). A north arrow is on the map.

Rooms (every room opens onto a corridor through its door):

| Room id | Shown on map as | x from-to | y from-to | Door point | Letter point |
|---|---|---|---|---|---|
| room-g | letter G | 100-265 | 20-165 | (265, 92) | (182, 92) |
| store | Store | 100-265 | 165-270 | (265, 217) | - |
| room-f | letter F | 100-265 | 270-400 | (265, 335) | (182, 335) |
| staff-office | Staff office | 100-265 | 400-585 | (265, 492) | - |
| room-b | letter B | 100-300 | 585-820 | (200, 585) | (200, 702) |
| toilets | Toilets | 300-470 | 585-820 | (385, 585) | - |
| room-h | letter H | 315-470 | 20-165 | (315, 92) | (392, 92) |
| cafe | Café | 315-470 | 215-400 | (315, 307) | - |
| room-e | letter E | 315-470 | 400-535 | (315, 467) | (392, 467) |
| sports-hall | Sports hall | 470-980 | 20-400 | (470, 190) | - |
| room-a | letter A | 470-740 | 400-535 | (605, 535) | (605, 467) |
| kitchen | Kitchen | 740-980 | 400-535 | (860, 535) | - |
| meeting-room | Meeting room | 530-750 | 585-710 | (640, 585) | - |
| reception | Reception | 530-750 | 710-820 | (530, 765) | - |
| room-d | letter D | 750-865 | 585-820 | (807, 585) | (805, 702) |
| room-c | letter C | 865-980 | 585-820 | (922, 585) | (933, 702) |

Landmark ids you may use in events and hints (these are the labelled places): `main-entrance`, `reception`, `toilets`, `noticeboard`, `meeting-room`, `staff-office`, `cafe`. The Store, Kitchen and Sports hall are labelled on the map but are not landmark ids: the speaker may mention them, but no event or hint can point to them.

## The route (events)

List what happens along the talk, in audio order. Each question has its own **leg**: a list of events from the main entrance to its answer.
- Each leg's first event is `{"kind": "move", "landmarkId": "main-entrance", "at": {"x": 500, "y": 840}}`; the second and third legs also carry `"startsLeg": true`.
- `move`: a corner or a point the route reaches along a corridor (for example the junction, the corridor corner (290, 560), or the corridor point in front of a door).
- `landmark`: the speaker names a labelled room the route passes (needs `landmarkId`; `at` is the corridor point beside its door).
- `turn`: the route turns at a landmark (needs `landmarkId`; `at` is the turning point).
- `correction`: the speaker corrects herself (needs a `note` saying what she said first and what she meant; `at` is the corridor point beside the place she named by mistake).
- `destination`: the route enters the answer room: `at` is that room's **letter point** exactly. Exactly one per question. Put a `move` at the room's door point just before it, so the line goes through the door.

**Timing words.** Every event also has `"word"`: the exact words in its cue (copied character for character, including case) after which the line may reach that point. The app draws that part of the line only after those words have been spoken. Example: for "go straight up the main hall to the noticeboard, and turn right", the turn event has `"word": "turn right"`, and the move to the junction has `"word": "to the noticeboard"`. Every `word` must appear in its cue's text, and within a cue the events' words must appear in the order of the events.

## Questions, hints and explanations

Each question has:
- `prompt`: the place name as it appears in the question list ("Quiet Lounge", "Craft Room", "Table tennis room").
- `answerLabel`, `eventId` (its destination event), `microSkill`.
- `hints`: exactly two, in this order:
  - `{"level": 1, "landmarkId": "..."}`: a landmark from a `landmark` or `turn` event **on the same leg**, before the destination (never the main entrance). The app shows "listen for when the speaker passes X".
  - `{"level": 2, "cueId": "..."}`: the cue at or before the destination cue that is worth replaying.
- `explanation`: `en` and `ar`, 1 to 3 short sentences each, explaining WHY the letter is right, quoting the key words the speaker used, and naming the trap (the most tempting wrong letter, and why it is wrong). Arabic is Modern Standard Arabic, plain and friendly, for an adult learner. Do not translate word for word: write how an Arabic-speaking teacher would explain it. **Mixing English into the Arabic is hard to read, so:**
  - Use English only for the exact words the speaker says, in «guillemets», and at most one or two short quotes per explanation.
  - Never put an English quote at the start or end of a sentence or clause: keep Arabic words on both sides of it. Example: تقع «at the far end» من الممر، أي في آخره.
  - Place names are in Arabic only: no English room names, and no English in brackets. Use these: غرفة الهدوء، غرفة الأشغال اليدوية، غرفة تنس الطاولة، المدخل الرئيسي، القاعة الرئيسية، لوحة الإعلانات، غرفة الاجتماعات، مكتب الموظفين، المقهى، المخزن، المطبخ، الصالة الرياضية، الاستقبال، دورات المياه. Map letters (A to H) are fine; keep them inside the sentence.

Each answer must be the **only defensible letter** for a careful listener. For each question, before you finish, try the two most tempting wrong letters and make sure the talk rules them out.

## Hard rules

- Plain text only: no HTML, no markdown inside strings, no `<` followed by a letter, no special Unicode direction characters.
- Cue ids `c1`, `c2`, ... in order; each cue is one or two sentences. Set every cue's `start` and `end` to 0 (the coding agent times them against the real audio).
- Event ids `e1`, `e2`, ... in route order; each event's `cueId` is the cue where its `word` is spoken; events are in audio order.
- Every `at` point is on a corridor line, at a door point or at a letter point listed above.
- Open with one or two cues of welcome and orientation (where they are standing, that north is at the top of the map), and end with one short closing cue.

## Output format (exactly these four sections)

### 1. Talk
The full talk as plain text, one cue per line, each line starting with its cue id.

### 2. JSON
One JSON object with exactly these keys: `transcript` (`{"cues": [...]}`), `events` ([...]), `questions` ([...]). Nothing else (the map, audio and other fields stay as they are).

### 3. Self-check
A table with one row per event: id, cue, word, at, the corridor or door it lies on. Then, for each question: every direction the talk gives, checked against the coordinates (walking direction, left or right, north or south), and the two most tempting wrong letters with why each is ruled out. Then the word count.

### 4. Notes for the reviewer
Anything you were unsure about.
