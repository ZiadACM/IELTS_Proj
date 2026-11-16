# 03: Walking skeleton

**What to build:** One Node service serves the React app and the Fastify API with PostgreSQL and migrations, following ADR 0001. The app shows an empty Arabic right-to-left screen frame with an English switch. CI runs lint, type check and build. The test-support routes from the harness contract exist (never in production), so the existing security suites run against a real instance.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] App starts locally with one command and serves the frame with `dir="rtl"` and an English switch
- [ ] Every API response is JSON with `nosniff`; the page CSP has no unsafe-inline, unsafe-eval, wildcard, https: or data: script sources
- [ ] Test-support routes require the token, return 404 without it, and the app refuses to start in production with a token set
- [ ] Security suites run against the instance; results recorded (failures expected for unbuilt features are listed as NOT VERIFIED or failing, not hidden)
- [ ] Coverage gate: every registered endpoint has a matrix row
- [ ] CI lint, type check and build pass

## Comments
