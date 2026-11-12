// Shared helpers for fetching an upstream repo at a PINNED commit and hashing a tree safely.
// Rules baked in: https://github.com only; full 40-hex commit only; no symlinks, no special files, no path tricks;
// size limits; nothing from a fetched repo is ever executed.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const LIMITS = { maxFileBytes: 2 * 1024 * 1024, maxTreeBytes: 8 * 1024 * 1024, maxFiles: 400 };
export const ALLOWED_DEST_PREFIXES = ['skills/', '.claude/skills/', '.agents/skills/', '.claude/agents/'];

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export function assertSafeRel(p, what = 'path') {
  if (typeof p !== 'string' || p === '' || p.startsWith('/') || p.startsWith('-') || p.includes('\\') || p.includes('\0') || p.split('/').some((s) => s === '..' || s === '')) {
    throw new Error(`unsafe ${what}: ${JSON.stringify(p)}`);
  }
  return p;
}
export function assertSafeDest(p) {
  assertSafeRel(p, 'destination');
  if (!ALLOWED_DEST_PREFIXES.some((pre) => p.startsWith(pre))) throw new Error(`destination ${p} is outside allowed folders: ${ALLOWED_DEST_PREFIXES.join(', ')}`);
  return p;
}
export function assertGithubUrl(u) {
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\.git$/.test(u)) throw new Error(`source url must be https://github.com/<owner>/<repo>.git, got ${u}`);
  return u;
}
export const assertCommit = (c) => { if (!/^[0-9a-f]{40}$/.test(c)) throw new Error(`commit must be a full 40-hex SHA, got ${c}`); return c; };

// exact path, or a single trailing/inner * wildcard that does not cross "/"
export function matchesAny(rel, patterns = []) {
  return patterns.some((p) => (p.includes('*') ? new RegExp('^' + p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*') + '$').test(rel) : p === rel));
}

// Walk `base` (a directory or a single file). Returns { files: {rel: sha256}, modes: {rel: mode}, abs: {rel: path} }.
// Throws on symlinks, special files, oversize files, too many files, or unsafe names.
export function collectTree(base, { include = null, exclude = [] } = {}) {
  const st = fs.lstatSync(base);
  if (st.isSymbolicLink()) throw new Error(`symlink refused: ${base}`);
  const out = { files: {}, modes: {}, abs: {} };
  let total = 0, count = 0;
  const add = (abs, rel, stat) => {
    if (include && !include.includes(rel)) return;
    if (matchesAny(rel, exclude)) return;
    if (stat.size > LIMITS.maxFileBytes) throw new Error(`file too large (${stat.size} B): ${rel}`);
    total += stat.size; count++;
    if (total > LIMITS.maxTreeBytes) throw new Error(`tree too large (> ${LIMITS.maxTreeBytes} B)`);
    if (count > LIMITS.maxFiles) throw new Error(`too many files (> ${LIMITS.maxFiles})`);
    out.files[rel] = sha256(fs.readFileSync(abs)); out.modes[rel] = stat.mode & 0o777; out.abs[rel] = abs;
  };
  if (st.isFile()) { add(base, path.basename(base), st); return out; }
  if (!st.isDirectory()) throw new Error(`not a regular file or directory: ${base}`);
  const walk = (dir, relDir) => {
    for (const name of fs.readdirSync(dir).sort()) {
      if (name === '.git') continue;
      const abs = path.join(dir, name); const rel = relDir ? `${relDir}/${name}` : name;
      assertSafeRel(rel);
      const s = fs.lstatSync(abs);
      if (s.isSymbolicLink()) throw new Error(`symlink refused: ${rel}`);
      if (s.isDirectory()) walk(abs, rel);
      else if (s.isFile()) add(abs, rel, s);
      else throw new Error(`special file refused: ${rel}`);
    }
  };
  walk(base, '');
  return out;
}

export const sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));

function git(args, cwd) {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: os.devNull };
  return execFileSync('git', ['-c', `core.hooksPath=${os.devNull}`, '-c', 'protocol.allow=never', '-c', 'protocol.https.allow=always', ...args], { cwd, env, timeout: 300000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// Fetch only `paths` of `commit` into workDir. Verifies HEAD equals the pinned commit.
export function fetchPinned({ url, commit, paths }, workDir) {
  assertGithubUrl(url); assertCommit(commit); paths.forEach((p) => assertSafeRel(p, 'source path'));
  fs.mkdirSync(workDir, { recursive: true });
  git(['init', '-q'], workDir);
  git(['remote', 'add', 'origin', url], workDir);
  try { git(['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', commit], workDir); }
  catch { git(['fetch', '-q', '--depth', '1', 'origin', commit], workDir); }
  git(['sparse-checkout', 'init', '--no-cone'], workDir);
  git(['sparse-checkout', 'set', '--no-cone', ...paths.map((p) => '/' + p)], workDir);
  git(['checkout', '-q', '--detach', 'FETCH_HEAD'], workDir);
  const head = git(['rev-parse', 'HEAD'], workDir).trim();
  if (head !== commit) throw new Error(`fetched ${head}, expected pinned ${commit}`);
  return workDir;
}
