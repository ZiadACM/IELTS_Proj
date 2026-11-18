# Handoff: map format v2, replay fixes and the redrafted first challenge (2026-11-18)

Ticket: `.scratch/map-format-v2/issues/03-replay-walks-from-entrances.md`. Read `docs/development/agent-rules.md` first, as always.

Run `git status` first: this handoff, ticket 03, D23, the redraft prompt and `scripts/` may still be uncommitted on `agent/map-format-v2`. Ask the owner before committing them; do not switch branches with uncommitted changes you have not looked at.

## Where things stand

- **Map format v2** (proposal `docs/content/map-format-v2.md`): maps are real drawings (rooms, corridors, entrances, symbols, a north arrow, square letter boxes). Background: `docs/content/map-reference-guide.md`, written from real IELTS maps and transcripts that stay local and gitignored (`docs/content/images/`, `docs/content/transcripts/`). Never open those to copy from them, and never commit them.
- **Owner decisions** in `docs/product/owner-decisions.md`:
  - **D21**: tiers 2 and 3 use anchored items (real-exam style), and there is one **leg** per question.
  - **D22**: maps are measured at 326 px, fit the screen width, may be portrait, and use a north arrow; Kokoro speed is 0.70.
  - **D23**: this handoff's reason. It replaces part of D21.
- **Prototype** (throwaway): branch `agent/map-format-v2-prototype`, folder `.scratch/map-format-v2/prototype/`. It is a template plus `build-prototype.mjs`, which inlines the item files. The live page is https://claude.ai/artifact/Sf2i7Uv2rCZVGKYUPKhgM3 (private, the owner's). Variants: A is v2 fit width, B zoom, C v1 today, and D the anchored first-challenge draft, with its audio published beside the page as `first-challenge-001-anchored.mp4`.
- **Drafts** (branch `agent/map-format-v2`, folder `.scratch/map-format-v2/`):
  - `first-challenge-001.v2.json` is the old recording redrawn on the v2 map.
  - `first-challenge-001.anchored.json` is the current anchored draft, version 3. It has its audio in `audio/`.
  - Helper scripts are in `scripts/`; see `scripts/README.md`.
  - The live item `docs/content/items/first-challenge-001.json` is unchanged and must stay so.

## What the owner said (prototype version 6, variant D)

1. The line from the main entrance is fine. The dashed pointing lines (from the staff office to F, and from the café to H) are not: they cut through walls and rooms.
2. The line is drawn before the words. For "go straight up the main hall to the noticeboard", the line reaches the noticeboard as the sentence starts. It should only get there after "to the noticeboard" has been said. The same happens throughout.
3. A leg must never start at a room. It starts at an entrance. This building has one (the main entrance), so every leg starts there. A map with several gates (for example a park with a north gate and a south gate) may start legs at different gates.
4. The owner is having an external AI redraft the talk with `docs/content/prompts/redraft-first-challenge-anchored.md`, and will bring its answer back.

## Part A: do now

1. **Prototype replay.** Bring the prototype branch up to date first (`git switch agent/map-format-v2-prototype && git merge agent/map-format-v2`). Then:
   - Draw walked legs only. Remove the pointing-leg drawing, `how: "point"` handling and the "Example pointing leg" button with its note.
   - Draw an event only once `audio.currentTime >= event.atSec`. Fall back to its cue's `end` when `atSec` is missing, never its `start`. Keep "Show whole route" and the per-question ▶ buttons.
2. **Word times.** Extend `scripts/render.py` so each event gets `atSec`: the time in the final audio at which its `word` phrase ends.
   - Kokoro's English pipeline may return per-token timestamps. Check this; I have NOT VERIFIED it.
   - The script trims and caps pauses, so map raw times through those cuts.
   - Write `atSec` into the item. Check that each one falls inside its cue's start and end and that they never go down.
   - If word times turn out to be impossible, say so and stop at the cue-end fallback.
3. **Docs** (D23):
   - In `map-format-v2.md`, rewrite "Route legs": every leg starts at an entrance, which is a landmark linked to an entrance; `fromAnswer` and pointing legs are gone; events carry `word` and `atSec`.
   - Update the rules: `v2-leg-start` (the anchor is an entrance), `v2-word` (the word is in its cue, in event order), `v2-at-time` (`atSec` is inside its cue and never goes down), `v2-route-walkable` (now an error: every segment stays on corridors and doors). Drop `v2-point-leg`.
   - In `GLOSSARY.md`, remove **Pointing leg**, and update **Leg** and **Anchored item** so each question starts again at an entrance.
   - Add a line to the v2 proposal saying `first-challenge-001.v2.json` is a historical redraw of the old recording and does not follow D23.
   - Do not touch `tools/validate-content.mjs` or its tests and fixtures. They are protected files, and the v2 checker is a later ticket that needs the owner's approval.

## Part B: when the owner brings the AI's answer

1. Take only its `transcript`, `events` and `questions`. Merge them into `first-challenge-001.anchored.json`: keep the map and the other fields, bump `version`, and recompute `difficulty` the same way `scripts/make-anchored.mjs` does.
2. Before voicing, check the draft yourself:
   - every `at` lies on a corridor line, at a door point or at a letter point (the tables are in the prompt);
   - every leg starts at the main entrance;
   - every `word` appears in its cue, in event order;
   - every destination is exactly on its letter;
   - the hint rules hold.
   If anything fails, list it for the owner rather than silently fixing the talk. A small coordinate slip may be fixed; say which.
3. Voice and time it (`scripts/README.md`), with the D22 settings. Set `CAP` in `render.py` to the self-correction's cue id. Then run the timing check, the pace (must be 140 to 160 words per minute overall), and `node tools/validate-content.mjs .scratch/map-format-v2/first-challenge-001.anchored.json --assets .scratch/map-format-v2`.
4. Run `validate-ielts-content` Layer 2 in a **fresh-context sub-agent**, because the item was drafted elsewhere and you prepared it. Apply its fixes; re-voice if the talk changes.
5. Rebuild the prototype. Before you publish, read the page with the Artifact tool's `read` action at its URL; a new session must do that. Then publish to the same URL with the new audio file. Check it at 360 px: no script errors, and lines on corridors only.
6. Record everything in ticket 03's Comments. Keep ticket 02's open items (the owner's listening, the answer check and the Arabic reader) open.

## Rules for this work

- Branches: docs, drafts and scripts go on `agent/map-format-v2`; the prototype on `agent/map-format-v2-prototype`. Commit only when the owner asks. Never push or merge to `main`.
- Report anything you did not run as NOT VERIFIED. You cannot listen to audio, so the owner does the listening check.
- The owner's short review notes sometimes describe rather than request. Ask before reworking anything not listed here.
- End with the completion report from `agent-rules.md` section 4.
