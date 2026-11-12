// Tests for tools/check-protected-files.mjs (test-plan CI-02).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PROTECTED, verdict, protectedChanges } from './check-protected-files.mjs';

test('the list covers every path named in CODING_STANDARDS.md section 7 (drift check)', () => {
  const cs = fs.readFileSync(new URL('../CODING_STANDARDS.md', import.meta.url), 'utf8');
  const section = cs.split(/^## 7\./m)[1]?.split(/^## /m)[0];
  assert.ok(section, 'CODING_STANDARDS.md has no section 7');
  const named = [...section.matchAll(/`([^`]+)`/g)].map((m) => m[1]).filter((p) => /[./]/.test(p) && !p.includes(' ') && !p.startsWith('agent/')); // `agent/*` is a branch name, not a path
  assert.ok(named.length >= 10, `expected the section 7 path list, found ${named.length}`);
  assert.deepEqual(named.filter((p) => !PROTECTED.includes(p)), [], 'paths in section 7 missing from PROTECTED');
});

test('agent branch touching protected paths fails without approval, passes with it', () => {
  const files = ['docs/x.md', 'tests/security/new.test.mjs', 'scripts/lib/pinned.mjs', '.github/workflows/security.yml'];
  const v = verdict({ branch: 'agent/security-tests', files, approved: false });
  assert.equal(v.ok, false);
  assert.deepEqual(v.hits, ['tests/security/new.test.mjs', 'scripts/lib/pinned.mjs', '.github/workflows/security.yml']);
  assert.equal(verdict({ branch: 'agent/security-tests', files, approved: true }).ok, true);
});

test('non-agent branches and unprotected changes pass', () => {
  assert.equal(verdict({ branch: 'owner/update', files: ['CODING_STANDARDS.md'], approved: false }).ok, true);
  assert.equal(verdict({ branch: 'agent/x', files: ['docs/a.md', 'tools/new-tool.mjs', 'tools/validate-contentX.mjs'], approved: false }).ok, true);
});

test('exact files are not treated as prefixes, folders are', () => {
  assert.deepEqual(protectedChanges(['CODING_STANDARDS.md.bak', 'tools/fixtures/a.json', 'tests/golden2/x', 'tests/golden/x']), ['tools/fixtures/a.json', 'tests/golden/x']);
});
