---
name: ielts-security-review
description: Security review for the IELTS learning app (learner accounts, attempts and progress, answer keys, audio, content authoring, later AI tutor). Use before merging anything touching auth, sessions, progress/attempt data, answer or review endpoints, file/audio serving, user input, dependencies, CI, or secrets; when adding a dependency; and for a periodic whole-repo pass. Named ielts-security-review to avoid shadowing the built-in /security-review.
---

# IELTS app security review

Find real, evidenced problems in this app's actual attack surface. You are a reviewer, not a guarantor: **never write "secure" or "no vulnerabilities found."** Write what you checked, what you found, and what you could not verify.

Read first if present: `docs/security/threat-model.md`, `CODING_STANDARDS.md` (security section), the feature spec for the change. If no threat model exists, say so and build a 10-line one from the table below before reviewing.

## Rationalizations to refuse

| Thought | Why it is wrong | Do instead |
|---|---|---|
| "Small diff, low risk" | Risk follows what the code touches, not its size | Classify by the table below |
| "The UI hides it" | The client is attacker-controlled | Check the server enforces it |
| "It's only practice data" | Learning history is personal data, and some learners are minors | Treat as personal data |
| "The scanner passed" | Scanners miss authorization and business-logic flaws | Read the access-control paths by hand |
| "Tests pass" | Tests cover intended behaviour | Try the unintended: other user's id, replayed request, skipped step |

## Attack surface specific to this app (check every one the change touches)

1. **Answer-key and evidence leakage (highest priority).** Correct answers, route/event data, transcripts, and explanations must not reach the client before the attempt is submitted, and never in exam mode. Check API responses and bundled JSON, not only the UI. A "hidden" correct answer in a response body is a failed exam.
2. **Mode enforcement on the server.** Exam-mode rules (one listen, no hints, no replay, timer) are enforced server-side or are advisory only. Try the forbidden action directly against the API.
3. **Cross-user access (IDOR).** Every read/write of attempts, progress, recommendations, settings is scoped to the authenticated user server-side. Substitute another user's id/attempt id in each request. Admin/content tools require a separate role.
4. **Authentication and sessions.** Established provider or library, no home-grown crypto; secure cookie flags or token storage; expiry, logout and reuse behaviour; rate limiting and lockout on login/reset; account-enumeration-safe messages.
5. **Input and output handling.** All input validated at the trust boundary; no string-built queries; rendering escapes by default. Treat these as untrusted: user-entered text, error reports, imported content files, transcripts, **and AI model output** (later tutor). Check `dangerouslySetInnerHTML`-style sinks and any markdown/HTML renderer.
6. **Content and file handling.** Audio/media served from an allow-listed location; no path built from user input; upload (if any) type/size limits; content import validated by `tools/validate-content.mjs` before use; authoring tools not reachable by learners.
7. **Secrets and config.** No keys in code, logs, client bundles, fixtures or CI output. Fail-closed defaults (a missing config must stop the app, not weaken it). Separate dev/test/staging/prod; test data synthetic. Debug endpoints and verbose errors off outside local.
8. **Dependencies and supply chain.** For each new dependency: is it needed (platform feature or existing dep instead?), maintained, pinned in the lockfile, and free of install-time scripts you did not read. Run the audit command for the chosen package manager; record the output.
9. **Privacy.** Collect the minimum; define retention and deletion; no learner PII in logs or analytics; consider that learners may be under 18 and that future voice recordings are sensitive. Third-party scripts only with a stated reason.
10. **AI features (when they exist).** Provider keys server-side only; per-user quotas and rate limits; prompts never include other users' data; model output cannot trigger actions or alter scores/answer keys; prompt-injection through content and user text considered; cost/abuse monitoring.
11. **CI and agent tooling.** Agents have least privilege; no production credentials in the agent environment; CI workflows that run agents on untrusted PR text are a known injection path.

## Method

1. **Classify** the change: HIGH (auth, sessions, authz, answer/review endpoints, secrets, new dependency, data deletion/migration), MEDIUM (business rules, new endpoints, input handling), LOW (copy, styling, tests). Review HIGH fully, MEDIUM focused, LOW by skim; say which you skipped.
2. **Trace trust boundaries**: where does data enter, who is the caller, what does the server check before acting.
3. **Attack it**: for each HIGH/MEDIUM path write the concrete abuse request (who sends what, expecting what) and run it if a test environment exists. A finding needs evidence: `file:line` plus the exact request or input.
4. **Run deterministic tools that exist** (dependency audit, secret scan, SAST such as Semgrep; `impeccable detect` checks design only and does not count here). If a tool is not installed, record it as **NOT VERIFIED**; do not install it silently.
5. **Report** in the format below. Save to `docs/security/reviews/<date>-<change>.md` for HIGH changes.

## Report format

```
Scope: <what was reviewed>   Risk class: HIGH|MEDIUM|LOW   Reviewer context: fresh|same-session
Findings (most severe first):
  [CRITICAL|HIGH|MEDIUM|LOW] <title>
    Where: file:line   Evidence: <request/input and observed result>
    Impact: <who is harmed, how>   Fix: <specific change>   If skipped: <consequence>
Checked and clear: <list, each with how you checked>
NOT VERIFIED: <list, with why (tool missing, no test env, no audio, etc.)>
Needs a human: <auth/crypto/migration/privacy decisions you will not make alone>
```

## Hard stops (ask the human, do not proceed)

Auth or session mechanism changes; anything touching production data or credentials; destructive migrations; disabling a security control "temporarily"; adding a dependency with install scripts you cannot read.

This review is an aid. High-risk changes still need a qualified human security assessment before public launch.
