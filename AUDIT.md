# Audit record (2026-11-12)

Method: every repo was cloned and its skill files, hooks and scripts read; network, process-execution and file-write calls searched for; the pinned lock generator then scanned every file we would install for risky patterns (output reviewed). Impeccable's installer, engine download and hook were **run in a sandbox**. Nothing else third-party was executed. READMEs and star counts were not treated as evidence.

Audit levels: **full** = SKILL.md and every script read, companion docs pattern-scanned. **partial** = read only in part; installing needs explicit owner approval.

## Decisions by repo
| Repo | Took | Left out (why) |
|---|---|---|
| **mattpocock/skills** (27 main skills) | 17 core: grill-with-docs, grilling, domain-modeling, to-spec, to-tickets, handoff, prototype, wait-what, writing-for-agents, research, tdd, implement, codebase-design, diagnosing-bugs, code-review, pr, retro. 4 optional (to-questionnaire, setup-pre-commit, wayfinder, improve-codebase-architecture) | implement-spec (parallel sub-agents, agent-side merging), triage, ask-matt, grill-me, teach, wizard, plus misc/in-progress: not needed |
| **Ponytail** (1 skill) | the one skill, `SKILL.md` only | hooks (band-import reads past Claude Code transcripts), band, board, optional per-turn webhook, slash commands |
| **pstack** (58 skills) | principle-prove-it-works, blast-radius; show-me-your-work (optional); create-verification-skill adapted into `skills/` | the other ~54: not needed, not read |
| **Trail of Bits** (47 plugins) | property-based-testing; differential-review, supply-chain-risk-auditor (optional, partial) | the rest: mostly smart-contract/native-code |
| **Impeccable** (1 skill, 24 commands) | the skill (pinned build) + 2 agents | website bundle installer, live mode, asset-producer and manual-edit-applier agents |
| no-ai-slop, taste-skill, HyperFrames, autoresearch, Anthropic skills | nothing | see `skills-manifest.src.json` `rejected` |

## Left-out Pocock skills, now read
| Skill | Read | Verdict |
|---|---|---|
| diagnosing-bugs | full + its script | **Take.** Feedback-loop-first debugging; redacts secrets; fits audio/route sync bugs |
| codebase-design | full | **Take.** `tdd` refers to it. `DESIGN-IT-TWICE` spawns sub-agents (counts toward the cap) |
| research | full | **Take.** Primary-source research (e.g. official IELTS facts). Spawns one background agent |
| wait-what | full | **Take.** Re-explains in simple technical English with our glossary terms; user-invoked |
| pr | full | **Take.** PR body with evidence, one-way/two-way door, blast radius |
| retro | full | **Take (phase D).** Suggests harness improvements; reads local session logs |
| writing-for-agents | full + SKILL-MECHANICS | **Take.** Style guide for skills/AGENTS.md; no scripts |
| to-questionnaire | full | Optional: questionnaire for an IELTS teacher, Arabic reviewer or lawyer |
| setup-pre-commit | full | Optional: only if the stack is Node/TypeScript (Husky, lint-staged, Prettier; runs tests every commit) |
| wayfinder, improve-codebase-architecture | head only | Optional, **partial**: read the rest before asking for them (the latter writes an HTML report to the temp dir and tries to open it) |
| implement-spec | full | **Reject**: parallel sub-agents in worktrees plus a merger sub-agent; conflicts with "a human merges" and the sub-agent cap |
| triage, ask-matt, grill-me, teach, wizard | descriptions/size only | Reject: not needed (not audited) |

## Impeccable: what I ran (sandbox, 2026-11-12)
- `npx impeccable install` tried to download its bundle from `impeccable.style` (blocked here). The bundle is signature-checked but is **whatever version the site serves**, not our commit. We do not use it.
- Copying the committed build from the pinned commit works. The launcher downloaded the engine from a GitHub release; my own SHA-256 of the binary equals `engine-checksums.txt` (`5dd7f4ad...`).
- `hooks on` wrote only `.impeccable/config.json`, `.impeccable/config.local.json`, `.claude/settings.local.json`. Entries: `PostToolUse Edit|Write` and `Stop`, running the local launcher. No global files except the engine cache `~/.impeccable/bin/<version>/`.
- `detect` works offline: 9 findings on a bad RTL page, exit 2. **No deterministic RTL rule** (none of 64 rules); RTL lives in the `audit`/`harden` prompts.
- Its docs describe: a roll API call to `impeccable.style` when a design starts; telemetry (off via `DO_NOT_TRACK=1` or `"telemetry": false`); a "design health" upload of counts/hashes only when signed in and telemetry on. Details: `docs/development/design-tooling.md`.
- Risky-pattern hits in its scripts: the launcher's `curl`/`wget`/`chmod` for the engine download (checksum-verified). Nothing else.

## Verified by running
| What | Result |
|---|---|
| Installer vs earlier audited copies | 14 skills **byte-identical**, 0 differences |
| `bash scripts/test-installer.sh` (needs network) | 14 cases: tamper (installed file, tool copy, extra file, hook), hash mismatch aborts and writes nothing, bad pinned commit, destination outside allowed folders, path traversal, partial-audit gate, approvals |
| `node --test scripts/lib/*.test.mjs` | 8 tests: symlinks, size limits, include/exclude, path and URL safety, commit format |
| `bash scripts/test-git-guard.sh` | 32 cases incl. 3 documented bypasses; fails closed on empty input |
| `node --test tools/*.test.mjs` | 24 content-validator tests |
| Upstream git-guardrails hook | **fails open without `jq`** (`git push` allowed); replaced |

## Not verified (be honest about these)
- That Claude Code or Codex load these skills, the hook and the settings (not tested in either tool); the `permissions.deny` syntax.
- The 3 project skills, `ielts-security-review`, `validate-ielts-content`, `verify-user-flow`, are unrun drafts. The validator's schema is a draft v0 invented from the blueprint.
- Impeccable's engine internals and most of its `reference/*.md`; any behaviour needing `impeccable.style`.
- The lock is the trust anchor: whoever can edit `skills-manifest.lock.json` can change what "audited" means. It is on the protected-files list; enforce with CODEOWNERS and CI.
- Skills were checked at one point in time; pins stop silent upgrades but do not re-audit.

## Gaps still open
Deterministic security scanners (stack-dependent); a Playwright + axe harness (needs the first slice); screen-reader and real-device testing (human); design system and Arabic type choices (human); curriculum/learning-science skill (write with the owner in Phase A); audio alignment tooling; Arabic copy review (fluent human); privacy/legal; CI, deploy, observability; an agent evaluation suite (playbook section 12).
