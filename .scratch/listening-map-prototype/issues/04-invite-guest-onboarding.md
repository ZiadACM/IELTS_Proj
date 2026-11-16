# 04: Invite codes and guest onboarding

**What to build:** The owner creates, lists and withdraws invite codes with a script. A tester enters a code, confirms they are 18 or over, starts as a guest, sees one optional target band screen, and lands on Home. Settings lets them change interface language and target band.

**Blocked by:** 03 Walking skeleton

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] Owner script creates, lists and withdraws codes; codes are random and single-tester
- [ ] Starting a guest session requires a valid code and the 18+ confirmation; both are stored with the redemption
- [ ] Invalid, used and withdrawn codes get the same 'not valid' response; redemption is rate-limited
- [ ] Target band can be chosen or skipped; language and target band persist across reloads
- [ ] Matrix updated for invite codes on guest sessions (protected; owner approval in Comments)
- [ ] API tests at the HTTP seam; SESS-08 rate-limit case passes

## Comments

### 2026-11-16, owner (via agent `implement` session)
Approved the protected changes for this ticket: matrix AUTH-05 gets `enumerationSensitive` and an invite-code purpose (AUTH-01 waits for 05); new test-support route `POST /__test__/invite-codes` in the harness contract; `tests/security/lib/live.mjs` `env.guest()` and the SESS-08 loop send `{inviteCode, ageConfirmed: true}`; the synthetic fixture-server accepts the same body. UI design pass (Impeccable critique/audit) and browser verification deferred to ticket 07.
