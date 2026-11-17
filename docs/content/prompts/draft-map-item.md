# Prompt: draft a Listening Map Labelling item (external AI)

Give everything below the line to the drafting AI. It is written for the featured first challenge (ticket 02); for other items (ticket 18), change the "This item" block only.

The draft comes back to the coding agent, which makes the synthetic audio, re-times the cues against it, runs `tools/validate-content.mjs`, and does the `validate-ielts-content` checks. The drafting AI never marks anything reviewed or published.

---

You are drafting ONE original practice item for an IELTS preparation app for adult Arabic-speaking learners. The item type is **Listening, Map Labelling** (as in IELTS Listening Part 2: one speaker describes a place; the learner matches places to letters on a map). Your output will be checked by a strict validator and then by a human reviewer, so precision matters more than length.

## This item

- Purpose: `first-challenge`. It is the first task every new learner sees. It must feel like a real IELTS map task, be fair, and give a sense of success: clear, not easy.
- Tier 2: natural speaking pace (about 140 to 160 words per minute), about 8 lettered places on the map (A to H), **exactly 3 questions**, exactly **one** distractor OR one self-correction by the speaker.
- Micro-skills to train (one per question, use each once): `spatial-language`, `landmark-vs-answer`, `corrections-distractors`.
- Audio will be made with a synthetic voice from your transcript, so write for the ear: one speaker, short sentences, natural spoken phrasing ("OK, so...", "if you look at the map..."), no stage directions inside the spoken text.

## Step 1: research first (use web search)

Before writing, search and read:
1. Official descriptions of the IELTS Listening test and the map/plan/diagram labelling task: ielts.org, takeielts.britishcouncil.org, ieltsessentials.com / IDP. Note the task format, the instructions wording style, the Part 2 context (non-academic, everyday social setting, one speaker), and the number of options vs questions.
2. Teacher guidance on map labelling difficulty: spatial language (opposite, adjacent to, at the far end, in the corner, just past, bear left), the common traps (a landmark named near the answer, a speaker who corrects themselves, "next to" vs "opposite"), and how test makers signal direction (compass points, "as you come in", "you are here").
3. Typical real-world layouts for your chosen setting so the place is believable (where a reception, toilets, car park, exits usually are).

**Rules for sources:** use them for format and realism only. Do NOT copy or closely paraphrase any Cambridge/IELTS published test, script, or map, or any commercial practice test. The setting and all names must be invented and generic (e.g. "Riverside Community Centre", not a real named place). List the URLs you used at the end.

## Step 2: choose the setting

Propose 3 settings in one line each, then pick one and say why. Good settings: a community centre, a sports complex, a science museum, a farm park, a college campus open day, a library, a garden. Choose something culturally comfortable for adult Arabic-speaking learners, and avoid alcohol, religion, romance, gambling and politics.

## Step 3: design the map, then the talk, then the questions

Design in this order so the answer key is correct by construction.

**Map (coordinates).** The app draws the map from coordinates, no image. The map is 1000 wide and 700 high. **North is at the top: smaller y is further north; larger x is further east.** Every direction the speaker gives MUST match these coordinates (if the speaker says "north of the fountain", the place has a smaller y than the fountain, at a similar x).
- `landmarks`: 5 to 7 named things the learner can see labelled on the map (e.g. Main entrance, Reception, Fountain). One of them is the starting point.
- `targets`: 8 lettered places A to H, each a point. 3 are answers; the other 5 are plausible wrong options. Spread them so each answer is clearly distinguishable from its neighbours (at least 80 units apart), and place wrong options where a careless listener would go (e.g. on the other side of the landmark that is mentioned).

**Talk (transcript cues).** Split the talk into cues: each cue is one or two sentences, with an estimated `start` and `end` in seconds (timing at your pace; it will be corrected against the real audio). Open with 1 or 2 cues of context (who is speaking, why), then orient the listener ("we're standing at the main entrance, at the bottom of the map"), then walk the route. Total length about 60 to 90 seconds.

**Route (events).** List what happens along the talk, in audio order. Each event has an `id`, the `cueId` where it is spoken, a `kind`, and the point `at` on the map where the route is at that moment:
- `move`: the route moves (use for the starting point too)
- `landmark`: the speaker names a landmark the route passes (needs `landmarkId`)
- `turn`: the route turns at a landmark (give `landmarkId`)
- `distractor`: the speaker names a landmark that could mislead (needs `landmarkId` and a `note` saying why it misleads; it must NOT sit on one of the 3 answer letters)
- `correction`: the speaker corrects themself (needs a `note` saying what was corrected)
- `destination`: the route arrives at an answer place. `at` must be within 20 units of that answer's target letter. Exactly one destination per question.

**Questions.** In the same order as their destinations on the route. Each has:
- `prompt`: the place name the learner must find (e.g. "Lost property"), as it would appear in the question list
- `answerLabel`: the letter; each letter is the answer to at most one question
- `eventId`: its destination event
- `microSkill`: one of the item's skills
- `hints`: exactly two, in this order:
  - level 1: `{"level": 1, "landmarkId": "..."}`, a landmark the route has ALREADY passed as a `landmark` or `turn` event before this destination (never a distractor). The app shows it as "listen for when the speaker passes X".
  - level 2: `{"level": 2, "cueId": "..."}`, a cue at or before the destination cue, the moment worth replaying.
- `explanation`: `en` and `ar`. 1 to 3 short sentences explaining WHY this letter is right, quoting the key words the speaker used, and naming the trap if there is one. Arabic is Modern Standard Arabic, plain and friendly, for an adult learner; keep English place names and key spoken words in English inside the Arabic (e.g. «opposite»), because the learner hears them in English. Do not translate word for word: write how an Arabic-speaking teacher would explain it.

## Hard rules (the validator rejects the item otherwise)

- Plain text only everywhere: no HTML, no markdown inside strings, no `<` followed by a letter, no special Unicode direction characters.
- Cue ids unique, cues sorted by start, `0 <= start < end`, last cue ends no later than `audio.durationSec`.
- Events in audio order (each event's cue starts no earlier than the previous event's cue).
- All `at` points and map points inside 0..1000 by 0..700.
- Every `landmarkId` exists in `map.landmarks`.
- `supportPolicy.exam.replay` is false.
- `validation.status` is `"draft"`. Do not add a reviewer.
- `audio.source` is `"synthetic"`, `audio.file` is `"audio/<id>.mp3"`.

## Quality bar (a human will check each of these)

1. **One defensible answer per question.** For each question, argue for the two most tempting wrong letters. If either is defensible, change the map or the wording until it is not.
2. **The trap is fair.** A careful listener on a first listen gets it right; a careless one is caught. The speaker never says something false.
3. **Spatial words are exact.** "Opposite" means across a path or space, facing; "next to" means touching or immediately beside; "beyond/past" means further along the route. Coordinates must agree.
4. **Sounds natural spoken aloud.** Read every cue aloud in your head. No written-English constructions, no lists of numbers.
5. **Difficulty fields are honest.** `difficulty` counts what is really in the audio.
6. **Original.** Nothing copied; no real named businesses or brands.

## Output format (exactly these four sections)

### 1. Setting
The three options, your pick, and why (3 to 5 lines).

### 2. Item JSON
One fenced `json` block, valid JSON, in exactly this shape (values are examples):

```json
{
  "id": "first-challenge-001",
  "type": "listening.map-labelling",
  "version": 1,
  "skills": ["spatial-language", "landmark-vs-answer", "corrections-distractors"],
  "tier": 2,
  "purpose": "first-challenge",
  "difficulty": { "landmarks": 6, "routeSteps": 5, "distractors": 1, "selfCorrections": 0, "audioPace": "natural" },
  "supportPolicy": { "learning": { "replay": true, "hints": true }, "exam": { "replay": false, "hints": false } },
  "audio": { "file": "audio/first-challenge-001.mp3", "durationSec": 80, "source": "synthetic" },
  "map": {
    "width": 1000, "height": 700,
    "landmarks": [ { "id": "main-entrance", "label": "Main entrance", "x": 500, "y": 660 } ],
    "targets": [ { "label": "A", "x": 200, "y": 150 } ]
  },
  "transcript": { "cues": [ { "id": "c1", "start": 0, "end": 6.5, "text": "..." } ] },
  "events": [
    { "id": "e1", "cueId": "c3", "kind": "move", "at": { "x": 500, "y": 660 } },
    { "id": "e4", "cueId": "c6", "kind": "distractor", "landmarkId": "fountain", "at": { "x": 500, "y": 350 }, "note": "..." },
    { "id": "e5", "cueId": "c7", "kind": "destination", "at": { "x": 200, "y": 150 } }
  ],
  "questions": [
    {
      "id": "q1", "prompt": "Lost property", "answerLabel": "A", "eventId": "e5", "microSkill": "spatial-language",
      "hints": [ { "level": 1, "landmarkId": "reception" }, { "level": 2, "cueId": "c7" } ],
      "explanation": { "en": "...", "ar": "..." }
    }
  ],
  "validation": { "status": "draft" }
}
```

### 3. Self-check
A table with one row per question: question, answer letter, the exact words in the audio that decide it, the two most tempting wrong letters, and why each is wrong. Then one line per hard rule above: OK, or what you changed.

### 4. Notes for the reviewer
- A plain-English description of the map (what is where), so a person can sketch it and check it against the talk.
- Suggested voice: accent (British, Australian or North American), gender, and pace.
- Anything you were unsure about.
- The URLs you used in step 1.
