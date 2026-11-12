# Security test-harness contract

Status: **Proposed** (2026-11-12). The live security suites (`tests/security/{answer-key-leakage,exam-mode,cross-user-access,authorization-enforcement,xss,auth}.test.mjs`) send real HTTP requests to a running **test** instance of the app. This file states what that instance must provide. The SYNTHETIC fixture `tests/security/fixtures/fixture-server.mjs` implements it, and `tests/security/fixture-proof.test.mjs` shows each suite passing against the safe fixture and failing against the vulnerable one.

## Configuration (environment only)

| Variable | Meaning |
|---|---|
| `SECURITY_BASE_URL` | Base URL of a test instance, e.g. `http://127.0.0.1:3000`. Never production. Unset: every live case is **skipped as NOT VERIFIED**; none passes. |
| `SECURITY_TEST_SUPPORT_TOKEN` | Random value generated for each run. The app enables `/__test__/*` only when it is set, and compares it in constant time. The suites fail closed if the base URL is set but the token is not. |
| `SECURITY_REQUIRE_TARGET=1` | Turns a missing base URL into a failure instead of a skip (CI, once the app exists). |
| `SECURITY_GUEST_RATE_PROBE` | Number of guest sessions SESS-08 creates in a loop (default 30). |

Run the suites one at a time against a shared instance (`node --test --test-concurrency=1 …`): the tests move the server clock.

## Test-support endpoints (`/__test__/*`)

These routes live only under `server/**/test-support/`. The endpoint adapter ignores them, so they need no matrix rows. Requests without the `x-test-support-token` header get 404. They must **never be mounted in production**: the app refuses to start with `NODE_ENV=production` and a support token set (SECRET-04).

| Request | Response |
|---|---|
| `GET /__test__/health` | 200 |
| `POST /__test__/users {role, email, password}` (role: learner or staff) | 201 `{userId}`. The test then signs in through the real `AUTH-02`. |
| `GET /__test__/users/{userId}` | 200 `{userId, role, attempts}` or 404 |
| `POST /__test__/items {item, status}` (status `published` or `draft`) | 201 `{itemId}` |
| `POST /__test__/clock {advanceSeconds}` | 200 `{now}` (ISO). Moves the server clock used for deadlines, audio grants and retention. |
| `POST /__test__/rate-limits/reset` | 2xx |
| `POST /__test__/jobs/retention` | 2xx. Runs the D11 retention job once. |

## API shapes the suites rely on

These are working assumptions until the first feature spec. If the spec changes them, change the suites in the same task, with owner approval (protected path).

- **Sessions** are cookies. `POST /auth/guest-sessions` and `POST /accounts` return `{userId}`. A guest upgrade (`POST /accounts` called with a guest session) keeps the guest's data, issues a new session and invalidates the old one.
- **`POST /attempts {itemId, mode: "guided" | "exam"}`** returns the attempt. Attempt ids are UUIDv4 or an opaque random string of at least 21 characters.
- **Attempt state** (`GET /attempts/{id}`) is `{id, itemId, mode, status: "open" | "submitted", answers, supportUsage: {replayCount, hintCount}, deadline (ISO, exam only), seenBefore, countsTowardIndependentReadiness, late, score (after submit)}`.
- **`PUT /attempts/{id}/answers {answers: {<questionId>: <targetLabel>}}`.** Submitting is `POST .../submit {}`; the server computes the score.
- **`POST .../hints {questionId}`** returns the hint in guided mode only. `POST .../replays {}` works in guided mode only.
- **`GET .../audio`** supports `Range`. In exam mode there is one forward-only grant (D9), refused with 403, 409, 410 or 416.
- **`GET .../review`** contains the correct answers, the authored route (`route` or `events`) and the transcript.
- **Every API response** is JSON (audio excepted) with `X-Content-Type-Options: nosniff`. `GET /` serves the page with a CSP whose script policy has no `'unsafe-inline'`, `'unsafe-eval'`, `*`, `https:` or `data:`.
- **Fixture items** come from `tests/security/fixtures/items/security-map.template.json`. Every protected text carries a `CANARY-<KIND>-<run>` string. Answers are C, E and B; the tests save only A or D.
