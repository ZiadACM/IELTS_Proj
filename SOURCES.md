# Sources, pins and licences

**Nothing third-party is bundled in this pack.** Skills are installed by `scripts/install-skills.mjs` from the repos below at the pinned commits, and refused unless every file matches the SHA-256 recorded in `skills-manifest.lock.json` (what was audited). The human-edited list is `skills-manifest.src.json`. Runbook: `docs/development/INSTALL-FOR-AGENTS.md`.

| Upstream | Pinned commit | Licence | Core (installed by phase) | Optional (owner asks by name) |
|---|---|---|---|---|
| mattpocock/skills | `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d` | MIT | grill-with-docs, grilling, domain-modeling, to-spec, to-tickets, handoff, prototype, wait-what, writing-for-agents, research, tdd, implement, codebase-design, diagnosing-bugs, code-review, pr, retro | to-questionnaire, setup-pre-commit, wayfinder, improve-codebase-architecture |
| DietrichGebert/ponytail | `96608e078b2d5ea607c5c3b8b5a54d1c1fba6846` | MIT | ponytail | - |
| cursor/plugins | `a5539b15a3d56e04992565aafee2b37051329ce3` | MIT | principle-prove-it-works, blast-radius | show-me-your-work |
| trailofbits/skills | `e4dd0bb5b15535f7c5a0834187dffba6ac37e4ff` | CC-BY-SA-4.0 | property-based-testing | differential-review, supply-chain-risk-auditor |
| pbakaus/impeccable | `b4bff1626c344067788c2679f048a20057c7cc5a` | Apache-2.0 | impeccable | - |

## Things we wrote or adapted (committed here, hash-checked by `verify`)
| File | Origin | Change |
|---|---|---|
| `skills/create-verification-skill/` | pstack `create-verification-skill` (MIT, (c) 2026 Lauren Tan), same commit as above | output path `.cursor/skills` -> `skills/`; removed a dangling pointer; header note |
| `.claude/hooks/block-dangerous-git.sh` | mattpocock/skills `git-guardrails-claude-code` (MIT) | rewritten: no `jq` dependency (**upstream fails open without it, verified**), tolerates extra spaces/options, also blocks `gh pr merge` and `rm -rf` of `/`, `~`, `.` |
| `third-party/upstream/block-dangerous-git.sh.orig` | the original upstream script | kept for diffing |
| `docs/agents/domain.md` | mattpocock/skills setup template (MIT) | header comment only |
| `skills/ielts-security-review`, `validate-ielts-content`, `verify-user-flow`, `tools/*`, docs | written for this project | n/a |

## Licence notes (not legal advice)
- **Trail of Bits** skills are **CC-BY-SA-4.0**: installed unmodified with their licence. If you modify one, the adapted version must also be CC-BY-SA-4.0.
- **Impeccable** is Apache-2.0 (its `NOTICE.md` is installed with it). Others are MIT; licence files are copied to `third-party/licenses/` on install.

## Not installed, by decision
See the `rejected` list in `skills-manifest.src.json` and `AUDIT.md`.
