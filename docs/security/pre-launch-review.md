# Pre-launch security review plan

Status: **Proposed**. Owner decision (2026-11-12): the full security review is reserved until the app is fully developed. This file says what that review is, and what it needs to be able to start.

## Tier 2: full review (before public release) 
Scope: the whole repo and deployed staging. Install the skill first: `bash scripts/sync-skills.sh ielts-security-review`.
1. Finalise `docs/security/threat-model.md` against the real architecture (auth provider, hosting, storage).
2. Run `ielts-security-review` over the whole repo; save the report in `docs/security/reviews/`.
3. Run deterministic tools chosen for the stack: dependency audit, secret scan over the full git history, SAST (e.g. Semgrep). Record anything not run as NOT VERIFIED.
4. Attack the two things this product depends on, against staging, with a second account: (a) fetch answer keys / routes / transcripts before submitting, and in exam mode; (b) perform exam-forbidden actions (replay, hint, timer) directly against the API; then try another user's attempt and progress ids.
5. Evaluate Trail of Bits `supply-chain-risk-auditor`, `insecure-defaults` and (if agents run in CI) `agentic-actions-auditor` after reading their scripts.
6. A qualified human reviews the HIGH findings and the auth design. Agent review is an aid, not a sign-off.
Gate: no public launch with open CRITICAL/HIGH findings.

## Tier 1: small pre-pilot check (before any real testers) - recommended, you may decline
The selective prototype involves real people (the blueprint suggests 15-30 learners), so personal data exists even if the app is unfinished. A half-day, not a full audit:
- No real learner data in non-production environments; production secrets not in the repo or agent environment.
- Testers cannot read each other's attempts (item 3 of the skill) and cannot get answer keys early.
- Collect the minimum: if accounts are not needed for the pilot, use anonymous sessions.
- Hosting basics: HTTPS only, no debug endpoints, backups of tester data, a way to delete a tester's data on request.

## Why some items cannot wait for the end
These are cheap to build in and costly to retrofit, which is why `CODING_STANDARDS.md` section 2 stays binding now: server-side authorization, not shipping answer keys to the client, server-side exam-mode rules, secrets handling, and data minimisation. Finding them wrong at the end can mean redesigning the API and data model, not patching.
