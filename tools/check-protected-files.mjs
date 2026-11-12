#!/usr/bin/env node
// Protected-files check (test-plan CI-02; CODING_STANDARDS.md section 7; owner decision D3).
// Fails when a branch named agent/* changes a protected path, unless the owner approved it.
// Approval = the pull request carries the label `protected-change-approved` (only people with triage/write access
// can add labels; agents have no GitHub credentials). CI passes --approved when that label is present.
// Usage: node tools/check-protected-files.mjs --branch <name> --base <sha> --head <sha> [--approved]
//        node tools/check-protected-files.mjs --branch <name> --files <path> [<path> ...] [--approved]
// Exit: 0 ok | 1 protected change without approval | 2 usage or git error.
// The list mirrors CODING_STANDARDS.md section 7; tools/check-protected-files.test.mjs fails if they drift.
import { execFileSync } from 'node:child_process';

export const PROTECTED = [
  'tools/validate-content.mjs',
  'tools/validate-content.test.mjs',
  'tools/fixtures/**',
  'tests/golden/**',
  'tests/security/**',
  'CODING_STANDARDS.md',
  '.claude/settings.json',
  '.claude/hooks/**',
  'skills-manifest.src.json',
  'skills-manifest.lock.json',
  'scripts/**',
  'third-party/**',
];
// Not (yet) in section 7, but they ARE the gate: changing them can switch the check off. Proposed for section 7.
export const GATE_FILES = ['.github/**', 'tools/check-protected-files.mjs', 'tools/check-protected-files.test.mjs', '.semgrep/**'];

export const matches = (file, pattern) => (pattern.endsWith('/**') ? file.startsWith(pattern.slice(0, -2)) : file === pattern);
export const isAgentBranch = (branch) => /^(refs\/heads\/)?agent\//.test(branch ?? '');

export function protectedChanges(files, patterns = [...PROTECTED, ...GATE_FILES]) {
  return files.filter((f) => patterns.some((p) => matches(f, p)));
}

export function verdict({ branch, files, approved }) {
  if (!isAgentBranch(branch)) return { ok: true, hits: [], reason: `branch ${branch} is not agent/*` };
  const hits = protectedChanges(files);
  if (hits.length === 0) return { ok: true, hits, reason: 'no protected path changed' };
  if (approved) return { ok: true, hits, reason: 'protected paths changed WITH owner approval (label protected-change-approved)' };
  return { ok: false, hits, reason: 'protected paths changed on an agent/* branch without owner approval' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const branch = get('--branch');
  let files;
  try {
    if (args.includes('--files')) files = args.slice(args.indexOf('--files') + 1).filter((a) => !a.startsWith('--'));
    else {
      const base = get('--base'); const head = get('--head');
      if (!base || !head || !/^[0-9a-f]{7,40}$/.test(base) || !/^[0-9a-f]{7,40}$/.test(head)) throw new Error('need --base and --head commit SHAs');
      files = execFileSync('git', ['diff', '--name-only', '--no-renames', `${base}...${head}`], { encoding: 'utf8' }).split('\n').filter(Boolean);
    }
    if (!branch) throw new Error('need --branch');
  } catch (e) { console.error(`check-protected-files: ${e.message}`); process.exit(2); }
  const v = verdict({ branch, files, approved: args.includes('--approved') });
  console.log(`${v.ok ? 'OK' : 'FAIL'}: ${v.reason}`);
  for (const f of v.hits) console.log(`  - ${f}`);
  if (!v.ok) console.log('The owner reviews these changes and adds the label "protected-change-approved" to the pull request, then re-runs the check.');
  process.exit(v.ok ? 0 : 1);
}
