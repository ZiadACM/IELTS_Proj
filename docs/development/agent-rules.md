# Agent rules (canonical)

`AGENTS.md` and `CLAUDE.md` are thin adapters that point here. Edit **this** file, never the adapters, so the two tools cannot drift. Status of every rule: **Proposed** until the owner marks it Agreed. Agreed so far (2026-11-12): the sub-agent cap, test-first only for pure logic, the `.scratch/` tracker, protected files, the Tier 1 pre-pilot check, Ponytail (provisional), and Impeccable's hook deferred to the first UI ticket. See `docs/product/owner-decisions.md` (D1 to D16).

## 1. Always

- Read `GLOSSARY.md`, relevant `docs/adr/*`, and `CODING_STANDARDS.md` before changing code. Use glossary terms exactly.
- Work only on a branch named `agent/<slug>`. **Never commit to `main`. Never push, merge, deploy, or touch production or credentials.** A human merges. (`.claude/hooks/block-dangerous-git.sh` backs this up but is not a boundary; see its header.)
- Never claim a check passed unless you ran it and saw the result. Anything not run is reported as **NOT VERIFIED** with the reason.
- Stay inside the approved spec. If implementation shows the spec is wrong, stop and raise it; do not silently change product behaviour.
- Do not edit **protected files** (list in `CODING_STANDARDS.md` section 7) to make a failing check pass. Fix the code, or ask.

## 2. Workflow (use the skill that matches the step)

| Step | Skill | Notes |
|---|---|---|
| Decide / specify | `grill-with-docs` | Interview, then glossary + ADRs. Human answers every decision. |
| Write the spec | `to-spec` | Add the **extra sections** in section 3 below. |
| Split into work | `to-tickets` | Vertical slices; each ticket independently verifiable. |
| Build | `implement` | `tdd` only for pure logic (scoring, adaptive rules, replay timing, content validation). Keep `ponytail` at level `full`. |
| Spike a risky idea | `prototype` | Throwaway branch only; never merged. |
| Plan the UX | `impeccable shape` | Before UI code. This is an **Operate** surface (a task app), not a landing page. |
| Design review | `impeccable critique`, `audit` | Per screen before review; then `polish` and `harden` (RTL, Arabic, edge cases). Hook needs owner approval. |
| Debug | `diagnosing-bugs` | Build a red-capable loop first; redact secrets and learner data. |
| Research facts | `research` | Primary sources only (official IELTS pages, library docs); output to `docs/`. |
| Owner needs a re-explain | `wait-what` | Simple technical English, glossary terms. |
| Edit AGENTS.md / skills | `writing-for-agents` | Keep adapters thin. |
| PR body | `pr` | Evidence + one-way/two-way door + blast radius. |
| Improve the harness | `retro` | After a session with repeated agent mistakes (playbook section 12). |
| Prove it works | `verify-user-flow` | Real browser, mobile + desktop + RTL. Browser tests are written **after** the behaviour works. |
| Security | `ielts-security-review` | **Deferred to pre-launch** (owner decision). Do not run it per change. `CODING_STANDARDS.md` section 2 still binds all code as a design constraint. See `docs/security/pre-launch-review.md`. |
| Content | `validate-ielts-content` | Required for any content item change. Humans publish. |
| Review the diff | `code-review` | Cap: **at most 2 sub-agents running at once across ALL skills** (`code-review`, `research`, `codebase-design`'s design-it-twice, Impeccable's agents); sub-agents may not delegate further. |
| Pass work on | `handoff` | Override: write to `docs/development/handoffs/<date>-<slug>.md` (committed), not the temp dir. Redact secrets and personal data. |

Run order for a feature: spec -> tickets -> implement -> verify-user-flow -> content review as applicable -> code-review -> human merge.

## 3. Project overrides to third-party skills

- **Issue tracker:** local markdown under `.scratch/<feature-slug>/` (see `docs/agents/issue-tracker.md`). `.scratch/` **is committed**; do not gitignore it.
- **Every spec** produced by `to-spec` must also contain these sections (the upstream template has none of them): `## Security & Privacy`, `## Accessibility, RTL & Responsive`, `## Failure & Empty States`, `## Content Validation` (if content is touched), `## Done Checklist` (copy from `docs/development/agentic-playbook.md`, section 18).
- **`implement`** may commit only to the current `agent/*` branch.
- **`tdd`**: confirm seams with the human before writing tests (the skill requires this). Expected values come from an independent source (spec, worked example, golden fixture), never from re-running the code.
- **`ponytail`** never overrides the spec's scope, and never removes validation, error handling, security, or accessibility.
- **Skills not installed** that these skills mention (`codebase-design`, `setup-matt-pocock-skills`): ignore the reference; `docs/agents/*` already contains the setup output.

## 4. Completion report (end of every task)

```
Objective: ...                      Branch / commits: ...
Changed: <files, one line each>     Decisions made: ...
Ran (with result): <commands>       NOT VERIFIED: <list + why>
Known issues / risks: ...           Next action: ...
```

## 5. Installing and adopting skills

Install only through `scripts/install-skills.mjs`, following `docs/development/INSTALL-FOR-AGENTS.md`.

To adopt any NEW skill, plugin, hook or MCP server: do not install it. Open a proposal listing: the approved need, source and pinned commit, what its `SKILL.md`, scripts, hooks and network calls do (you must have read them), what permission it asks for, and whether it duplicates something here. The owner approves. Vendored skills are checksummed (`scripts/verify-vendored.sh`); a mismatch is a stop-and-ask.
