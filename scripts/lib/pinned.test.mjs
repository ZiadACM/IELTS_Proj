// Run: node --test scripts/lib/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { collectTree, matchesAny, assertSafeRel, assertSafeDest, assertGithubUrl, assertCommit, LIMITS } from './pinned.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pinned-'));
const write = (d, rel, s = 'x') => { const f = path.join(d, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };

test('hashes regular files and ignores .git', () => {
  const d = tmp(); write(d, 'a.md', 'hello'); write(d, 'sub/b.md', 'x'); write(d, '.git/config', 'secret');
  const t = collectTree(d);
  assert.deepEqual(Object.keys(t.files).sort(), ['a.md', 'sub/b.md']);
  assert.equal(t.files['a.md'], '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});
test('symlinks are refused (file and directory)', () => {
  const d = tmp(); write(d, 'a.md'); fs.symlinkSync('/etc/passwd', path.join(d, 'link'));
  assert.throws(() => collectTree(d), /symlink refused/);
  const e = tmp(); fs.symlinkSync(d, path.join(e, 'dirlink'));
  assert.throws(() => collectTree(e), /symlink refused/);
});
test('exclude and include work; include limits to the named files', () => {
  const d = tmp(); write(d, 'SKILL.md'); write(d, 'scripts/live-browser.js'); write(d, 'scripts/live-browser-dom.js'); write(d, 'scripts/keep.js');
  assert.deepEqual(Object.keys(collectTree(d, { exclude: ['scripts/live-browser*.js'] }).files).sort(), ['SKILL.md', 'scripts/keep.js']);
  assert.deepEqual(Object.keys(collectTree(d, { include: ['SKILL.md'] }).files), ['SKILL.md']);
});
test('oversize and too-many-files are refused', () => {
  const d = tmp(); write(d, 'big.bin', 'a'.repeat(LIMITS.maxFileBytes + 1));
  assert.throws(() => collectTree(d), /too large/);
  const e = tmp(); for (let i = 0; i <= LIMITS.maxFiles; i++) write(e, `f${i}.md`, 'x');
  assert.throws(() => collectTree(e), /too many files/);
});
test('single file base is supported', () => { const d = tmp(); write(d, 'agent.md', 'a'); assert.deepEqual(Object.keys(collectTree(path.join(d, 'agent.md')).files), ['agent.md']); });
test('glob matching does not cross directories', () => { assert.ok(matchesAny('scripts/live-browser.js', ['scripts/live-browser*'])); assert.ok(!matchesAny('scripts/x/live-browser.js', ['scripts/live-browser*'])); });
test('path and destination safety', () => {
  for (const bad of ['../x', 'a/../b', '/abs', '-flag', 'a\\b', 'a//b', '']) assert.throws(() => assertSafeRel(bad), /unsafe/, bad);
  assertSafeDest('skills/tdd'); assertSafeDest('.claude/agents/x.md');
  for (const bad of ['src/app', '.git/hooks/pre-commit', 'skills/../../etc', '.claude/settings.json', '.claude/hooks/x.sh']) assert.throws(() => assertSafeDest(bad), /unsafe|outside/, bad);
});
test('only github https urls and full commits are accepted', () => {
  assertGithubUrl('https://github.com/mattpocock/skills.git');
  for (const bad of ['http://github.com/a/b.git', 'https://evil.com/a/b.git', 'git@github.com:a/b.git', 'https://github.com/a/b', 'file:///tmp/x.git']) assert.throws(() => assertGithubUrl(bad), bad);
  assertCommit('4ae2317ddb22b046e26455e4f9c9b3aaaf62212d');
  for (const bad of ['main', '4ae2317', 'HEAD', '4AE2317DDB22B046E26455E4F9C9B3AAAF62212D']) assert.throws(() => assertCommit(bad), bad);
});
