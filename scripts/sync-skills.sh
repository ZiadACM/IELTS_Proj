#!/bin/bash
# Copies canonical skills (skills/<name>) into the tool folders .claude/skills and .agents/skills.
# Copies, not symlinks: tools differ in how they follow links. Usage:
#   bash scripts/sync-skills.sh                 # all skills
#   bash scripts/sync-skills.sh grill-with-docs to-spec to-tickets   # only these (phase-by-phase install)
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"; cd "$root"
bash scripts/verify-vendored.sh
# adapters must stay thin and identical in what they point at
for f in AGENTS.md CLAUDE.md; do grep -q "docs/development/agent-rules.md" "$f" || { echo "$f does not point at docs/development/agent-rules.md" >&2; exit 1; }; done
if [ "$#" -gt 0 ]; then names=("$@"); else names=(); for d in skills/*/; do names+=("$(basename "$d")"); done; fi
for name in "${names[@]}"; do
  [[ "$name" =~ ^[a-z0-9-]+$ ]] || { echo "refusing odd skill name: $name" >&2; exit 1; }
  [ -f "skills/$name/SKILL.md" ] || { echo "no such skill: $name" >&2; exit 1; }
  for dest in .claude/skills .agents/skills; do
    mkdir -p "$dest"; rm -rf "${dest:?}/$name"; cp -R "skills/$name" "$dest/$name"
  done
  echo "synced $name"
done
