# 05: Accounts

**What to build:** A tester can create an account (directly with an invite code, or by upgrading their guest session while keeping all data), sign in, sign out and reset their password.

**Blocked by:** 04 Invite codes and guest onboarding

**Status:** in-review (branch `agent/invite-guest-onboarding`)

Spec: `../spec.md`

- [x] Sign-up without a guest session requires a valid invite code
- [x] Guest upgrade keeps the guest's own data, issues a new session and invalidates the old one (SESS-09)
- [x] Sign-in, sign-out and password reset work; responses do not reveal whether an email exists (sign-up still does: see open items)
- [x] Matrix AUTH-* rows mapped to Better Auth's real routes; coverage gate green
- [ ] Security auth suite cases for this ticket pass against the instance

## Comments

### 2026-11-16, owner (via agent `implement` session)
Approved the protected changes for this ticket: matrix AUTH-01 gets an invite-code purpose (anonymous callers only) and the `rateLimited` flag; new row AUTH-06 `POST /auth/password-resets/complete` (anonymous allow, all others deny; `enumerationSensitive`, `rateLimited`); the "logical paths" notes in the matrix md/json say the AUTH-* rows are mapped. `tests/security`: AUTH-01 recipes in `authorization-enforcement` and `cross-user-access` send `{inviteCode, ageConfirmed}` for anonymous callers; new AUTH-06 recipes; new SESS-02, SESS-04, SESS-05 (reset token reuse) cases in `auth.test.mjs`; the harness contract and fixture-server gain a test-support route returning the latest reset token for an email. Decisions: AUTH-* rows stay our own literal Fastify routes calling Better Auth's server API (handler not mounted); reset links go to an outbox table that the owner reads with a script (no email provider, no new dependency); HTTP tests through `inject()` written test-first.

### 2026-11-16, agent (implement)
Built on `agent/invite-guest-onboarding` (stacked on ticket 04). Routes: `POST /accounts` (AUTH-01), `POST /auth/sessions` (AUTH-02), `DELETE /auth/sessions/current` (AUTH-03), `POST /auth/password-resets` (AUTH-04), `POST /auth/password-resets/complete` (AUTH-06). These are literal Fastify routes calling Better Auth 1.7.15's server API. A guest upgrade happens in place: the same user id is kept, so every row it owns stays with it. The guest gets a credential account (password hashed by Better Auth), its sessions are deleted and a new one is issued. Failed sign-ins are limited per client and per email, 10 per 15 minutes; while throttled, the right password is refused too. The other access routes are limited to 10 per 15 minutes per client. Reset links go to the `password_reset_outbox` table, with the token in the URL fragment. The owner reads them with `npm run reset-links -w server` and sends them by hand. A link works once, for one hour. Rows are deleted when used or expired. Test support: `POST /__test__/users` (learners; staff roles answer 501 until ticket 06) and `GET /__test__/password-resets/latest`. Web: sign-in, sign-up with code, forgot/reset password, and a Settings account section (guest: create an account; account: sign out). No new dependency.

**Results:** `npm test` 76/76. Offline security and tools tests: 115 pass, 0 fail, 27 skipped (live). Fixture proof 13/13; each new SESS case is caught by its own fixture vulnerability. Lint, type check and build pass. Live, against a local instance through a scratch proxy that stubbed only `POST /__test__/items` (ticket 06): SESS-02, SESS-04 and SESS-05 **pass**. SESS-08 and SESS-09 stop at `POST /attempts` (ticket 08). I replayed SESS-09's account steps with the suite's `Actor` against the real app: the foreign field gives 400; a plain upgrade gives 201 with the same userId and the guest's settings kept; the other guest is untouched; the old guest cookie gives 401. The server log held no emails or tokens. **NOT VERIFIED:** the AUTHZ-06 cells for staff roles (`/__test__/users` staff needs ticket 06); the Impeccable critique/audit and browser checks of the new screens (CS 4.8). Ticket 04's deferral to 07 does not name this ticket, so the owner needs to confirm the same deferral. Arabic strings need a fluent reader (CS 3.5).

**Open for the owner:**
- Needs a decision: AUTH-01 answers 409 `email_taken`, which reveals that an email has an account. Probing needs a valid invite code (anonymous) or a guest session, and is rate-limited. A non-revealing sign-up needs email verification, which needs an email provider. Accept for the pilot, or decide otherwise.
- Approval check: `tests/security/lib/live.mjs` gained an `env.resetToken` helper that uses the approved test-support route. The `cross-user-access` AUTH-01 recipe was left unchanged because that suite never calls AUTH-01 with a body (it is neither owner-scoped nor anonymous-deny). The fixture still requires 12-character passwords where the app requires 8; I did not change it, because that was not in the approved list.
- shortcut: guest vs account in the UI is a per-browser hint (localStorage). If the hint is stale, an account holder sees the upgrade form, and the server answers `already_signed_in`, which corrects it. A server-side field on ME-01 would remove the guess.
- shortcut: guest upgrade writes Better Auth's `user`/`account`/`session` tables directly, so the guest keeps its user id and data. Better Auth's own linking deletes the anonymous user instead, and every table would need migrating. A Better Auth upgrade must re-check the column names. If the sign-in after an upgrade fails, the account exists without a session, and the learner signs in by hand.
- shortcut: limits are in memory and keyed on `request.ip` (as in ticket 04; set `trustProxy` at deployment).
- Better Auth's reset expiry and session expiry use the real clock, not the test clock, so SESS-05's 1-hour part stays STACK.
- The PR needs the `protected-change-approved` label for the CI protected-files check.
