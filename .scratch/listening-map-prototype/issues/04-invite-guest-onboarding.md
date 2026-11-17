# 04: Invite codes and guest onboarding

**What to build:** The owner creates, lists and withdraws invite codes with a script. A tester enters a code, confirms they are 18 or over, starts as a guest, sees one optional target band screen, and lands on Home. Settings lets them change interface language and target band.

**Blocked by:** 03 Walking skeleton

**Status:** in-review (branch `agent/invite-guest-onboarding`)

Spec: `../spec.md`

- [x] Owner script creates, lists and withdraws codes; codes are random and single-tester
- [x] Starting a guest session requires a valid code and the 18+ confirmation; both are stored with the redemption
- [x] Invalid, used and withdrawn codes get the same 'not valid' response; redemption is rate-limited
- [x] Target band can be chosen or skipped; language and target band persist across reloads
- [x] Matrix updated for invite codes on guest sessions (protected; owner approval in Comments)
- [ ] API tests at the HTTP seam; SESS-08 rate-limit case passes

## Comments

### 2026-11-16, owner (via agent `implement` session)
Approved the protected changes for this ticket: matrix AUTH-05 gets `enumerationSensitive` and an invite-code purpose (AUTH-01 waits for 05); new test-support route `POST /__test__/invite-codes` in the harness contract; `tests/security/lib/live.mjs` `env.guest()` and the SESS-08 loop send `{inviteCode, ageConfirmed: true}`; the synthetic fixture-server accepts the same body. UI design pass (Impeccable critique/audit) and browser verification deferred to ticket 07.

### 2026-11-16, agent (implement)
Built on `agent/invite-guest-onboarding`. Better Auth 1.7.15 (anonymous plugin) is called from our own literal `POST /auth/guest-sessions`; its HTTP handler is not mounted (05 maps the account routes). Telemetry off; sessions store no IP or user agent (columns hold empty strings). Install scripts: `package-lock.json` shows no new package with `hasInstallScript` (only the existing `fsevents`), and `.npmrc` has `ignore-scripts=true`. Owner script: `npm run invite-codes -w server -- create|list|withdraw`. Only hashes of codes are stored. The same approved test change was also applied to the AUTH-05 recipe in `authorization-enforcement.test.mjs` (otherwise its anonymous cell cannot reach 2xx).

**Results:** `npm test` 45/45; offline security and tools tests 115 pass, 0 fail, 24 skipped (live); lint, type check and build pass. Live suites against a local instance: 37 pass, 24 fail, all at shared setup (`POST /__test__/items` 501, ticket 06). **The SESS-08 suite case itself therefore still fails (NOT VERIFIED).** Its rate-limit steps, replayed with the suite's own `Actor` client against the live instance, gave 201 for tries 1 to 10 and 429 for tries 11 to 30. The retention half needs 17.

**Open for the owner:**
- shortcut: the rate limit is in memory and keyed on `request.ip`. Behind a reverse proxy, every tester shares one limit (10 tries per 15 min) until Fastify `trustProxy` is set for the host.
- shortcut: if redemption fails after Better Auth creates the guest, an orphan guest user stays until retention (17).
- Guest session lifetime is 30 days, extended daily on use (to match D11); confirm with 17.
- New glossary candidates: guest, invite code, target band, interface language.
- Arabic strings need a fluent reader (CS 3.5). Impeccable critique/audit and browser checks are deferred to 07 (NOT VERIFIED).

### 2026-11-16, owner (via agent `implement` session)
Told the agent to resolve the `displayName` conflict itself ("do it yourself"). Done on this branch: ME-02 drops `acceptsUserText` (settings hold no free text); the suites send `targetBand` instead of `displayName`; cross-user checks detect leaks by the victim's userId or their distinct settings instead of a text marker; XSS-02 covers reports only; the synthetic fixture uses `{interfaceLanguage, targetBand}`; the test plan's XSS-02 row is updated. Fixture-proof still shows each vulnerability caught by its own case.
