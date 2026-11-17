# 03: Walking skeleton

**What to build:** One Node service serves the React app and the Fastify API with PostgreSQL and migrations, following ADR 0001. The app shows an empty Arabic right-to-left screen frame with an English switch. CI runs lint, type check and build. The test-support routes from the harness contract exist (never in production), so the existing security suites run against a real instance.

**Blocked by:** None (can start immediately)

**Status:** done (merged to `main` in PR #7, 2026-11-16; CI seen green on GitHub 2026-11-17)

Spec: `../spec.md`

- [x] App starts locally with one command and serves the frame with `dir="rtl"` and an English switch
- [x] Every API response is JSON with `nosniff`; the page CSP has no unsafe-inline, unsafe-eval, wildcard, https: or data: script sources
- [x] Test-support routes require the token, return 404 without it, and the app refuses to start in production with a token set
- [x] Security suites run against the instance; results recorded (failures expected for unbuilt features are listed as NOT VERIFIED or failing, not hidden)
- [x] Coverage gate: every registered endpoint has a matrix row
- [x] CI lint, type check and build pass

## Comments

### 2026-11-16, agent (implement)
Built on `agent/walking-skeleton` (stacked on `agent/install-skills-C` and `agent/content-format-v1`). Owner decisions in this task: ME-01 stub that always returns 401 keeps the coverage gate live; Postgres via Docker Compose; `ci.yml` approved (needs the `protected-change-approved` label); Impeccable hook stays off.

**Security suites against a live local instance** (`npm start` with a random token; `node --test --test-concurrency=1 tests/security/*.test.mjs`): 61 tests, 37 pass, **24 fail**. All 24 fail at shared setup with one cause: `POST /__test__/items` returns 501 (items are built in 06; users in 05; retention in 17). Failing cases, all **NOT VERIFIED** until those routes exist: AUTHZ-03, AUTHZ-04, AUTHZ-05, AUTHZ-06, AUTHZ-07, AUTHZ-08, EXAM-02, EXAM-03, EXAM-04, EXAM-05, EXAM-06, EXAM-07, LEAK-02, LEAK-03, LEAK-04, LEAK-05, LEAK-06, LEAK-07, LEAK-08, SESS-08, SESS-09, XSS-01, XSS-02, XSS-03.
XSS-03's header and CSP checks therefore did not run in the suite. The same properties are covered by `server/src/app.test.ts` (inject) and were checked by hand with curl against the live instance.
Passing: matrix invariants, the coverage gate (`every real endpoint in the application appears in the matrix`), endpoint discovery, and fixture proofs.

**CI**: not run (nothing pushed). Lint, type check, build and server tests (26/26) pass locally.
**English switch**: present in the served app and type-checked, but NOT VERIFIED in a real browser (Playwright and `verify-user-flow` arrive with the first UI ticket, 07).
