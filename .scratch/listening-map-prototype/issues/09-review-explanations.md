# 09: Review with explanations

**What to build:** After submitting, the learner sees the score, per question their letter and the correct letter (both marked on the map, not by colour alone), the transcript, the English explanation, and can open the Arabic explanation.

**Blocked by:** 08 Guided practice: answer and submit

**Status:** ready-for-human (built on `agent/review-explanations`; code-review, Impeccable critique and audit run 2026-11-19, P1 fixes in; see last comment)

Spec: `../spec.md`

- [x] Review is available only for the learner's own submitted attempt (D6)
- [x] Learner and correct letters distinguished by more than colour
- [x] Transcript and explanations shown in review only; Arabic explanation is right-to-left, English content left-to-right
- [ ] Review cases in the security suites pass
- [x] English text inside an Arabic explanation is isolated (`<bdi>` / `unicode-bidi: isolate`), see the 2026-11-18 comment

## Comments

### 2026-11-18, agent (owner request: English inside Arabic)
The Arabic explanations quote the exact English words heard in the audio (e.g. «at the far end»), and use map letters (A to H). Without isolation, the bidirectional algorithm can move neighbouring punctuation and reorder words around these runs. Requirement for this ticket: the review screen must **isolate every English run inside Arabic text**, with `<bdi dir="ltr" lang="en">…</bdi>` or an element with `unicode-bidi: isolate; direction: ltr`. Added as an acceptance check above; test it with q1 to q3 of `first-challenge-001` in `verify-user-flow` (RTL row). The writing rule that keeps these runs short and mid-sentence is in `docs/content/prompts/draft-map-item.md`.

### 2026-11-19, agent (built)
Built on `agent/review-explanations`. It branches from `agent/answer-submit` at e677cda (ticket 08 owner decisions), which is not merged to `main` yet.

**Owner decisions (asked in the session):**
1. After submit, the screen keeps "Answers submitted" and adds a **See your review** button, which opens the review in place.
2. The map marks **one question at a time**:
   - the learner's letter has a dashed frame and a "Yours" tag;
   - the correct letter has a solid teal frame and a tick;
   - if the learner was right, one letter carries both;
   - with no answer, only the correct letter is marked.
3. Test seam: `bidiRuns` in `web/src/bidi.ts`, a pure split into English and other runs, written test-first. The expected runs were read by hand from the q1 to q3 Arabic of `first-challenge-001`.
4. The shape brief was approved (summary: score "N of M right"; rows with words and drawn marks; English explanation plus "Read in Arabic"; full transcript with the answer line tagged "Q1"; loading, failed and offline states; no red).

**Server** (`GET /attempts/{id}/review`, ATT-09):
- Only the owner's submitted attempt. An open attempt gets 409 `attempt_open` with no answer data. Another user's attempt or an unknown id gets 404, anonymous 401, admin 403.
- The reply holds `attemptId`, `itemId`, `mode`, `score`, and `questions[]`. Each question has `id`, `cueId` (the transcript line where its answer is named), `prompt`, `yourAnswer`, `correctAnswer`, `correct` and `explanation {en, ar}`. Then `route` (the authored events, for ticket 10) and `transcript`.
- Tests first (red seen on the first 3 cases); the `cueId` field was added to test and route together.

**Web:**
- `Review.tsx` and the review marks in `ItemMap.tsx` work for v1 and v2 maps.
- The tag and tick go on the first side or corner that covers no landmark name and no letter. Placement is read from the boxes the browser drew.
- The Arabic explanation is `dir="rtl" lang="ar"`, and each English run is in `<bdi dir="ltr" lang="en">`.
- The transcript is `dir="ltr" lang="en"`.
- On a phone, "See it on the map" brings the map back into view.
- Root `npm test` now also runs `web/test/` (node --test).

**code-review** (standards and spec):
- No hard violations.
- Fixed:
  - the hidden Arabic note in the English transcript now has `lang`;
  - the transcript tag follows the selected question's cue, so two answers named in one line both work;
  - the tag box is sized by measured text, so Arabic fits;
  - `text-align: left` became `start`.
- Kept:
  - `route` in the reply: the spec and LEAK-08 require it.
  - The Arabic toggle stays open across questions. A learner who wants Arabic wants it for each question. Owner, say if not.

**Impeccable:**
- Critique: dual sub-agent, 26/36, saved to `.impeccable/critique/`. Two P1s, both fixed:
  1. On a phone, the map changed out of view. Fixed with "See it on the map".
  2. The tag and tick hid "Noticeboard" and "Corridor junction". Fixed with free-side placement. The browser test asserts no overlap; it failed on the old code and passes now.
- Detector: 0 findings. Overlay: blocked by the CSP; with the CSP bypassed, only stragglers in the transcript text.
- Audit: 17/20 (a11y 3, performance 4, theming 3, responsive 4, integrity 3). It is recorded here because `audit-storage` is not in this launcher version.
- Still open (P2/P3):
  - no jump from an explanation to its transcript line;
  - the end of the review has no next step (Answer Replay comes in ticket 10);
  - the map change is not announced to screen readers (the row text carries the same letters);
  - the offline line is loud (style shared with ticket 08).

**Ran:**
- `npm test`: server 131/131, web 4/4.
- Type check clean; lint 4 warnings (from before this change); build OK.
- Impeccable detect: `[]`.
- `npx playwright test` against a local test instance (port 3100, random token): 46 passed, 2 skipped (same 2 as before). The new `web/e2e/review.spec.ts` has 3 tests × 3 projects (phone Chromium 390 px, phone WebKit, desktop 1440 px), checking:
  - score, verdicts, map marks and the map's accessible name;
  - Arabic `bdi` runs for q1 to q3;
  - the transcript tag;
  - no sideways scroll;
  - the keyboard;
  - offline then retry;
  - the English interface.
- Evidence: `docs/testing/evidence/review-explanations/2026-11-19/`. The ticket 08 `submitted-*` screenshots were re-taken (they now show the button).

**Security suites** (same instance; logs in the evidence folder, ids redacted):
- LEAK-06 passes (guessed review URLs are 404).
- ATT-09 has left the AUTHZ-05 list.
- LEAK-04 and LEAK-08 run guided and then exam, and report only at the end, so the exam start (501, ticket 13) hides their guided result. I ran their guided half separately with the suite's own helpers, without editing the protected tests (`sec-leak-guided-half.txt`): no problems.
- The last box stays open until ticket 13 lets the exam half run.

**NOT VERIFIED:**
- the Arabic strings (CS 3.5: a fluent reader is needed, including "1 صحيحة من 3");
- a screen reader;
- a real phone;
- the overlay under the real CSP;
- CI (not pushed).

**Not in this ticket:** a way back to a past review after leaving the screen (the endpoint exists; no screen links to it yet). Suggest ticket 12 (resume and repeat) or 15 (progress) owns it.

### 2026-11-20, owner decisions (agent built)
- **Arabic toggle:** stays open across questions, as built (owner).
- **Way back to a past review:** ticket 12 owns it; a line was added there (owner).
- **Show in the transcript (built):** the open explanation has a button that scrolls to the line where that answer is named and moves focus there (reduced motion: no animation).
- **End of review (built):** the review ends with "That is the whole review. Choose another map to keep practising." and one Back to maps button; the quiet back link is hidden while reviewing, so it is not repeated. Answer Replay (ticket 10) adds the next step later.
- **e677cda:** it is an ancestor of this branch, so merging `agent/review-explanations` brings it in; no separate merge is needed.
- **Ran:** `npm test` server 131/131, web 4/4; type check clean; lint 4 warnings from before; build OK; `npx playwright test` 46 passed, 2 skipped (`playwright-run-owner-decisions.txt`); review tests run 3 times in a row (all passed after a fix: the first test now waits for Browse after Back, so its pending maps request does not spill into the next test). New screenshots: `review-end-*.png`.
- **NOT VERIFIED:** the two new Arabic strings ("اعرضه في نص التسجيل", "انتهت المراجعة. اختر خريطة أخرى لتواصل التدرّب."), plus everything listed above.
