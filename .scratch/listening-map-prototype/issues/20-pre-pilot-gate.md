# 20: Pre-pilot gate

**What to build:** Before any tester is invited: the security suites pass against the real app (Tier 1 pre-pilot check, D2), browser tests cover the main flows on mobile, desktop and RTL, and an accessibility scan is clean.

**Blocked by:** 01 to 19 (all other tickets)

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] All live security suites pass with SECURITY_REQUIRE_TARGET=1
- [ ] Playwright: onboarding to first review; Answer Replay and reduced motion; independent check to automatic submit; Browse and Progress; at 360 px, 390 px and desktop, in RTL and English
- [ ] Accessibility scan has no serious or critical findings
- [ ] Every item in the spec's Done Checklist ticked or recorded as an approved gap
- [ ] Owner's GitHub repository protections from the security baseline confirmed

## Comments
