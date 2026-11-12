# Threat model (seed, v0)

Status: **Proposed**. Draft by an agent from the blueprint; the owner must review. Revise when the architecture is chosen (the stack, auth provider and hosting are not decided).

| Asset | Why it matters | Main threats | Where it is addressed |
|---|---|---|---|
| Answer keys, authored routes, transcripts | Leaking them voids exam checks and the product's core promise | Sent to the client early; guessable review endpoints | CODING_STANDARDS 2.2; `ielts-security-review` item 1 |
| Learner accounts and sessions | Personal data; some learners may be minors | Credential stuffing, weak reset flow, session theft, enumeration | `ielts-security-review` item 4 |
| Attempts and progress | Personal learning history | Cross-user access (IDOR), tampering with scores or recommendations | item 3; CODING_STANDARDS 2.1 |
| Exam-mode integrity | Independent readiness is meaningless if bypassable | Replay or hint requests sent directly to the API; timer manipulation | item 2; `verify-user-flow` row 3 |
| Content bank and authoring tools | Wrong or malicious content reaches learners | Unvalidated import; learner access to admin tools; XSS in transcripts | items 5-6; `validate-ielts-content` |
| Secrets and CI | Account or infrastructure takeover | Keys in repo/logs; agents with prod credentials; prompt injection through PR text | items 7, 11 |
| Dependencies | Supply-chain compromise | Malicious or abandoned packages; install scripts | item 8; `docs/development/agent-rules.md` section 5 |
| Future: AI tutor and voice | Cost, abuse, injection, sensitive recordings | Prompt injection via content or user text; key exposure; unbounded spend | item 10 |

Open questions for the owner: age of learners and any parental-consent obligations in target countries; data residency; retention period for attempts; whether accounts are required for the prototype or guest mode is enough.
