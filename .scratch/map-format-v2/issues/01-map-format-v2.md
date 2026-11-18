# 01: Content format v2 for maps (proposal, reference guide, first redraw, phone prototype)

**What to build:** Content authors can describe a map as a real drawing (paths, areas, rooms, symbols, a compass, entrances and square letter boxes) instead of dots on blank paper. This ticket covers the research and proposal, the first worked example, and a throwaway phone prototype. It does **not** change the validator, the player or any published item.

**Blocked by:** None

**Status:** ready-for-human (owner review of the proposal and the prototype)

## Scope

- [x] Reference guide in our own words, from the 17 local reference images (never committed): `docs/content/map-reference-guide.md`
- [x] Format v2 proposal: `docs/content/map-format-v2.md`
- [x] first-challenge-001 redrawn in v2 with the same recording, route order and answers: `.scratch/map-format-v2/first-challenge-001.v2.json` (status `draft`)
- [x] Throwaway phone prototype with three variants (v2 fit width, v2 zoom and pan, v1 today), Answer Replay preview in step with the recording: `.scratch/map-format-v2/prototype/` (live link in Comments)
- [x] Owner answers the open questions in the proposal (D22)
- [ ] Owner content review of the redraw (`validate-ielts-content` human checks)

## Follow-up tickets (after owner approval)

- 02: validator support for v2 (protected file: needs the owner's approval in that ticket before any edit), with a failing fixture for each new code.
- 03: player draws v2 maps (`web/src/ItemMap.tsx`), with `verify-user-flow` on phone, desktop and RTL.
- 04: replace the published first-challenge-001 with the reviewed v2 version.
- Update `docs/content/prompts/draft-map-item.md` for format 2, anchored items and legs (it still describes a 1000 x 700 map with points only; found by the ticket 02 review).

## Content Validation

- The current validator accepts the v2 file: `node tools/validate-content.mjs .scratch/map-format-v2/first-challenge-001.v2.json` gives OK. This proves the v1 fields are consistent, not the new drawing (no v2 checks exist yet).
- A script compared v1 and v2: the transcript, questions and audio are identical, and the v1 events keep their ids, kinds, cues and order (4 corner `move` points added).
- NOT VERIFIED: the human content checks (is the drawing unambiguous, does every spoken direction match it). These need the owner.

## Comments

### 2026-11-18, agent
- Prototype: https://claude.ai/artifact/Sf2i7Uv2rCZVGKYUPKhgM3 (private to the owner). Flip variants with the bottom bar. Play draws the route as the recording plays; "Show answers" rings C, F and H.
- Finding: inside the player's card the map is about 306 px wide on a 360 px phone, not the 326 px the `target-spacing` rule assumes. At 306 px, the Reception and Meeting room labels miss the 4 px padding by 1 to 2 px. The prototype shows this in its state panel. Owner question 1 in the proposal.
- The prototype is throwaway. It is not committed yet; per the `prototype` skill, it belongs on a throwaway branch, not main.

### 2026-11-18, owner
"the audio keeps on going from the last location ... with the real ielts doesnt do that it starts over from either the main enterance for this example or start from another point." Approved the leg fix; real transcripts to follow (local reference only, same rules as the map images).

### 2026-11-18, agent
- Route legs added to the proposal (section "Route legs", rule `v2-leg-start`). e8 now starts leg 2 at the noticeboard (`landmarkId`, `startsLeg`); the corner point that drew the walk back from C was removed. Recording, cue times and answers unchanged.
- Prototype republished: earlier legs fade, the current leg is bold with a numbered start ring.
- Ran: validator on the v2 item gives OK; the transcript, questions and audio are identical to v1, and the v1 event ids, kinds and cues are kept; Playwright screenshot at 360 px with playback at 55 s shows leg 2 starting at the noticeboard, no script errors.
- Open: whether a restart from the main entrance (new script and audio) is wanted waits for the owner's real transcripts.

### 2026-11-18, agent
- Read the owner's transcripts for 5 reference maps (`docs/content/images/context.md`, gitignored). Patterns added to the reference guide, section 6, in our own words.
- Finding: none of the 27 questions continues from the previous answer place. Each is re-anchored (start point, named landmark, compass zone or path feature), and only about 4 are walks. This conflicts with the glossary's **Guided tour item** (one route passing each answer place in order). Owner decision needed: see the questions in the agent's reply of this date.
- Proposal updated: one leg per question as the norm; `"how": "point"` legs for located-by-description questions.

### 2026-11-18, owner
"go with real-exam style for tier 2 and 3, add pointing legs ... make it so that the line starts over again and follows the next question". Recorded as D21 (`docs/product/owner-decisions.md`), new glossary terms (**Anchored item**, **Leg**, **Pointing leg**; **Guided tour item** now tier 1 only) and a spec amendment (content set, first challenge).

### 2026-11-18, agent
- Proposal: one leg per question; leg anchors (`landmarkId`, or `fromAnswer` for tier 1 only); pointing legs (`how: "point"`); four new rule codes.
- Item: three legs. m4 starts leg 3 at the Craft Room (`fromAnswer: "q2"`). Validator on the v2 item: OK.
- Prototype republished (version 3): the line starts over at each question, earlier legs fade, the current question is bold in the list, ▶ replays one question's leg, and "Example pointing leg" shows a dashed arrow (an invented example, not in the recording).
- Ran: Playwright at 360 px with playback at 70 s and the example on: leg 3 starts at the Craft Room, the pointer draws, no script errors.
- Open: first-challenge-001 must be rewritten as an anchored item to meet D21 (new script and synthetic audio, then owner content review).

### 2026-11-18, owner
Answers (D22): measure against the real phone width; fit the map to the screen width; allow portrait maps; a north arrow everywhere. Re-record the anchored draft at speed 0.70. Commit, with the prototype on its own branch.

### 2026-11-18, agent
- **Correction:** the earlier comment said the map is about 306 px wide inside the player's card. That was measured in the prototype's own card, not in the app. The app's `.map-frame` (`web/src/app.css`) sits 16 px from each edge with a 1 px border, so the map is **326 px** on a 360 px phone, the width the `target-spacing` rule already uses. The owner's choice, "the real width", is therefore 326 px (D22). The prototype's map frame now matches the app.
- Map adjusted anyway, which keeps more margin: the main hall moved 10 units west; Meeting room and Reception are wider (220) and Meeting room taller; D and C are 128 units apart. Both drafts regenerated; validator OK on both. Prototype at 360 px in Playwright (310 px map, because the test browser shows a scrollbar): 8 of 8 labels fit at 11 px in variants A and D.
