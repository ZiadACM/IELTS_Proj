# 10: Answer Replay and staff preview

**What to build:** In review, Answer Replay draws the authored route across the map in step with the audio the D27 way (amended 2026-11-19, see the comment) and highlights the transcript; authored distractor and correction moments are marked. The learner can play, pause, step between route events, jump to a question's part, and choose 0.75x or 1x. With reduced motion each piece appears whole at its time, a correction's wrong path appears dashed and stays, and the end summary is not animated (D27). Staff preview shows an item exactly as learners will, including Answer Replay.

**Blocked by:** 09 Review with explanations

**Status:** ready-for-human (built on `agent/answer-replay`; Impeccable critique and audit, verify-user-flow and code-review run 2026-11-22, P1 fixes in; owner questions open, see last comment)

Spec: `../spec.md`

- [x] Replay timing driven only by authored cue times; never generated
- [x] Step back and forward, jump to question, speed control all keyboard operable
- [x] Reduced-motion version conveys the full route and highlights transcript step by step
- [x] Staff preview is staff-only and matches the learner view
- [x] Replay timing logic built test-first from a worked example
- [x] D27 on v2 maps: each point appears whole at its `atSec` (never before); the place just named is lit, one at a time, until the next; a new leg starts unlit; a correction's `wrongPath` appears, holds 0.8 s, pulls back over 0.45 s (sine easing) and the walk waits; 0.8 s after the last destination all answers are framed and numbered

## Comments

### 2026-11-19, owner (via agent, map-v2-app split)
Decision: this ticket is amended to D27 instead of building a second replay (`.scratch/map-v2-app/issues/02-answer-replay-d27.md` is folded in here). Build 08, 09 and 10 in order with v2 maps in mind. D27 changed how the line is drawn and lit; it did not remove the controls listed above (play, pause, step, jump to question, speed), so they stay unless the owner says otherwise. Behaviour reference: prototype variant D and its checks (`check-replay.mjs` on `agent/map-format-v2-prototype`).

### 2026-11-22, owner decisions (asked in the session)
Built on `agent/answer-replay`, branched from `agent/review-explanations` (ticket 09, not merged to `main` yet).
1. **Audio for review and preview:** two new rows in the authorization matrix. ATT-06 stays as it is.
   - `ATT-10 GET /attempts/{attemptId}/review/audio`: the caller's own submitted attempt only, any mode (like ATT-09); admin denied.
   - `ADM-08 GET /admin/items/{itemId}/audio`: content staff only (`content_author`, `content_reviewer`), drafts included.
2. **Protected files:** the owner allows add-only edits under `tests/security/**` for these two rows: a recipe for each in `authorization-enforcement.test.mjs` and `cross-user-access.test.mjs`, and the two routes in `fixtures/fixture-server.mjs`. No existing check is loosened.
3. **Step back / forward:** moves the audio to the moment the previous or next point appears (its `atSec`) and pauses there. A correction counts as one step.
4. **Jump to a question:** seeks to the start of the cue that holds the leg's first event, and plays from there.
5. **Test seam:** a pure module `web/src/replay.ts`. `replayPlan(item)` gives the legs as timed steps; `replayAt(plan, t, reducedMotion)` gives what is on screen at time t. Expected values are read by hand from `first-challenge-001` v2 (`atSec` plus the D27 constants), and the prototype's checks (`check-replay.mjs`) become cases.
6. **XSS-03 and audio (owner, asked in the session):** XSS-03 accepted audio only from `examSingleUse` rows, so ADM-08 failed it. New matrix flag `servesAudio` on ATT-06, ATT-10 and ADM-08; XSS-03 accepts an audio reply only where it is set (nosniff still required everywhere). One-line change in the protected `tests/security/xss.test.mjs`, owner approved.
7. **Shape brief (approved):** one map in review, with a player strip under it:
   - the spoken sentence as a caption;
   - the authored note of a trap or correction, labelled, while it is the latest step;
   - Play/Pause, step back and forward, Q1 to Q3 jumps, 0.75x/1x;
   - a display-only progress line.

   The transcript marks the current line and does not auto-scroll. Before the first Play the map shows the selected question's marks; "Show marks" returns to them and rewinds. A `distractor` event gets the dashed "named by mistake" frame, puts the highlight out, and does not move the line. Staff preview: a "Preview, not saved" band, the learner's item screen (picks not saved), then the review with the correct letters only and the full Answer Replay.

### 2026-11-22: built and checked (agent)

**Built:**
- `web/src/replay.ts`: timing, test-first (`web/test/replay.test.ts`, hand values from `tools/fixtures/map-002-v2.valid.json`).
- Server routes: ATT-10, ADM-04, ADM-08 (tests first; server 139/139).
- `AnswerReplay.tsx` (the strip), `ReplayLayer.tsx` (the map drawing), and the changes to `Review.tsx`.
- `StaffPreview.tsx`, and a Preview button on the staff list.

**Browser** (`web/e2e/answer-replay.spec.ts`; phone Chromium, phone WebKit, desktop Chromium; 21/21; whole suite 67 passed, 2 skipped as before):
- Keyboard: play, step, jump, speed, Show marks.
- The correction and the summary.
- Reduced motion.
- The spoken transcript line, with no scroll.
- Audio failure, then retry.
- A question row picked while the replay plays stops it.
- The English interface.
- Staff preview of a draft (nothing saved).
- The real ATT-10 answers 206.

Headless Chromium can't decode AAC, so only the recording's bytes are replaced with a silent WAV of the same length.

**Impeccable:**
- Detector clean.
- Overlay not run (the CSP blocks it, as in ticket 09).
- Critique P1 fixes:
  - the controls sit above the caption, so nothing jumps under the thumb;
  - the sentence and note are read out when paused;
  - focus goes to Play after Show marks;
  - only the current start ring is shown, so numbers no longer overprint;
  - the route is drawn under the map's names;
  - colours come from tokens.

**Code review:**
- Fixed: a picked question row now stops and rewinds the replay (the test failed on the old code first); shared types.
- Question order needs no change: the validator's `question-order` rule makes questions follow the route.

**Live security** (`security-live.txt`, ids redacted):
- ATT-10, ADM-04 and ADM-08 answer 401 without a session.
- Every failing suite stops at the exam start (501, ticket 13), retention (501, ticket 17), or routes not built yet (404). This is the same picture as ticket 09.

**Open for the owner:**
1. RTL step icons are mirrored, but the Play triangle is not.
2. Faded earlier legs are low contrast.
3. The XSS-03 line changed from `examSingleUse` to `servesAudio`.
4. The preview's item screen has no reading-time countdown or audio strip.

**NOT VERIFIED:**
- the Arabic strings (a fluent reader is needed);
- a screen reader;
- real playback on a phone;
- an axe scan (no axe in the repo);
- CI;
- the exam half of the security suites (ticket 13).

Evidence: `docs/testing/evidence/answer-replay/2026-11-22/`.
