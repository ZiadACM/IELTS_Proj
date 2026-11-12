# AGENTS.md

Adaptive IELTS learning app (Academic Reading and Listening; Arabic-speaking learners; free first release).

All rules live in **`docs/development/agent-rules.md`**. Read it first. Do not duplicate rules here.

## Agent skills

### Issue tracker
Local markdown under `.scratch/` (committed). See `docs/agents/issue-tracker.md`.

### Domain docs
Single context: `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.

### Standards
`CODING_STANDARDS.md` (security, content, accessibility/RTL, design, testing, protected files). Skills install only via `docs/development/INSTALL-FOR-AGENTS.md`.

### Hard rules (repeated because they matter most)
Never commit to `main`; never push, merge, deploy, or use production credentials. Report anything not run as NOT VERIFIED.
