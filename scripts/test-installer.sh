#!/bin/bash
# End-to-end tests for the pinned installer. NEEDS NETWORK (github.com). Run: bash scripts/test-installer.sh
# Each case works in a fresh temp copy; nothing in your repo is touched.
set -u
SRC="$(cd "$(dirname "$0")/.." && pwd)"; fail=0
fresh(){ T=$(mktemp -d); cp -R "$SRC/." "$T/"; rm -rf "$T/.claude/skills" "$T/.agents/skills" "$T/third-party/INSTALLED.json"; cd "$T"; }
ok(){ echo "ok   $1"; }; bad(){ echo "FAIL $1"; fail=1; }
edit_lock(){ python3 - "$@" <<'PY'
import json,sys
code=sys.argv[1]; d=json.load(open('skills-manifest.lock.json')); exec(code); json.dump(d,open('skills-manifest.lock.json','w'),indent=2)
PY
}
ent(){ echo "next(e for e in d['entries'] if e['name']=='$1')"; }

fresh; out=$(node scripts/install-skills.mjs install 2>&1); [ $? -eq 2 ] && ok "no selection -> usage error" || bad "no selection should exit 2"
fresh; out=$(node scripts/install-skills.mjs install --phase=A,B 2>&1); rc=$?; [ $rc -eq 0 ] && node scripts/install-skills.mjs verify >/dev/null 2>&1 && ok "phase A,B installs and verifies" || { bad "phase A,B install ($rc)"; echo "$out" | tail -5; }
# tamper after install
echo "# evil" >> skills/grilling/SKILL.md; node scripts/install-skills.mjs verify >/dev/null 2>&1; [ $? -eq 1 ] && ok "tampered installed file is detected" || bad "tamper not detected"
fresh; node scripts/install-skills.mjs install --phase=A >/dev/null 2>&1; echo "# evil" >> .claude/skills/to-spec/SKILL.md; node scripts/install-skills.mjs verify >/dev/null 2>&1; [ $? -eq 1 ] && ok "tampered tool-folder copy is detected" || bad "tool copy tamper not detected"
fresh; node scripts/install-skills.mjs install --phase=A >/dev/null 2>&1; echo "x" > skills/grilling/injected.md; node scripts/install-skills.mjs verify 2>&1 | grep -q "UNEXPECTED extra file" && ok "extra injected file is detected" || bad "extra file not detected"
fresh; echo "# evil" >> .claude/hooks/block-dangerous-git.sh; node scripts/install-skills.mjs verify >/dev/null 2>&1; [ $? -eq 1 ] && ok "tampered guard hook is detected" || bad "hook tamper not detected"
# lock says a different hash than upstream has -> abort, write nothing
fresh; edit_lock "$(ent grilling)['mappings'][0]['files']['SKILL.md']='0'*64"; out=$(node scripts/install-skills.mjs install --phase=A 2>&1); rc=$?
[ $rc -eq 1 ] && [ ! -d skills/grilling ] && [ ! -d skills/to-spec ] && echo "$out" | grep -q "Nothing was written" && ok "hash mismatch aborts and writes NOTHING (even for the other skills)" || bad "mismatch handling (rc=$rc)"
# pinned commit that upstream does not have
fresh; edit_lock "d['sources']['mattpocock']['commit']='0'*40"; node scripts/install-skills.mjs install --phase=A >/dev/null 2>&1; [ $? -ne 0 ] && [ ! -d skills/grilling ] && ok "unknown pinned commit aborts, nothing written" || bad "bad commit"
# poisoned lock: destination outside allowed folders
fresh; edit_lock "$(ent grilling)['mappings'][0]['to']='src/evil'"; node scripts/install-skills.mjs install --only=grilling >/dev/null 2>&1; [ $? -ne 0 ] && [ ! -e src/evil ] && ok "destination outside allowed folders is refused" || bad "dest traversal"
fresh; edit_lock "$(ent grilling)['mappings'][0]['to']='skills/../../outside'"; node scripts/install-skills.mjs install --only=grilling >/dev/null 2>&1; [ $? -ne 0 ] && ok "path traversal in destination is refused" || bad "path traversal"
# partial-audit gate
fresh; out=$(node scripts/install-skills.mjs install --include-optional=wayfinder 2>&1); [ $? -eq 1 ] && echo "$out" | grep -q REFUSED && ok "partially audited optional skill is refused without approval" || bad "partial gate"
fresh; node scripts/install-skills.mjs install --include-optional=wayfinder --accept-partial-audit=wayfinder --dry-run >/dev/null 2>&1 && ok "explicit owner approval lets a partial skill through (dry run)" || bad "accept flag"
fresh; node scripts/install-skills.mjs install --only=impeccable --dry-run >/dev/null 2>&1 && ok "impeccable passes via recorded owner approval" || bad "impeccable approval"
fresh; node scripts/install-skills.mjs install --include-optional=tdd >/dev/null 2>&1; [ $? -eq 2 ] && ok "--include-optional rejects non-optional names" || bad "include-optional validation"
exit $fail
