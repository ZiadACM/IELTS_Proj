# 05: Accounts

**What to build:** A tester can create an account (directly with an invite code, or by upgrading their guest session while keeping all data), sign in, sign out and reset their password.

**Blocked by:** 04 Invite codes and guest onboarding

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] Sign-up without a guest session requires a valid invite code
- [ ] Guest upgrade keeps the guest's own data, issues a new session and invalidates the old one (SESS-09)
- [ ] Sign-in, sign-out and password reset work; responses do not reveal whether an email exists
- [ ] Matrix AUTH-* rows mapped to Better Auth's real routes; coverage gate green
- [ ] Security auth suite cases for this ticket pass against the instance

## Comments
