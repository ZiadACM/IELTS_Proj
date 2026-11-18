# 08: Guided practice: answer and submit

**What to build:** In guided practice the learner answers each question by tapping a letter on the map or choosing it from a list, changes answers, has them saved as they go, and submits; the server scores the attempt.

**Blocked by:** 07 Browse and player shell

**Status:** ready-for-human (built on `agent/answer-submit`; owner reviews; code-review and Impeccable critique/audit not yet run)

Spec: `../spec.md`

- [x] Answer by map tap and by keyboard-operable list; both store the same answer
- [x] Answers saved to the server as they change; unsaved state shown when offline and re-sent
- [x] Submit scores on the server; client-sent scores are ignored
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
