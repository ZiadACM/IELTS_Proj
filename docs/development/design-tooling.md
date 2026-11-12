# Design tooling: Impeccable (our main design skill)

Decision (owner, 2026-11-12): Impeccable is the single design skill. No other design skill is installed (taste-skill is rejected; Anthropic's frontend-design is not used alongside it). Everything below was **tested in a sandbox on 2026-11-12** unless marked otherwise.

## How we install it, and why not the obvious way
- `npx impeccable install` **downloads the skill bundle from `impeccable.style`** (a signed pointer to whatever version the author's site serves). That is not tied to the commit we audited, so we do not use it.
- `scripts/install-skills.mjs` instead copies the **built skill committed in the repo at the pinned commit** (`pbakaus/impeccable@b4bff16`), hash-checked file by file. It installs `.claude/skills/impeccable`, `.agents/skills/impeccable` (Codex) and two agents (`impeccable-documenter`, `impeccable-finish-reviewer`).
- **Omitted on purpose:** the live-mode browser scripts and the `asset-producer` / `manual-edit-applier` agents. Live mode edits source through an Apply step that can launch an agent CLI with approvals and sandbox disabled; we do not use it.
- The **engine** (a binary the skill runs) downloads on first use from `github.com/pbakaus/impeccable/releases` and is checked against `scripts/engine-checksums.txt` shipped in the skill. I computed the SHA-256 of the downloaded Linux binary myself and it matched (`5dd7f4ad...`, engine 0.1.22). **What the binary does internally is not audited** (no source review of the Rust engine).

## What the hook does (verified by running `hooks on` in a scratch project)
Writes only project-local files: `.impeccable/config.json`, `.impeccable/config.local.json`, `.claude/settings.local.json`. The entries run `.claude/skills/impeccable/scripts/impeccable hook` after `Edit|Write` (immediate checks, 5 s timeout) and on `Stop` (deep pass, 30 s). It runs outside model approval. Hook scans do not upload anything. The detector ran fully offline in the sandbox.

## Network, telemetry, accounts
- When a new design starts the skill fetches design directions from `impeccable.style` (its docs say turning telemetry off stops recording, **not** this request). Expect that traffic.
- Telemetry (which design directions were shown and picked; never code or paths): off with `DO_NOT_TRACK=1` **and** `"telemetry": false` in `.impeccable/config.json` (both are honoured per its docs).
- "Design health" upload (counts and hashes of findings, never code) happens only if you are signed in **and** telemetry is on **and** `CI` is unset. We never sign in. If someone does: `impeccable health off`.
- Never run `impeccable auth login` or `impeccable live`.

## What it caught, and what it did not (one test page, so treat as a sample)
On a deliberately bad Arabic RTL page the detector reported 9 findings (gradient text, glow shadows, overused font, purple palette, 1.8:1 contrast) and exited 2. It did **not** flag `margin-left` or `border-left` on the `dir="rtl"` page, and none of its 64 rules is an RTL rule. The RTL/Arabic guidance lives in the `audit` and `harden` **prompts** (logical properties, mirrored icons, Arabic-Indic digits, Yeh/Kaf variants), which depend on an agent following them. So RTL needs a second line: `verify-user-flow` row 8 plus an automated accessibility scan. RTL checks in `audit` only apply to pages that declare `dir="rtl"`.

## Use
- Plan UX first: `/impeccable shape <feature>`. Our surfaces are **Operate** mode (task UI); the learner's review screens are **Read**.
- Per screen: `critique <screen>`, then `audit <screen>`; fix P0/P1; then `polish`, `harden` (RTL, Arabic, edge cases), `adapt` (devices).
- `/impeccable init` writes `PRODUCT.md`: keep it to a few lines that **point at** `docs/product/ielts_adaptive_learning_product_blueprint.md`. `/impeccable document` writes `DESIGN.md` from the shipped code.
- **CI** (no npm package needed; pinned engine): `sh .claude/skills/impeccable/scripts/impeccable detect src/` (exit 2 = findings, 1 = could not scan). Contrast and tiny-text rules need a rendered page: also scan the dev-server URL (needs Chrome or Edge installed). This checks design only; it is not a security or accessibility gate.

## `.gitignore` additions
```
**/.impeccable/config.local.json
**/.impeccable/hook.cache.json
**/.impeccable/hook.pending.json
**/.impeccable/*.png
**/.impeccable/review/
**/.impeccable/questions/
**/.impeccable/live/
.claude/settings.local.json
```
Commit: `.impeccable/config.json`, `PRODUCT.md`, `DESIGN.md`.

## Not verified
Behaviour inside real Claude Code / Codex sessions; the Codex hook trust flow; the `impeccable.style` roll API (unreachable from the sandbox); the engine's internals; most `reference/*.md` prompts.
