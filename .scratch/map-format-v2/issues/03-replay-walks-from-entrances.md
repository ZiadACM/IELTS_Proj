# 03: Replay legs start at an entrance, walk the corridors, and follow the words

**What to build:** Answer Replay (prototype first) draws every leg from an entrance, along corridors and through doors, never through a wall or a room; and it draws each part of the line only after the speaker has said it. The format, glossary and docs follow owner decision D23. Then the redrafted first challenge (drafted by an external AI with `docs/content/prompts/redraft-first-challenge-anchored.md`) is voiced, timed, checked and shown in the prototype.

**Blocked by:** 01, 02. The second half waits for the owner to bring back the AI draft.

**Status:** ready-for-agent

Handoff (start here): `docs/development/handoffs/2026-11-18-map-v2-replay-fixes.md`

## Part A: fixes (no draft needed)

- [x] Prototype: walked legs only; pointing-leg drawing and the "Example pointing leg" button removed
- [x] Prototype: each event appears only once the audio passes its `atSec` (fallback: its cue's end, never its cue's start)
- [x] `render.py` writes word times so each event gets `atSec` = the end of its `word` phrase in the final audio
- [x] `docs/content/map-format-v2.md`, `GLOSSARY.md`: legs per D23 (entrance anchors only; no pointing legs, no `fromAnswer`; `word` and `atSec`; walkable routes are an error, not a warning)

## Part B: the redrafted first challenge (after the owner brings the AI's answer)

- [x] The AI's JSON merged into `.scratch/map-format-v2/first-challenge-001.anchored.json` (map unchanged), voiced with the D22 settings, cues timed, `atSec` set
- [x] Checks: timing check PASS; validator exit 0 with assets; every `at` on a corridor, a door or a letter point; every `word` in its cue and in order; every leg starts at the main entrance
- [x] Independent `validate-ielts-content` review in a fresh context; fixes applied
- [x] Prototype variant D shows it; republished to the same page

## Comments

### 2026-11-18, agent (Part A)
- Prototype (branch `agent/map-format-v2-prototype`, after merging `agent/map-format-v2`): pointing-leg drawing, `how: "point"` handling and the "Example pointing leg" button and note removed. Each event is drawn once the audio reaches its `atSec`, else its cue's `end` (never its `start`). "Show whole route" and ▶ per question kept. Headless Chromium at 360 px on the current v3 draft and on a scratch copy with word times: no event drawn 0.05 s before its time, each drawn at its time; no script errors (only the two audio files, which live beside the published page); no sideways scroll. Not republished: the v3 draft's legs 2 and 3 still start at rooms and now draw as straight lines; the page is republished with the redraft (Part B).
- Word times: Kokoro's English pipeline does return per-token `start_ts`/`end_ts`. `render.py` maps each `word` phrase's end through the trim and pause caps and writes `events[].atSec` to `times.json`; a time that lands in a pause (Kokoro gives the pause after "café..." to the word) moves back to where speech stopped. `fill-times.mjs` copies `atSec` into the item and fails if one is outside its cue or goes down. Test on a scratch copy of v3 with a `word` per event: 10 of 10 found, PASS; on the waveform each time sits where that phrase's speech stops. Cue times came out within 0.01 s of the committed v3 (Kokoro run-to-run).
- Docs (D23): `map-format-v2.md` "Route legs" rewritten (entrance anchors only, walked legs, `word` and `atSec`; `fromAnswer` and pointing legs gone); rules `v2-leg-start`, `v2-word`, `v2-at-time`, `v2-route-walkable` (error) updated or added, `v2-point-leg` dropped; `first-challenge-001.v2.json` marked as a historical redraw. `GLOSSARY.md`: **Pointing leg** removed; **Leg** and **Anchored item** updated. `tools/validate-content.mjs` untouched.
- Open question for the owner, written into the proposal: tier 1 guided tours walk on from one answer place to the next; under D23 does each of their legs also start again at the entrance?

### 2026-11-18, agent (Part B, stopped before voicing)
- The owner's AI answer is in `docs/content/prompts/draftv2.md`. Merged into `first-challenge-001.anchored.json` with `scripts/merge-redraft.mjs`: version 4, 12 cues, 24 events, map unchanged (checked against HEAD). The answer's questions had no ids: set `q1` to `q3`.
- `scripts/check-route.mjs`: PASS after one coordinate fix: `e13` moved from F's door point (265, 335) to the corridor point in front of it (290, 335); the AI's segment from (290, 492) cut diagonally to the door. Leg starts, words in their cues and in order, destinations on C, F and H, hints: all PASS. Validator: only cue times and audio length missing (expected before voicing).
- **Not voiced.** Talk problems for the owner (not fixed, per the handoff):
  1. Blocker: the speaker says "Your answer is C", "your answer is F", "Your answer is H" (c5, c8, c11). That gives every answer away. The drafting prompt never forbids it.
  2. Blocker: q2 is ambiguous. "The Craft Room is the next door after it" names no side. Walking north from the staff office (door y = 492), the very next door is E's (315, 467), on the right. E is defensible.
  3. q3: "the Table Tennis Room is the next door" after the café is wrong. The next door is the Store (265, 217), on the left. "directly north of the café" still makes H the only answer.
  4. q3's correction is about which side the café is on, and the café is labelled on the map, so missing the correction costs the learner nothing. It does not test `corrections-distractors`. The `e21` frame marks a corridor point, not a place.
  5. Smaller: c3 says "Starting again" on the first question; the q2 explanation says "on the left", which the talk never says; in the q3 Arabic both English quotes end a clause, which the prompt forbids.

### 2026-11-18, agent (Part B, finished)
- Owner: "adjust it as needed". The agent rewrote the talk on the AI draft's plan. Every question starts at the main entrance and walks. No answer letter is spoken. Q2 is "the next door on your left, directly north of the staff office". Q3's correction now changes the answer: "directly south of the café... oh, sorry, I mean north", then "You'll see its door on your right" (E if the correction is missed, H if heard). 12 cues, 21 events, 197 words. Built with a throwaway script in the session scratchpad; the item file is the record.
- Independent Layer 2 (fresh-context sub-agent): pass with fixes.
  - Applied: c11 no longer finds H by itself; a move at F's door; the q3 explanations no longer say she "said" E; q2 says E is "across the corridor".
  - Not applied: moving the correction `at` to the corridor. The replay no longer walks through correction events (prototype change); the frame marks E itself.
  - For the owner: room B's door (200, 585) opens into the staff office area, not onto a corridor, so an item that uses B as an answer could not be walked under D23.
- Voiced with D22 settings, `CAP` = c10. Results: 77.34 s, 153 wpm overall (163 during speech). Word times 21 of 21, PASS. Timing check on the decoded file: PASS. `check-route.mjs`: PASS. Validator with assets: OK.
- Prototype version 7 published to the same page with the new `first-challenge-001-anchored.mp4`. At 360 px in headless Chromium, every line point is on a corridor, a door or a letter; no script errors; no sideways scroll. Not checked inside the claude.ai viewer itself.
- Still open (ticket 02): the owner's listening check, the owner's own answer check, and a fluent reader for the Arabic.
