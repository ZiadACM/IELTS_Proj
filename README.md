# IELTS app: agent starter pack (v0.2)

Reviewed, pinned skills plus guardrails and project docs for building the Adaptive IELTS app with Claude Code and/or Codex. **Read `AUDIT.md` first**, then `SOURCES.md`.

Nothing third-party is bundled. An AI (or you) installs the skills from their upstream repos, at pinned commits, and the installer refuses anything that differs from what was audited.

## Tell the AI
```
Follow docs/development/INSTALL-FOR-AGENTS.md. Install phase A. Report as specified.
```
Put your two documents in the repo first: `docs/product/ielts_adaptive_learning_product_blueprint.md` and `docs/development/agentic-playbook.md`.

## What is inside
```
skills-manifest.src.json     what we install and why (owner edits)       skills-manifest.lock.json  pinned commits + SHA-256 of every file (generated)
scripts/install-skills.mjs   the only way skills get installed          scripts/lock-manifest.mjs  owner-only: re-pin after an audit
docs/development/INSTALL-FOR-AGENTS.md   runbook for the AI             docs/development/design-tooling.md   Impeccable, locked down
docs/development/agent-rules.md  workflow + overrides (AGENTS.md / CLAUDE.md are thin adapters pointing here)
CODING_STANDARDS.md  GLOSSARY.md  docs/security/*  docs/agents/*        skills/ (our 4 skills)   tools/validate-content.mjs (+ tests)
.claude/ settings + fail-closed git guard hook                          third-party/ licences, install record, original upstream hook
```

## Skills: 26 core (22 third-party + 4 ours), 7 optional
| Phase | Installs |
|---|---|
| **A** planning | grill-with-docs, grilling, domain-modeling, to-spec, to-tickets, handoff, prototype, wait-what, writing-for-agents, research, **impeccable** (main design skill) |
| **B** content | validate-ielts-content (ours), property-based-testing |
| **C** build | ponytail, tdd, implement, codebase-design, diagnosing-bugs, code-review, principle-prove-it-works, blast-radius, pr, verify-user-flow (ours) |
| **D** after first slice | create-verification-skill (adapted), retro |
| **pre-launch** | ielts-security-review (ours; full security review deferred by owner decision) |
| optional (ask by name) | to-questionnaire, setup-pre-commit, show-me-your-work, wayfinder*, improve-codebase-architecture*, differential-review*, supply-chain-risk-auditor* (*partial audit: needs owner approval) |

## Run the app (Node 24.16+, Docker)
```bash
npm ci            # .npmrc turns off dependency install scripts
npm start         # starts PostgreSQL (compose.yaml), builds web/, runs the server on http://127.0.0.1:3000
npm test          # server tests (needs the database: npm run db:up)
npm run lint && npm run typecheck && npm run build
npm run invite-codes -w server -- create 3     # owner only: new invite codes (shown once); also: list, withdraw <id>
npm run reset-links -w server                  # owner only: pending password-reset links, to send by hand
npm run staff-roles -w server -- grant <email> content_reviewer   # owner only: staff roles (content_author, content_reviewer, admin); also: revoke, list
```
Production needs `AUTH_SECRET` (32+ random characters, not the `server/dev.env` value) and `PUBLIC_ORIGIN`; the app refuses to start without them.
Security suites against the running app: start it with `SECURITY_TEST_SUPPORT_TOKEN=<random 32+ chars> npm start`, then run `SECURITY_BASE_URL=http://127.0.0.1:3000 SECURITY_TEST_SUPPORT_TOKEN=<same> node --test --test-concurrency=1 tests/security/*.test.mjs` (`docs/security/test-harness-contract.md`).

## Check the pack yourself (Node 22+, bash, git)
```bash
node --test tools/*.test.mjs scripts/lib/*.test.mjs
bash scripts/test-git-guard.sh
bash scripts/test-installer.sh        # needs network to github.com
node scripts/install-skills.mjs plan
```

## First moves (Phase A)
1. `/grill-with-docs` on the Reading skill tree, then Listening. You answer; it writes `GLOSSARY.md` and ADRs.
2. `/impeccable shape` for the key screens (Operate mode), `/to-spec`, then `/to-tickets` for Listening Map Labelling.
3. `/prototype` Answer Replay first (can we author a route, transcript and audio cues that stay in sync, with scrub?) before any full build.

## Decisions for you (all rules are **Proposed**)
Approve enabling Impeccable's hook (runs a downloaded binary after UI edits); test-first only for pure logic; local tracker in `.scratch/`; sub-agent cap of 2; the protected-files list enforced by CODEOWNERS + CI; the optional pre-pilot security check (`docs/security/pre-launch-review.md`, Tier 1); whether to keep Ponytail (its value rests on the author's own benchmark).

## Known limits
Untested inside Claude Code and Codex; our 3 skills are unrun drafts; the content schema is a draft; the git hook is a blocklist; the lock is only as trustworthy as who can edit it. Full list: `AUDIT.md`.
