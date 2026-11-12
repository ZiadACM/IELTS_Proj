# Threat model (seed, v0.1)

Status: **Proposed**. Drafted by an agent from the blueprint; updated 2026-11-12 with the owner decisions in `docs/product/owner-decisions.md`. Revise when the architecture is chosen (stack, auth provider and hosting are not decided yet). A qualified human must review it before public launch (D15).

| Asset | Why it matters | Main threats | Where it is addressed |
|---|---|---|---|
| Answer keys, authored routes, transcripts | Leaking them voids exam checks and the product's core promise | Sent to the client early; guessable review endpoints | CODING_STANDARDS 2.2; `ielts-security-review` item 1; test plan LEAK-* |
| Learner accounts, guest sessions and sessions | Personal data; pilot is adults-only (D12), public age policy is open | Credential stuffing, weak reset flow, session theft, enumeration; mass creation of guest sessions (spam, storage cost); guest-to-account upgrade hijack (attaching someone else's guest data) | `ielts-security-review` item 4; test plan AUTH-* |
| Attempts and progress | Personal learning history | Cross-user access (IDOR), tampering with scores or recommendations | item 3; CODING_STANDARDS 2.1; test plan AUTHZ-* |
| Exam-mode integrity | Independent readiness is meaningless if bypassable | Replay or hint requests sent directly to the API; timer manipulation; re-fetching exam audio (D9); parallel or repeat attempts to read a review first (D10) | item 2; `verify-user-flow` row 3; test plan EXAM-* |
| Content bank and authoring tools | Wrong or malicious content reaches learners | Unvalidated import; learner or guest access to admin tools; XSS in transcripts (validator now rejects markup, D4; rendering must still escape) | items 5-6; `validate-ielts-content`; test plan CONTENT-*, XSS-* |
| Secrets and CI | Account or infrastructure takeover | Keys in repo/logs; agents with prod credentials; prompt injection through PR text | items 7, 11; test plan SECRET-*, CI-* |
| Dependencies | Supply-chain compromise | Malicious or abandoned packages; install scripts | item 8; `docs/development/agent-rules.md` section 5; test plan DEP-* |
| Future: AI tutor and voice | Cost, abuse, injection, sensitive recordings | Prompt injection via content or user text; key exposure; unbounded spend | item 10; test plan AI-* |

Resolved owner questions (2026-11-12): accounts are optional in the prototype and guest mode is used (D5, D14); retention values are set (D11, pending legal review); pilot is adults-only (D12).

Still open: age policy and parental consent for the public version (D12b); data residency for the public version (D13). Both need legal advice.
