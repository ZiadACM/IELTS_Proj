# Security test baseline (2026-11-12)

Branch `agent/security-tests`. Written by an agent; this is **not** a security sign-off (D15, `pre-launch-review.md`). Stack: `docs/adr/0001-stack.md`. Case ids: `docs/security/test-plan.md`.

## Covered

| Area | Cases | Evidence |
|---|---|---|
| Answer-key leakage | LEAK-02 to LEAK-08 | `answer-key-leakage.test.mjs`; canaries plus structural keys plus question-to-target pairs; LEAK-08 is the positive control |
| Exam mode, sent directly to the API | EXAM-02 to EXAM-07 (D9 one forward-only audio grant, D10 one open attempt and `seenBefore`) | `exam-mode.test.mjs`; every refusal has a guided-mode positive control |
| Cross-user and anonymous access, mass assignment | AUTHZ-03 to AUTHZ-08 (learner and learner, guest and guest, guest and learner both ways) | `cross-user-access.test.mjs`, `authorization-enforcement.test.mjs` (174 cells: every role on every endpoint, plus each decision's condition) |
| XSS and headers | XSS-01 to XSS-03 (API level) | `xss.test.mjs` |
| Guest-session abuse | SESS-08 (rate limit and D11 retention), SESS-09 (upgrade hijack, old session) | `auth.test.mjs` |
| Coverage gate | AUTHZ-02 | Fastify adapter `adapters/discover-endpoints.mjs` (fails closed) with 8 unit tests |
| CI | SECRET-01, DEP-01, XSS-04, INPUT-02 (SAST), CI-01, CI-02 | `.github/workflows/security.yml`, `.github/CODEOWNERS`, `tools/check-protected-files.mjs` with 4 tests |

**Proof the live suites work** (`node --test tests/security/fixture-proof.test.mjs`, 13 of 13 pass, about 32 s):
1. Each of the 6 suites passes against the SYNTHETIC safe fixture with nothing skipped.
2. Each suite fails every one of its tests against the vulnerable fixture.
3. Each of the 24 vulnerabilities, switched on **alone**, fails the test with the same case id.
4. Mutation check: when the EXAM-02 vulnerability was disabled in a scratch copy, the proof failed ("EXAM-02: with only this vulnerability on, its test passed").

First failure line per test against the vulnerable fixture:

| Case | Failure (vulnerable fixture) |
|---|---|
| LEAK-02 | forbidden key `$.questions[0].answerLabel` in `GET /items/{id}` |
| LEAK-03 | same delivery leak (alone: transcript in exam attempt state) |
| LEAK-04 | `ATT-09` before submit: expected 403/404/409, got 200 |
| LEAK-05 | canary in `/assets/app.js` |
| LEAK-06 | attempt id `"1005"` is not a UUIDv4 or a random token of 21 or more characters |
| LEAK-07 | alone: `CANARY-EXPLANATION` quoted in a 400 error from `PUT .../answers` |
| LEAK-08 | transcript missing from review |
| EXAM-02 / EXAM-03 | `ATT-07` / `ATT-08` in exam: expected 403/409, got 201 |
| EXAM-04 | second full audio request: got 200 audio/mpeg |
| EXAM-05 | client deadline honoured (moved forward one year) |
| EXAM-06 | PATCH mode returned 200 |
| EXAM-07 | 2 parallel exam attempts created (expected exactly 1) |
| AUTHZ-03 | `learner-b` read `learner-a`'s attempt: got 200 |
| AUTHZ-04 | victim settings returned through `?userId=` |
| AUTHZ-05 | `GET /attempts/{id}` with no session: got 200 |
| AUTHZ-06 | anonymous on `ATT-03` (deny): got 200 |
| AUTHZ-07 | learner gained a staff role through settings |
| AUTHZ-08 | `PUT /me/progress` returned 200 |
| XSS-01 / XSS-02 | staff preview and reports served as `text/html` |
| XSS-03 | 401 response without `nosniff` |
| SESS-08 | 30 guest sessions from one client, no 429 |
| SESS-09 | upgraded account lost the guest's own attempt (it adopted the other guest's) |

## Changes to existing protected files
- **`tests/security/authorization-matrix.test.mjs`** (bug fix, authorised in the task). The coverage gate treated the *presence of the adapter* as *application code*. Adding the adapter before any app existed made it fail with `AssertionError [ERR_ASSERTION]: adapter found no endpoints; a broken adapter must not pass silently`.
  - Fix: with no app directories, the adapter still runs and anything it finds is checked against the matrix. Only an empty result is reported as NOT VERIFIED.
  - With app code present, the behaviour is unchanged, so the test is not weaker.
  - Verified: with a synthetic `server/src/r.ts` registering `GET /debug/vars`, the gate fails. The temporary directory was removed afterwards.
- No other existing protected file was changed.

## NOT VERIFIED (and why)
- **Every live case against the real app.** There is no app yet; all 24 are skipped as NOT VERIFIED (`SECURITY_BASE_URL` unset). The fixture proves the tests, not the app.
- **Browser rendering for XSS-01 and XSS-02.** There is no UI or browser runner. Playwright is added with the first UI ticket.
- **LEAK-05 canary part.** It is only meaningful for a bundle built with content included; the test reports this as a diagnostic.
- **The workflow on GitHub.** Agents never push. Locally:
  - actionlint 1.7.12: exit 0;
  - gitleaks 8.30.1: no leaks in the full history or the working tree, and a planted synthetic token was detected (exit 1);
  - osv-scanner 2.7.1: exit 128 ("No package sources found"), which the workflow reports as NOT VERIFIED;
  - Semgrep and zizmor were **not run**: the Docker daemon was not running, and zizmor was not installed locally;
  - the Semgrep rule self-test (`.semgrep/security.ts`, `.tsx`) has never run.
- **The protected-files check in CI.** The logic and CLI were run locally. Against this branch it reports FAIL (exit 1), which is correct: this branch changes `tests/security/**` and needs owner approval.
- **Semgrep image digest** may be single-architecture (unchecked); if so, the job fails closed.

## Gaps (not built in this task)
- SESS-01 to SESS-06: they test the Better Auth configuration, so they come with the auth ticket.
- INPUT-01, SECRET-02 to SECRET-05, PRIV-01 to PRIV-03, DEP-02 to DEP-04, CONTENT-04 and CONTENT-05: not written yet.
- The matrix AUTH-* rows use logical paths; they must be renamed to Better Auth routes.
- The test-support routes (`/__test__/*`) must be built in the app exactly as specified in `docs/security/test-harness-contract.md`, including refusing to start in production.
- `.github/**`, `.semgrep/**` and `tools/check-protected-files*` are the gate, but are not in `CODING_STANDARDS.md` section 7. The check and CODEOWNERS already cover them; the owner should add them to section 7.

## Still open
- **D12b:** age policy and parental consent for the public version (legal).
- **D13:** data residency for the public version (legal). The prototype uses one region, Frankfurt.

## Repository settings the owner must switch on
GitHub Free does **not** enforce branch protection, rulesets or CODEOWNERS on private repositories. Either use a paid plan (Pro/Team) or make the repository public. Then:
1. Add a ruleset or branch protection on `main`:
   - require a pull request with 1 approval and **"Require review from Code Owners"**;
   - require these status checks: `node --test …`, `secret scan`, `dependency audit`, `SAST`, `workflow lint`, `protected files`;
   - block force pushes and deletion.
2. Actions settings:
   - **require actions to be pinned to a full-length commit SHA**;
   - set workflow permissions to "Read repository contents";
   - keep "Allow GitHub Actions to create and approve pull requests" **off**;
   - require approval for fork pull-request workflows.
3. Create the label `protected-change-approved`. Only the owner adds it, after reviewing protected-path changes.
4. Secret scanning and push protection: free on public repositories; for private repositories they need GitHub Secret Protection (Team or Enterprise).
