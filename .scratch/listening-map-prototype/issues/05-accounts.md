# 05: Accounts

**What to build:** A tester can create an account (directly with an invite code, or by upgrading their guest session while keeping all data), sign in, sign out and reset their password.

**Blocked by:** 04 Invite codes and guest onboarding

**Status:** in-progress (branch `agent/invite-guest-onboarding`)

Spec: `../spec.md`

- [ ] Sign-up without a guest session requires a valid invite code
- [ ] Guest upgrade keeps the guest's own data, issues a new session and invalidates the old one (SESS-09)
- [ ] Sign-in, sign-out and password reset work; responses do not reveal whether an email exists
- [ ] Matrix AUTH-* rows mapped to Better Auth's real routes; coverage gate green
- [ ] Security auth suite cases for this ticket pass against the instance

## Comments

### 2026-11-16, owner (via agent `implement` session)
Approved the protected changes for this ticket: matrix AUTH-01 gets an invite-code purpose (anonymous callers only) and the `rateLimited` flag; new row AUTH-06 `POST /auth/password-resets/complete` (anonymous allow, all others deny; `enumerationSensitive`, `rateLimited`); the "logical paths" notes in the matrix md/json say the AUTH-* rows are mapped. `tests/security`: AUTH-01 recipes in `authorization-enforcement` and `cross-user-access` send `{inviteCode, ageConfirmed}` for anonymous callers; new AUTH-06 recipes; new SESS-02, SESS-04, SESS-05 (reset token reuse) cases in `auth.test.mjs`; the harness contract and fixture-server gain a test-support route returning the latest reset token for an email. Decisions: AUTH-* rows stay our own literal Fastify routes calling Better Auth's server API (handler not mounted); reset links go to an outbox table that the owner reads with a script (no email provider, no new dependency); HTTP tests through `inject()` written test-first.
