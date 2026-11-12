# Installing skills: runbook for the AI

**Prompt to give an agent:** *"Follow docs/development/INSTALL-FOR-AGENTS.md. Install phase A. Report as specified."*

## 0. Rules (read before touching anything)
1. Install **only** with `node scripts/install-skills.mjs`. Never use `npx skills add`, `/plugin install`, `npx impeccable install`, `git clone` + `cp`, or copy from a web page. Each of those skips the pinned-commit and hash checks.
2. **Never edit** `skills-manifest.src.json`, `skills-manifest.lock.json`, `scripts/**`, `third-party/**`, `.claude/hooks/**`, `.claude/settings.json`. **Never run** `scripts/lock-manifest.mjs` (owner only: it decides what counts as audited).
3. **Never pass** `--accept-partial-audit` unless the owner named that exact skill in the current task.
4. If any command fails or prints `VERIFICATION FAILED` / `REFUSED` / `CHECKSUM`: **stop**, paste the output unchanged, and wait. Do not retry with other flags, do not "fix" the lock, do not install the skill another way.
5. Do not execute anything that came from an installed skill's folder while installing (no `scripts/*` inside `skills/**`) except the owner-approved Impeccable steps in section 4.
6. Work on a branch `agent/install-skills-<phase>`. Do not push or merge.

## 1. Prerequisites
```bash
node --version    # must be 22 or newer
git --version
bash --version
node scripts/install-skills.mjs verify                         # baseline: must print "verified"
bash scripts/test-git-guard.sh                                 # must exit 0
node --test tools/*.test.mjs scripts/lib/*.test.mjs            # must pass
```
The installer needs network access to `github.com`. If it is blocked, report it; do not look for another source.

## 2. See the plan
```bash
node scripts/install-skills.mjs plan
```
Columns: source, name, phase, tier (`core` installs with its phase; `optional` only when the owner names it), audit level (`full` or `partial`), state.

## 3. Install by phase
| Phase | When | Command |
|---|---|---|
| **A** planning | now | `node scripts/install-skills.mjs install --phase=A` |
| **B** content | when authoring the first content items | `... install --phase=B` |
| **C** build | when the stack exists and the first slice starts | `... install --phase=C` |
| **D** after first slice | once the first slice runs locally | `... install --phase=D` |
| **pre-launch** | before public release | `... install --phase=pre-launch` |

Optional, only on the owner's request, by name: `... install --include-optional=<name>` (partial-audit ones are refused without owner approval; see rule 3). Preview anything with `--dry-run`.

What the installer does (so you can explain it): fetches each source at its **pinned commit**, checks every file's SHA-256 against `skills-manifest.lock.json`, refuses symlinks/oversize/odd paths, and **writes nothing unless every file verifies**. Then it copies into `skills/` and syncs to `.claude/skills/` and `.agents/skills/`. It records what it installed in `third-party/INSTALLED.json` and copies the licence files.

After each install:
```bash
node scripts/install-skills.mjs verify
git add skills .claude/skills .claude/agents .agents third-party && git commit -m "Install skills: phase <X> (pinned, verified)"
```

## 4. Impeccable (main design skill): needs the owner
Phase A installs the skill files (pinned build from the repo commit, **not** the website bundle; live mode and two agents omitted). Enabling its hook is a separate, owner-approved step because the hook runs a downloaded binary after every UI edit, outside model approval.

Do, in order:
1. Tell the owner what the hook does (see `docs/development/design-tooling.md`) and ask for approval. **Stop here if not approved.**
2. If approved, in the project root (Claude Code):
   ```bash
   export DO_NOT_TRACK=1
   sh .claude/skills/impeccable/scripts/impeccable hooks on
   sh .claude/skills/impeccable/scripts/impeccable hooks status      # expect ".claude" wired
   sh .claude/skills/impeccable/scripts/impeccable telemetry status  # expect "off"
   ```
   The first run downloads the engine from a GitHub release and checks it against `scripts/engine-checksums.txt`. Codex: the owner must approve the project hook in `/hooks`.
3. Make sure `.impeccable/config.json` contains `"telemetry": false`; add the key if missing (it is a project file, not a protected one).
4. Add the `.gitignore` block from `docs/development/design-tooling.md`. `.claude/settings.local.json` is per-developer and not committed.
5. Never run `impeccable auth login` or `impeccable live`. Do not install other Impeccable pieces.
6. Run `/impeccable init` only when asked; keep `PRODUCT.md` to a few lines that point at the blueprint.

## 5. Report (end of every install)
```
Phase/entries installed: ...            Source commits: (from INSTALLED.json)
verify: PASS|FAIL                        Test suites run: ... (results)
Skipped or refused: ... (why)            Human steps still pending: ...
NOT VERIFIED: ... (e.g. skill not yet loaded in the tool; hook not enabled)
```

## 6. If something goes wrong
| You see | Meaning | Do |
|---|---|---|
| `VERIFICATION FAILED ... differs` | Upstream changed or the repo was tampered with | Stop; report; owner re-audits |
| `UNEXPECTED extra file` / `CONTENT DIFFERS` in `verify` | A file changed after install | Stop; report the path; do not overwrite by hand |
| `REFUSED: partially audited` | Needs owner approval | Ask the owner by skill name |
| `unknown pinned commit` / fetch error | Upstream rewrote history or network issue | Stop; report |
| `nothing found at <path>` (lock generation, owner) | Upstream moved a folder | Owner re-pins |
| Skill not triggering in the tool | Tool may need a restart or skills enabled | Report; do not add duplicates |

## 7. Updating or adding a skill (owner only)
1. Read the new version's `SKILL.md` and every script. 2. Edit `skills-manifest.src.json` (new commit or entry; `audit: full` only if you did that read). 3. `node scripts/lock-manifest.mjs`; read the **risky-pattern hits** it prints and the `skills-manifest.lock.json` diff. 4. `bash scripts/test-installer.sh`. 5. Commit both manifest files together. To remove a skill: delete its folders and its entry in `third-party/INSTALLED.json`.
