# 08: Guided practice: answer and submit

**What to build:** In guided practice the learner answers each question by tapping a letter on the map or choosing it from a list, changes answers, has them saved as they go, and submits; the server scores the attempt.

**Blocked by:** 07 Browse and player shell

**Status:** ready-for-human (built on `agent/answer-submit`; code-review and Impeccable critique/audit run 2026-11-19, fixes in; owner decisions answered 2026-11-19 and built, see last comment)

Spec: `../spec.md`

- [x] Answer by map tap and by keyboard-operable list; both store the same answer
- [x] Answers saved to the server as they change; unsaved state shown when offline and re-sent
- [x] Submit scores on the server; client-sent scores are refused (400) and only the server's score is stored (wording changed by the owner, 2026-11-19)
- [ ] Attempt fields follow the harness contract; cross-user access cases pass for attempts

## Comments

### 2026-11-19, agent
Built on `agent/answer-submit` (from `main` after PR #20).
- **Server** (`server/src/attempts/routes.ts`):
  - `PUT /attempts/{id}/answers {answers}` (ATT-04): the body is the whole answer set, so changing or clearing an answer is a new save, and re-sending after a lost connection does no harm. Each key must be a question of the item and each value one of its map letters; anything else gives 400 and changes nothing. Only the owner's open attempt; submitted gives 409; admin 403.
  - `POST /attempts/{id}/submit {}` (ATT-05): any field in the body gives 400. The score is the number of saved answers that match the item's answer letter, computed on the server. A second submit gives 409.
  - The attempt now has `score` only once submitted, as the harness contract says ("score (after submit)"). Ticket 07's test expected `score: null` on an open attempt and was changed to match. AUTHZ-07 checks `score !== undefined`.
- **Web**:
  - The question list has a number button per question, which picks the question a map tap answers, and a native letter list (`select`), which is the keyboard and screen reader path.
  - A tap picks the nearest letter within 22 px (a 44 px target unless two letters are closer), marks it chosen (inverted box), and moves on to the next unanswered question.
  - `web/src/saved-answers.ts` saves every change, one request at a time. An unsent change is kept in `localStorage` for that attempt (deleted once saved) and re-sent every 5 s, when the browser is back online, and before submit. The save line warns (`role=alert`) only when answers are not saved.
  - After submit: "Answers submitted. You got N of M right.", the audio is removed, and answers are read-only. Review is ticket 09.
  - Browser test helpers moved to `web/e2e/helpers.ts`.
- **Tests first** (HTTP seam 1, as the spec's Testing Decisions name it; expected scores from the fixture's answer key q1 C, q2 E, q3 B): 10 new cases plus the changed ticket 07 case, seen failing (11 fail), then green. Fastify's validator turned `["A"]` into `"A"`, so the value check moved into the handler.
- **Ran:**
  - `npm test` 128/128; type check clean; lint 4 warnings (all from before this change); `npm run build` OK.
  - `npx playwright test` against a local test instance (port 3100, random token): 28 passed, 2 skipped (the 360 px map test runs on one project only). This includes the new `web/e2e/answer-submit.spec.ts`: map tap, keyboard list, change, offline save and re-send, forged score refused (400), submit offline then online, no sideways scroll, number button at least 44 px wide.
  - Evidence and screenshots: `docs/testing/evidence/answer-submit/2026-11-19/`.
- **Live security suites** (same instance; logs in the evidence folder, ids redacted):
  - pass: AUTHZ-03 (another user's attempt ids), AUTHZ-04, AUTHZ-08 (the server computes the score), LEAK-02, LEAK-05, LEAK-06.
  - Every other failure stops at a later ticket: exam start 501 (ticket 13: LEAK-03, -04, -07, -08, all EXAM, AUTHZ-06); missing review, hints, replays, progress, reports and delete routes giving 404 instead of 401 (AUTHZ-05: tickets 09 to 17); and `GET /__test__/users` 501 (ticket 17), which stops AUTHZ-07 before its ATT-04 and ATT-05 checks.
  - So the last box stays open. The attempt fields follow the contract, but the cross-user cases for attempts can only fully run once ticket 13 exists.
- **NOT VERIFIED:**
  - the `code-review` skill and Impeccable `critique`/`audit` (CS 4.8);
  - an axe scan (no axe in the repo);
  - a real phone;
  - screen reader behaviour of the number buttons and the list (only the accessible names were checked);
  - the Arabic strings need a fluent reader (CS 3.5);
  - CI (not pushed).

### 2026-11-19, agent (code-review, Impeccable critique and audit, fixes)
- **code-review** (standards + spec) found that failed saves were handled wrongly: a 400 was re-sent every 5 s forever; after a 409 or 404 the screen still said "we will try again"; a submit after a 409 said "Try again", which could never work.
  - Fixed: `api.ts` maps any other 4xx to `rejected`. `saved-answers.ts` retries only when offline, on a 5xx or on a 429. When the attempt is closed (409, 404, 403) or the answers are refused (400), saving stops, the unsent copy is cleared from the device, answering and submit are locked, and the status strip names the problem and offers "Back to maps" (new strings `saveClosed` and `saveRejected`, English and Arabic). A submit refused because the attempt was already submitted says so.
- Other code-review fixes:
  - **CS 2.6:** sign-out clears unsent answers from the device (`forgetUnsavedAnswers`).
  - **Server:** save and submit share `openAttemptWithContent` (404/409 checks in one place). `answerKeyOf` is renamed `itemContentOf` and returns 404 instead of crashing when the item row is missing.
  - **Player:** the score line is built once.
- **Impeccable critique** (dual-agent): 24/40.
  - **Detector:** 0 findings.
  - **Overlay:** blocked by the app's CSP (`script-src 'self'`). With the CSP bypassed it reported "No anti-patterns found".
- **Impeccable audit:** 16/20.
- **Impeccable fixes made:**
  - After a refused save, the reading countdown and audio stop and the media keys are released (they kept running before).
  - The failed-save line now uses the error colour; a CSS cascade had turned it grey.
  - The active question row no longer uses saffron (saffron is for time only, as the surface brief says).
  - The disabled number buttons after submit now read as printed numbers.
- **Ran:**
  - type check clean;
  - lint 4 warnings (from before this change);
  - build OK;
  - `npm test` 128/128;
  - `npx playwright test` against a local test instance: 37 passed, 2 skipped. This includes 3 new tests (save refused with 409, save refused with 400, submit after the attempt was already submitted), seen failing on the previous code (3 failed) and passing after the fix.
  - Log: `docs/testing/evidence/answer-submit/2026-11-19/playwright-run-save-fix.txt`. Screenshots: `refused-*`; the other screenshots were re-taken.
- **NOT VERIFIED:**
  - sign-out clearing in a browser (no browser test signs out of an account);
  - the new Arabic strings, which need a fluent reader (CS 3.5);
  - a screen reader;
  - a real phone;
  - CI.
- **Owner decisions open** (not changed):
  1. Submit is allowed during reading time and the first listen, and stops the audio. The critique rates this P0: one stray tap scores the attempt.
  2. "You got N of M right" is shown at submit, while spec story 31 puts the score in Review (ticket 09). The critique also notes the green tick next to a low score.
  3. The ticket says client-sent scores are "ignored", but the server refuses them (400). Should the checkbox wording change?
  4. Unsent answers on one device overwrite newer ones saved on another (story 28).
- **Left as is:** `deadline: null` on guided attempts comes from ticket 07, not this diff. The contract says "exam only".
- **Still open from critique:**
  - Answers already given are not shown on the map; only the active question's letter is (suggested `/impeccable shape`).
  - The submit area stacks three grey lines.

### 2026-11-19, owner decisions (answered in the session) and agent
- **1. Submit after the first listen.** Submit appears only when the first listen has ended. Until then the submit area says "You can submit once the first listen ends." (new string `submitAfterListen`, English and Arabic).
  - Known edge: if the audio never loads, the learner cannot submit. They see the audio error with its retry, and "Back to maps".
- **2. No score at submit.** The submit screen says only "Answers submitted." and the review-later note. The score waits for Review (spec story 31, ticket 09). It is still computed and stored on the server. The `scoreOf` string is removed.
- **3. Wording.** The checkbox now says client-sent scores are refused. No code change.
- **4. Two devices.** Left for ticket 12, where it is recorded.
- **Tests:**
  - Browser tests now finish the first listen before submitting (`finishFirstListen`: it starts the audio and marks it ended), and they check that Submit is hidden before then.
  - Score checks read the stored attempt, not the screen.
- **Ran:**
  - type check clean;
  - lint 4 warnings (from before this change);
  - build OK;
  - `npx playwright test`: 37 passed, 2 skipped (log `playwright-run-owner-decisions.txt`). Screenshots re-taken.
- **NOT VERIFIED:**
  - the new Arabic string, which needs a fluent reader;
  - the server tests, which did not change and were not re-run for this commit;
  - CI.
