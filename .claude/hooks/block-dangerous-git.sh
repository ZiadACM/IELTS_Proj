#!/bin/bash
# Blocks destructive git/gh/rm commands before Claude Code runs them (PreToolUse hook on Bash).
# Adapted from mattpocock/skills git-guardrails-claude-code (MIT). See SOURCES.md.
# Changes vs upstream: (1) no jq dependency: upstream silently ALLOWS everything when jq is missing, i.e. it fails
# open; this version scans the raw hook JSON so it cannot. (2) tolerates extra spaces and options between `git`
# and the subcommand (`git -C . push`). (3) also blocks gh merges/releases and rm -rf of /, ~ or the cwd.
# LIMITS: this is a pattern blocklist, defence in depth only. Indirection (variables, eval, split strings, a script
# that runs git) can bypass it. Real controls: give the agent NO push credentials, keep permissions.deny in
# .claude/settings.json, and require human merge. It may over-block (e.g. "push" inside a commit message): that is intended.
INPUT=$(cat)
if [ -z "$INPUT" ]; then echo "BLOCKED: empty hook input; refusing to fail open." >&2; exit 2; fi

PATTERNS=(
  'git[^|;&]*[[:space:]]push([[:space:]"\\]|$)'
  'git[^|;&]*[[:space:]]reset[^|;&]*--hard'
  'git[^|;&]*[[:space:]]clean[^|;&]*([[:space:]]-[a-zA-Z]*f|--force)'
  'git[^|;&]*[[:space:]]branch[^|;&]*[[:space:]](-D|-df|-fd|--force)'
  'git[^|;&]*[[:space:]](checkout|restore)[[:space:]]+\.([[:space:]"\\]|$)'
  'gh[[:space:]]+pr[[:space:]]+merge'
  'gh[[:space:]]+(release|repo)[[:space:]]+(create|delete)'
  'rm[[:space:]]+-[a-zA-Z]*[rR][a-zA-Z]*[[:space:]]+(/|~|\.\.?)([[:space:]"\\]|$)'
)
for pattern in "${PATTERNS[@]}"; do
  if printf '%s' "$INPUT" | grep -Eiq -- "$pattern"; then
    echo "BLOCKED: this command matches a protected pattern ($pattern). The project owner has not authorised it; ask the human to run it." >&2
    exit 2
  fi
done
exit 0
