#!/bin/bash
# Regression test for .claude/hooks/block-dangerous-git.sh. Run: bash scripts/test-git-guard.sh
# BLOCK = must exit 2. ALLOW = must exit 0. KNOWN_BYPASS = documents a hole we accept (exit 0 today);
# if one of these starts being blocked, move it to BLOCK.
H="$(dirname "$0")/../.claude/hooks/block-dangerous-git.sh"; fail=0
run(){ printf '{"tool_input":{"command":"%s"}}' "$2" | "$H" >/dev/null 2>&1; code=$?
  case "$1" in BLOCK) want=2;; *) want=0;; esac
  if [ "$code" -ne "$want" ]; then echo "FAIL [$1] exit=$code: $2"; fail=1; else echo "ok   [$1] $2"; fi; }
for c in "git push origin main" "git push" "git  push origin main" "git -C . push origin main" "git -c user.name=x push" \
  "git commit -m wip && git push" "git push --force-with-lease" "git reset --hard HEAD~1" "git clean -fd" "git clean -f" \
  "git branch -D feature" "git branch --force main HEAD" "git checkout ." "git restore ." "gh pr merge 12" "gh repo delete x" "rm -rf /" "rm -rf ~" "rm -rf ."; do run BLOCK "$c"; done
for c in "git status" "git diff main...HEAD" "git commit -m fix-login" "git checkout -b agent/map-replay" "git log --oneline -5" "git branch agent/x" "npm test" "node tools/validate-content.mjs a.json" "rm -rf node_modules"; do run ALLOW "$c"; done
for c in "G=git; \$G push origin main" "sh -c 'git pu''sh'" "eval \"git pu\"\"sh\""; do run KNOWN_BYPASS "$c"; done
# empty input must fail closed
printf '' | "$H" >/dev/null 2>&1; [ $? -eq 2 ] && echo "ok   [BLOCK] empty input" || { echo "FAIL empty input did not fail closed"; fail=1; }
exit $fail
