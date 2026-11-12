# Security test plan

Status: **Proposed** (2026-11-12). Stack: **not decided** (no ADR in `docs/adr/`, nothing in `docs/architecture/`). This plan is stack-neutral: it says what each test sends and what must come back. It does not say which framework runs it. Owner decisions D1 to D16 (`docs/product/owner-decisions.md`) are applied; CI is GitHub Actions (D16).

Inputs: `CODING_STANDARDS.md` section 2, `docs/security/threat-model.md`, `skills/ielts-security-review/SKILL.md` (used as reference only, not installed), `docs/security/pre-launch-review.md`, the product blueprint and the agentic playbook (sections 9 and 10). Terms follow `GLOSSARY.md`.

Goal: every rule in `CODING_STANDARDS.md` section 2 and every row of the threat model has a concrete, runnable test that **fails the build** when it is violated. Where that is not possible, this plan says so.

## 1. How to read this plan

**Threat ids.** The threat model's rows are not numbered, so this plan numbers them in order: T1 answer keys, authored routes and transcripts · T2 learner accounts and sessions · T3 attempts and progress · T4 exam-mode integrity · T5 content bank and authoring tools · T6 secrets and CI · T7 dependencies · T8 future AI tutor and voice.

**Status of each case**

| Status | Meaning |
|---|---|
| **NOW** | Runnable today and wired into `node --test tests/security/*.test.mjs`. |
| **STACK** | Automatable. Blocked only on the stack decision (no API, no app, no CI provider yet). |
| **DESIGN** | Automatable once a product or design decision exists (named in the case). |
| **PARTIAL** | A test covers part of it; the rest needs a human. |
| **MANUAL** | Cannot be automated meaningfully. A human checks it. |

**Endpoints** are the ids in `docs/security/authorization-matrix.md` (for example `ATT-09`). The matrix is a proposed inventory: no API exists yet.

## 2. Test approach (applies to every STACK case)

1. **Synthetic accounts only.** `learner-a`, `learner-b`, `guest-a`, `guest-b` (guest sessions, D5), `author-1`, `reviewer-1`, `admin-1`, created by test setup in a test environment, with addresses on `example.test` (a reserved test domain). No real learner data, no production credentials, no real secrets. Secret canaries are random strings generated for each run.
2. **Synthetic content.** A published fixture item, built from the shape of `tools/fixtures/map-001.valid.json` but stored under `tests/security/fixtures/`. Its transcript cue text, distractor notes and explanations contain unique **canary strings** (e.g. `CANARY-TRANSCRIPT-<run-id>`). A second fixture item stays `draft`.
3. **Matrix-driven.** Leakage, cross-user and exam tests loop over `docs/security/authorization-matrix.json` using its flags (`deliveryPayload`, `ownerScoped`, `examForbidden`, `returnsAnswerData`, `acceptsUserText`). A new endpoint is covered automatically. The matrix coverage gate makes sure every real endpoint has a row.
4. **Leak detection is structural plus canaries.** Map targets and their labels have to reach the client, so a leaked single letter (`"C"`) cannot be detected by string search. A response **fails** if it contains: any canary string; any forbidden key (`answerLabel`, `eventId`, `events`, `transcript`, `cues`, `note`, `explanation`, `rationale`, `evidence`, `route`, `correct*`, `isCorrect`); or any question-to-target association.
5. **Assert outcome and state.** Each abuse request asserts the status code, that the response body has no protected data, and that stored state did not change (re-read as the owner).
6. **A failing test is never weakened.** If a case is wrong, the owner changes this plan first.

## 3. CODING_STANDARDS.md section 2, rule by rule

### 2.1 Server-side authorization on every read and write of attempts, progress, settings and recommendations

| Case | Abuse case (who sends what) | Expected safe result | Test | Status |
|---|---|---|---|---|
| AUTHZ-01 | Matrix lists an owner-scoped endpoint as `allow`, or anonymous gets learner data | Build fails | `tests/security/authorization-matrix.test.mjs` | **NOW** |
| AUTHZ-02 | A real endpoint exists that is not in the matrix | Build fails | same file, coverage gate (fails closed once app code exists without a discovery adapter) | **NOW** (skips with NOT VERIFIED until app code exists) |
| AUTHZ-03 | `learner-b` sends GET/PUT/POST to every `ownerScoped` endpoint with `learner-a`'s `attemptId`; repeat as `guest-b` against `guest-a`, and guest against learner and back | 404 (or 403), no data from the other user in the body; the other user's attempt unchanged | `tests/security/cross-user-access.test.*` | STACK |
| AUTHZ-04 | `learner-b` calls `/me/*` with `?userId=`, `X-User-Id` header or `userId` in the body set to `learner-a` | Response is `learner-b`'s own data; the override is ignored or rejected | `cross-user-access` | STACK |
| AUTHZ-05 | No session; every endpoint whose anonymous cell is `deny` | 401, no data | `cross-user-access` | STACK |
| AUTHZ-06 | Every role calls every endpoint; compare the status with the matrix cell | Matches the matrix (allowed is 2xx; denied is 401, 403 or 404) | `authorization-enforcement.test.*` (matrix-driven) | STACK |
| AUTHZ-07 | `learner-a` sends extra fields (`userId`, `score`, `isCorrect`, `mode`, `role`, `validation.status`) to `massAssignmentRisk` endpoints | Fields ignored or 400; stored score, mode and role unchanged | `cross-user-access` (mass assignment) | STACK |
| AUTHZ-08 | `learner-a` tampers with progress or recommendations directly (PUT/PATCH to progress, or a client-computed score in submit) | No such write endpoint exists (405 or 404); the server computes the score from stored answers | `cross-user-access` | STACK |

### 2.2 Answers, authored routes, transcripts and explanations are not sent before submission, and never in exam mode

| Case | Abuse case | Expected safe result | Test | Status |
|---|---|---|---|---|
| LEAK-01 | Matrix lets a learner-facing endpoint return answer data before submit | Build fails | `authorization-matrix.test.mjs` | **NOW** |
| LEAK-02 | `learner-a` starts a **guided** attempt and fetches every `deliveryPayload` endpoint plus `ATT-03` before submitting | No canary, no forbidden key, no question-to-target mapping | `tests/security/answer-key-leakage.test.*` | STACK |
| LEAK-03 | Same as LEAK-02 in an **exam** attempt, including after answers are saved and after the timer expires but before submit | Same; also no transcript at any point while the exam is in progress | `answer-key-leakage` | STACK |
| LEAK-04 | `learner-a` calls `ATT-09` (review) before submitting, in both modes | 403 or 409, no canary | `answer-key-leakage` | STACK |
| LEAK-05 | Built client bundle and static assets (JS, JSON, source maps) scanned for canaries and forbidden keys from published items | None found; source maps not deployed | `answer-key-leakage` (bundle scan step after the build) | STACK |
| LEAK-06 | `learner-a` guesses review URLs or ids (sequential ids, the item id instead of the attempt id) | 404; attempt ids are not sequential (at least 122 random bits, e.g. UUIDv4) | `answer-key-leakage` | STACK |
| LEAK-07 | Error responses (bad answer format, wrong mode) quote the correct answer | Errors contain no canary or forbidden key | `answer-key-leakage` (error-path fuzz) | STACK |
| LEAK-08 | After submit, `learner-a` requests review: does it carry the authored route and transcript? | Yes; a positive control, so the leak test is not passing because nothing is ever returned | `answer-key-leakage` | STACK |
| LEAK-09 | Timing or ordering side channels (target order matches question order; response size differs by answer) | Not reliably automatable | Human review of the delivery payload design | **MANUAL** |

### 2.3 Exam-mode rules (one listen, no hint, no replay, timer) enforced server-side

| Case | Abuse case | Expected safe result | Test | Status |
|---|---|---|---|---|
| EXAM-01 | Matrix lets replay or hint run in exam mode, or lets an attempt be written after submit | Build fails | `authorization-matrix.test.mjs` | **NOW** |
| EXAM-02 | `learner-a` in an exam attempt sends `POST ATT-07` (replay) directly, bypassing the UI | 403 or 409; support usage unchanged; no audio served | `tests/security/exam-mode.test.*` | STACK |
| EXAM-03 | Same with `POST ATT-08` (hint) | 403 or 409; no hint content in the body | `exam-mode` | STACK |
| EXAM-04 | `learner-a` fetches `ATT-06` (audio) again in exam mode: a second full request, a Range request that rewinds, a request from a new session, a request after the grant ended | Only one forward-only stream per exam attempt; resuming forward from the furthest delivered byte is allowed; everything else refused (D9). Local recording on the device cannot be prevented (accepted risk). | `exam-mode` | STACK |
| EXAM-05 | `learner-a` saves answers or submits after the server-side deadline, or sends a client timestamp, `timeRemaining` or `deadline` field | Late write refused (or marked late per spec); client time fields ignored | `exam-mode` | STACK (test controls the server clock) |
| EXAM-06 | `learner-a` switches an exam attempt to guided (PATCH mode), or starts a guided attempt on the same item while the exam is open, to read a review | Mode is immutable; a second open attempt on the same item is refused (D10) | `exam-mode` | STACK |
| EXAM-07 | `learner-a` opens two exam attempts on one item in parallel; or submits a guided attempt, reads the review, then starts an exam on the same item | Parallel attempt refused; the later exam is allowed but flagged `seenBefore` and excluded from independent readiness (D10) | `exam-mode` | STACK |

### 2.4 No secrets in code, fixtures, logs, client bundles or CI output; missing configuration stops the app

| Case | Abuse case | Expected safe result | Test | Status |
|---|---|---|---|---|
| SECRET-01 | Someone commits a key or token anywhere in the repo or its history | CI fails | Secret scanner (e.g. gitleaks, pinned) over the full history on every CI run | STACK (CI provider undecided) |
| SECRET-02 | Test run with canary values in every secret env var; capture app logs, test output and CI logs | No canary in any captured output | `tests/security/secret-hygiene.test.*` | STACK |
| SECRET-03 | Build the client with canary secret values | No canary and no server-only env var names in the bundle | `secret-hygiene` (bundle scan) | STACK |
| SECRET-04 | Start the app with each required config value missing, one at a time | Process exits non-zero with a clear message; never starts with a control weakened (e.g. auth off, CORS `*`) | `secret-hygiene` (fail-closed config) | STACK |
| SECRET-05 | Fixtures and seed data contain real-looking credentials or personal data | Scanner finds none; fixtures carry the SYNTHETIC header | Secret scanner plus a fixture lint | STACK |
| SECRET-06 | Agents have production credentials in their environment | — | Environment and access review | **MANUAL** |

### 2.5 All external input validated at the boundary and rendered escaped

| Case | Abuse case | Expected safe result | Test | Status |
|---|---|---|---|---|
| XSS-01 | `author-1` imports an item whose transcript cue text, landmark labels, prompts, notes or explanations contain an XSS payload corpus (`<script>`, `<img onerror>`, `javascript:` URLs, SVG, bidi and RTL override characters) | Either the import is rejected, or the review screen (Answer Replay transcript) renders it as text: no script runs, no element is injected | `tests/security/xss.test.*` (browser) | STACK |
| XSS-02 | `learner-a` submits the payload corpus in an item report (`REP-01`) and in settings text (`ME-02`) | Stored as data; `ADM-06` and the settings screen render it as text; no script runs in the staff browser | `xss` (browser) | STACK |
| XSS-03 | API responses that echo user text are served as `text/html` | Every API response is JSON with `nosniff`; CSP header present on pages | `xss` (headers) | STACK |
| XSS-04 | Code uses raw HTML sinks (`innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `|safe`, an unsanitised markdown renderer) | CI fails unless the line carries a reviewed exception | SAST rule (e.g. Semgrep, pinned) | STACK |
| INPUT-01 | Oversized, wrong-type or extra-field bodies on every `acceptsUserText` or `massAssignmentRisk` endpoint | 400 or 413; nothing stored | `input-validation.test.*` (matrix-driven) | STACK |
| INPUT-02 | String-built queries (SQL or NoSQL injection) | Parameterised queries only | SAST rule plus an injection payload smoke test | STACK |
| INPUT-03 | AI output rendered (future tutor) | Same corpus as XSS-01, sent through the tutor response path | `xss` | DESIGN (feature deferred) |

### 2.6 Learner data minimised, kept out of logs and analytics, with defined retention and deletion

| Case | Abuse case | Expected safe result | Test | Status |
|---|---|---|---|---|
| PRIV-01 | Run every learner flow with canary personal data (name, email, report text); capture logs, error-tracker payloads and analytics calls | No canary in any of them | `tests/security/privacy.test.*` | STACK |
| PRIV-02 | `learner-a` calls `DELETE /me` (`ME-03`); then sign in, read their attempts with an old session, query storage via a test hook | Sign-in fails; old session 401; no attempts, progress, reports or settings left for that user | `privacy` | STACK (deletion path) |
| PRIV-03 | Data older than the retention period is still stored: guest data idle over 30 days; account idle over 24 months; logs older than 30 days (D11) | The retention job deletes it (test controls the clock) | `privacy` | STACK |
| PRIV-04 | Is the collected data the minimum? Public age policy and parental consent (D12b) and data residency (D13) are OPEN; the pilot is adults-only (D12), checked at invitation | — | Owner and legal review | **MANUAL** |

### 2.7 A new dependency needs a stated reason, a pinned version and a read of its install scripts

| Case | Abuse case | Expected safe result | Test | Status |
|---|---|---|---|---|
| DEP-01 | A dependency with a known vulnerability is added or present | CI fails at the agreed severity threshold | The package manager's audit, or OSV-Scanner (pinned), in CI | STACK |
| DEP-02 | A direct dependency uses a version range, or the lockfile is missing or out of date | CI fails | `tests/security/dependency-policy.test.*` (manifest plus lockfile check; frozen install in CI) | STACK |
| DEP-03 | A direct dependency has no stated reason | CI fails unless it has a row in a dependency register (e.g. `docs/architecture/dependencies.md`) | `dependency-policy` | STACK |
| DEP-04 | A package with install scripts (`preinstall`, `install`, `postinstall`) enters the tree | CI fails unless it is on an owner-reviewed allow-list; install scripts disabled by default in CI | `dependency-policy` | STACK |
| DEP-05 | Whether the install scripts were actually read, and whether the package is maintained | — | The allow-list entry records who read it and when | **PARTIAL**: the read itself is human |

## 4. Threat model, row by row

| Threat | Threats named | Covered by | Gaps |
|---|---|---|---|
| **T1** Answer keys, authored routes, transcripts | Sent to the client early; guessable review endpoints | LEAK-01 to LEAK-08, AUTHZ-03 | LEAK-09 side channels: MANUAL |
| **T2** Learner accounts, guest sessions and sessions | Credential stuffing; weak reset flow; session theft; enumeration; mass guest-session creation; guest-to-account upgrade hijack | SESS-01 to SESS-09 below | Depends on the auth provider (undecided). A managed provider moves some cases to configuration review. |
| **T3** Attempts and progress | Cross-user access (IDOR); tampering with scores or recommendations | AUTHZ-01 to AUTHZ-08 | none beyond STACK |
| **T4** Exam-mode integrity | Replay or hint sent directly to the API; timer manipulation | EXAM-01 to EXAM-07 | Designs decided (D9, D10); local audio recording cannot be prevented (accepted risk) |
| **T5** Content bank and authoring tools | Unvalidated import; learner or guest access to admin tools; XSS in transcripts | CONTENT-01 to CONTENT-05 below, XSS-01, XSS-02 | See CONTENT-04 |
| **T6** Secrets and CI | Keys in repo or logs; agents with production credentials; prompt injection through PR text | SECRET-01 to SECRET-05, CI-01 to CI-03 below | SECRET-06 and CI-03: MANUAL |
| **T7** Dependencies | Malicious or abandoned packages; install scripts | DEP-01 to DEP-05 | "Abandoned" and "malicious" are only partly detectable |
| **T8** Future AI tutor and voice | Prompt injection via content or user text; key exposure; unbounded spend | AI-01 to AI-05 below | Feature deferred: all DESIGN |

### T2 cases: accounts and sessions

| Case | Abuse case | Expected safe result | Test | Status |
|---|---|---|---|---|
| SESS-01 | 20 wrong passwords for `learner-a` from one client, then from rotating clients (credential stuffing) | Rate-limited (429) or locked with backoff; the correct password is not accepted while throttled | `tests/security/auth.test.*` | STACK |
| SESS-02 | Sign-in and reset with an existing vs a non-existent email | Same status and body. Timing is compared only loosely; strict timing checks are flaky (PARTIAL) | `auth` | STACK |
| SESS-03 | Inspect the session cookie or token storage | `Secure`, `HttpOnly`, `SameSite=Lax` or `Strict`; no token in `localStorage` (if cookies are used) | `auth` | STACK |
| SESS-04 | Sign out, then replay the old session cookie | 401 (session invalidated server-side) | `auth` | STACK |
| SESS-05 | Use an expired session; reuse a reset token; use a reset token after 1 hour | 401, refused, refused | `auth` | STACK |
| SESS-06 | A reset link sent to `learner-a` is used by `learner-b`'s session; token present in logs or the Referer | Bound to the account; not logged | `auth` | STACK |
| SESS-07 | Home-grown crypto or password hashing | Established provider or library | Code review | **MANUAL** |
| SESS-08 | Anonymous client creates guest sessions in a loop (`AUTH-05`) | Rate-limited (429) per client; idle guest data expires (D11) | `auth` | STACK |
| SESS-09 | `guest-a` upgrades to an account (`AUTH-01`) while presenting `guest-b`'s session id, or an attacker replays `guest-a`'s old session after the upgrade | Only the caller's own guest data moves to the new account; the old guest session is invalidated after upgrade | `auth` | STACK |

### T5 cases: content bank and authoring tools

| Case | Abuse case | Expected safe result | Test | Status |
|---|---|---|---|---|
| CONTENT-01 | `learner-a` calls every `/admin/*` endpoint | 403 or 404 | Matrix invariant (**NOW**) plus `authorization-enforcement` (STACK) | NOW + STACK |
| CONTENT-02 | `learner-a` requests the draft fixture via `ITEM-02` and `ITEM-01`, and starts an attempt on it | 404; not listed; attempt refused | `authorization-enforcement` | STACK |
| CONTENT-03 | `author-1` publishes (`ADM-05`), or edits a published item (`ADM-03`) | 403; published item unchanged | Matrix invariant (**NOW**) plus `authorization-enforcement` (STACK) | NOW + STACK |
| CONTENT-04 | `author-1` imports an invalid item (route end off target, cue order wrong, markup in text) via `ADM-02` | Rejected by the same checks as `tools/validate-content.mjs`, including the plain-text rule (code `markup`, D4) | `content-import.test.*`; the validator's own markup tests already run (**NOW**) | PARTIAL NOW + STACK. Rendering must still escape (XSS-01). |
| CONTENT-05 | Audio path traversal: an item with `audio.file = "../../etc/passwd"`, or `ATT-06` with a crafted path | Rejected at import (the validator already checks this with `--assets`); served only from the allow-listed location | `content-import` plus the existing `tools/validate-content.test.mjs` | PARTIAL NOW (validator unit test exists) + STACK |

### T6 cases: CI and agent tooling

| Case | Abuse case | Expected safe result | Test | Status |
|---|---|---|---|---|
| CI-01 | A workflow runs on untrusted PR events with secrets or write permissions, or runs an agent on PR text | CI lint fails (e.g. zizmor or actionlint, pinned): default `permissions: read`, actions pinned by SHA, no secrets on untrusted triggers | `ci-policy` step | STACK (CI provider undecided) |
| CI-02 | An agent branch changes a protected file (`CODING_STANDARDS.md` section 7), including `tests/security/**` (protected since D3) | CI fails without owner approval; CODEOWNERS | CI protected-files check | STACK (needs the GitHub remote, D16) |
| CI-03 | Production credentials reachable from agent or CI environments | — | Access review | **MANUAL** |

### T8 cases: future AI tutor (deferred feature)

AI-01 provider key never in the client (bundle scan, like SECRET-03). AI-02 per-user quota and rate limit (send N+1 requests, expect 429). AI-03 the prompt for `learner-a` never contains `learner-b`'s canary data (capture prompts in test mode). AI-04 model output cannot change scores, answer keys or recommendations (no tool or write path; verify stored state). AI-05 prompt injection through item text and user text (canary instruction in a transcript; assert no action and no key disclosure). All **DESIGN**: the feature and the provider are not chosen.

## 5. What cannot be tested automatically

| Item | Why | Who checks |
|---|---|---|
| LEAK-09 side channels (ordering, sizes) | No reliable oracle | Security reviewer, on the delivery payload design |
| EXAM-04 local recording of exam audio | Happens on the learner's device | Accepted risk (owner decision D9) |
| SECRET-06, CI-03 production credentials reachable by agents | Environment and access configuration, outside the repo | Owner |
| PRIV-04 minimisation, minors, consent, residency | Legal and product judgement (D12b, D13 open) | Owner and legal |
| DEP-05 "install scripts were read", "maintained" | Human judgement | Owner (allow-list records it) |
| SESS-07 crypto and auth design | Needs a qualified reviewer | Human security assessment before launch (`pre-launch-review.md`) |
| SESS-02 timing-based enumeration | Flaky in CI | Manual measurement against staging |
| Whether a "denied" response is the right UX | Not a security property | Product review |

## 6. Planned test files

| File | Covers | Status |
|---|---|---|
| `tests/security/authorization-matrix.test.mjs` | AUTHZ-01, AUTHZ-02, LEAK-01, EXAM-01, CONTENT-01 and CONTENT-03 (matrix side) | **Exists, runs** |
| `tests/security/lib/matrix.mjs` | Shared matrix helpers for all tests below | **Exists** |
| `tests/security/answer-key-leakage.test.*` | LEAK-02 to LEAK-08 | Waiting for the stack |
| `tests/security/exam-mode.test.*` | EXAM-02 to EXAM-07 | Waiting for the stack |
| `tests/security/cross-user-access.test.*`, `authorization-enforcement.test.*` | AUTHZ-03 to AUTHZ-08, CONTENT-01 to CONTENT-03 | Waiting for the stack |
| `tests/security/xss.test.*`, `input-validation.test.*` | XSS-01 to XSS-04, INPUT-01 to INPUT-03 | Waiting for the stack (browser runner) |
| `tests/security/auth.test.*` | SESS-01 to SESS-06, SESS-08, SESS-09 | Waiting for the stack and auth provider |
| `tests/security/secret-hygiene.test.*`, `privacy.test.*`, `dependency-policy.test.*`, `content-import.test.*` | SECRET, PRIV, DEP, CONTENT-04 and CONTENT-05 | Waiting for the stack |
| CI workflow: secret scan, dependency audit, SAST, CI lint, protected files | SECRET-01, DEP-01, XSS-04, INPUT-02, CI-01, CI-02 | Waiting for the CI provider (no remote yet) |
| `tests/security/adapters/discover-endpoints.mjs` | Feeds the AUTHZ-02 coverage gate | Write when the stack is chosen; the gate fails closed without it |

Run today: `node --test tests/security/*.test.mjs`.
