# Authorization matrix

Status: **Proposed**. **No API exists yet.** The endpoints below are a logical, stack-neutral inventory derived from `docs/product/ielts_adaptive_learning_product_blueprint.md`, so authorization can be designed before code exists (`CODING_STANDARDS.md` 2.1). Owner decisions from 2026-11-12 are applied (`docs/product/owner-decisions.md`). The first feature spec may rename or remove endpoints; when it does, this file and the JSON change together.

- **Source of truth:** `docs/security/authorization-matrix.json`. This table must match it exactly.
- **Test:** `node --test tests/security/*.test.mjs` runs `tests/security/authorization-matrix.test.mjs`. It fails the build when a cell is missing or unknown, when a cell breaks a security invariant (below), when this table drifts from the JSON, or when the app has a real endpoint with no row here.
- **Coverage gate:** activates automatically once application code exists (`src/`, `app/`, `server/`, `api/`, ...). The stack is decided (`docs/adr/0001-stack.md`: Fastify API in `server/`), and `tests/security/adapters/discover-endpoints.mjs` scans its routes statically. It **fails closed** on any route it cannot read.
- **Auth paths:** `AUTH-01` to `AUTH-05` are logical paths. When Better Auth is wired up, rename them to its real routes here and in the JSON; the coverage gate fails until they match.
- **Live tests:** `tests/security/*.test.mjs` iterate this matrix by its flags (contract: `docs/security/test-harness-contract.md`).

## Roles

| Role | Meaning |
|---|---|
| `anonymous` | No session. May only start a guest session, create an account, sign in or request a password reset. |
| `guest` | Server-issued guest session holding no personal data (decision D5). Practises on its own data exactly like a learner; can upgrade to an account and keep its data. |
| `learner` | Signed-in learner. Own data only. |
| `content_author` | Staff. Drafts and imports items; cannot publish. Practises as a learner on own data. |
| `content_reviewer` | Staff, a human. Reviews and publishes items (`CODING_STANDARDS.md` 3.1). Practises as a learner on own data. |
| `admin` | Operator. Manages staff roles only. **No access to learners' or guests' attempts or progress** (decision D7). |

## Decisions (cell values)

| Value | Meaning |
|---|---|
| `allow` | Permitted. |
| `deny` | Always refused: 401 without a session, 403 or 404 with one. Body carries none of the resource's data. |
| `own` | Only the caller's own resource. Another user's: 404 (preferred) or 403, no data. |
| `own-open` | As `own`, and only while the attempt is open (not submitted; before the server-side deadline in exam mode). |
| `own-open-guided` | As `own-open`, and only in guided practice. Refused in exam simulation and independent check (2.3). |
| `own-submitted` | As `own`, and only after the attempt is submitted (2.2). |
| `published` | Only published items. Draft or reviewed items: 404. |
| `draft-only` | Only items that are not yet published. |

## Matrix

| ID | Method | Path | anonymous | guest | learner | content_author | content_reviewer | admin | Flags | Refs |
|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-01 | POST | `/accounts` | `allow` | `allow` | `deny` | `deny` | `deny` | `deny` | acceptsUserText, enumerationSensitive | T2, CS2.5, CS2.6 |
| AUTH-02 | POST | `/auth/sessions` | `allow` | `allow` | `allow` | `allow` | `allow` | `allow` | enumerationSensitive, rateLimited | T2 |
| AUTH-03 | DELETE | `/auth/sessions/current` | `deny` | `own` | `own` | `own` | `own` | `own` | ownerScoped | T2 |
| AUTH-04 | POST | `/auth/password-resets` | `allow` | `deny` | `allow` | `allow` | `allow` | `allow` | enumerationSensitive, rateLimited | T2 |
| AUTH-05 | POST | `/auth/guest-sessions` | `allow` | `deny` | `deny` | `deny` | `deny` | `deny` | rateLimited | T2, CS2.6 |
| ME-01 | GET | `/me/settings` | `deny` | `own` | `own` | `own` | `own` | `own` | ownerScoped | T3, CS2.1 |
| ME-02 | PATCH | `/me/settings` | `deny` | `own` | `own` | `own` | `own` | `own` | ownerScoped, acceptsUserText, massAssignmentRisk | T3, CS2.1, CS2.5 |
| ME-03 | DELETE | `/me` | `deny` | `own` | `own` | `own` | `own` | `own` | ownerScoped | T2, T3, CS2.6 |
| ITEM-01 | GET | `/items` | `deny` | `published` | `published` | `published` | `published` | `published` | deliveryPayload | T1, T5, CS2.2, CS3.1 |
| ITEM-02 | GET | `/items/{itemId}` | `deny` | `published` | `published` | `published` | `published` | `published` | deliveryPayload | T1, T5, CS2.2, CS3.1 |
| REP-01 | POST | `/items/{itemId}/reports` | `deny` | `published` | `published` | `published` | `published` | `published` | acceptsUserText | T5, CS2.5 |
| ATT-01 | POST | `/attempts` | `deny` | `allow` | `allow` | `allow` | `allow` | `allow` | massAssignmentRisk | T1, T3, T4, CS2.1, CS2.3 |
| ATT-02 | GET | `/me/attempts` | `deny` | `own` | `own` | `own` | `own` | `own` | ownerScoped | T3, CS2.1 |
| ATT-03 | GET | `/attempts/{attemptId}` | `deny` | `own` | `own` | `own` | `own` | `deny` | ownerScoped, deliveryPayload | T1, T3, CS2.1, CS2.2 |
| ATT-04 | PUT | `/attempts/{attemptId}/answers` | `deny` | `own-open` | `own-open` | `own-open` | `own-open` | `deny` | ownerScoped, massAssignmentRisk | T3, T4, CS2.1, CS2.3 |
| ATT-05 | POST | `/attempts/{attemptId}/submit` | `deny` | `own-open` | `own-open` | `own-open` | `own-open` | `deny` | ownerScoped, massAssignmentRisk | T3, T4, CS2.1, CS2.3 |
| ATT-06 | GET | `/attempts/{attemptId}/audio` | `deny` | `own-open` | `own-open` | `own-open` | `own-open` | `deny` | ownerScoped, examSingleUse | T4, CS2.1, CS2.3 |
| ATT-07 | POST | `/attempts/{attemptId}/replays` | `deny` | `own-open-guided` | `own-open-guided` | `own-open-guided` | `own-open-guided` | `deny` | ownerScoped, examForbidden | T4, CS2.3 |
| ATT-08 | POST | `/attempts/{attemptId}/hints` | `deny` | `own-open-guided` | `own-open-guided` | `own-open-guided` | `own-open-guided` | `deny` | ownerScoped, examForbidden | T4, CS2.3 |
| ATT-09 | GET | `/attempts/{attemptId}/review` | `deny` | `own-submitted` | `own-submitted` | `own-submitted` | `own-submitted` | `deny` | ownerScoped, returnsAnswerData | T1, T3, CS2.1, CS2.2 |
| PROG-01 | GET | `/me/progress` | `deny` | `own` | `own` | `own` | `own` | `own` | ownerScoped | T3, CS2.1 |
| PROG-02 | GET | `/me/recommendations` | `deny` | `own` | `own` | `own` | `own` | `own` | ownerScoped | T3, CS2.1 |
| ADM-01 | GET | `/admin/items` | `deny` | `deny` | `deny` | `allow` | `allow` | `deny` | staffOnly | T5 |
| ADM-02 | POST | `/admin/items` | `deny` | `deny` | `deny` | `allow` | `allow` | `deny` | staffOnly, acceptsUserText | T5, CS2.5, CS3.2 |
| ADM-03 | PUT | `/admin/items/{itemId}` | `deny` | `deny` | `deny` | `draft-only` | `draft-only` | `deny` | staffOnly, acceptsUserText | T5, CS2.5 |
| ADM-04 | GET | `/admin/items/{itemId}/preview` | `deny` | `deny` | `deny` | `allow` | `allow` | `deny` | staffOnly, returnsAnswerData | T1, T5 |
| ADM-05 | POST | `/admin/items/{itemId}/publish` | `deny` | `deny` | `deny` | `deny` | `allow` | `deny` | staffOnly, publishAction | T5, CS3.1 |
| ADM-06 | GET | `/admin/reports` | `deny` | `deny` | `deny` | `allow` | `allow` | `deny` | staffOnly, rendersUserText | T5, CS2.5, CS2.6 |
| ADM-07 | PUT | `/admin/users/{userId}/roles` | `deny` | `deny` | `deny` | `deny` | `deny` | `allow` | staffOnly, massAssignmentRisk | T2, CS2.1 |

Flags drive the invariants and, later, the stack-specific tests: `ownerScoped` (cross-user tests), `deliveryPayload` (answer-key leakage scan), `returnsAnswerData`, `examForbidden` / `examSingleUse` (exam-mode tests), `acceptsUserText` / `rendersUserText` (XSS tests), `massAssignmentRisk` (extra-field tests), `enumerationSensitive` / `rateLimited` (auth tests), `staffOnly`, `publishAction`.

## Invariants the test enforces

| Invariant | Source |
|---|---|
| Paths under `/me` or containing `{attemptId}` are `ownerScoped`; owner-scoped cells are never `allow` | CS 2.1, T3 |
| `anonymous` is denied all attempts, progress, settings and recommendations | CS 2.1, T3 |
| Learner-facing endpoints returning answer data are `own-submitted` or `deny`; staff previews deny non-staff | CS 2.2, T1 |
| A delivery payload is never also flagged as returning answer data | CS 2.2, T1 |
| Replay and hint are `own-open-guided` or `deny` | CS 2.3, T4 |
| Attempt writes are refused after submit or deadline | CS 2.3, T3, T4 |
| `/admin/*` is staff-only (anonymous, guest and learner denied) | T5 |
| Only `content_reviewer` can publish | CS 3.1, T5 |
| Every endpoint cites a rule or threat; ids and method+path are unique | completeness |

## Decisions this matrix applies (`docs/product/owner-decisions.md`)

- **D5 Guest mode:** yes, through a server-issued guest session (`AUTH-05`). With no session at all, everything else is denied.
- **D6 Exam review timing:** review (`ATT-09`) opens once the attempt is submitted, including exam simulations. Answer data is never sent while an exam is in progress.
- **D7 Admin:** no access to learners' or guests' attempts or progress.
- **D8 Roles:** authors cannot publish. Publishing is a human action by a `content_reviewer`, and one person may hold both roles. Staff practise as learners on their own data.
- **D9 / D10 Exam audio and attempts:** `ATT-06` serves exam audio once, forward only. A user has at most one open attempt per item.
- **AI tutor endpoints:** not listed (feature deferred). They must be added here before they are built.
