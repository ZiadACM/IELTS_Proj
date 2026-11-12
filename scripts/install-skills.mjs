#!/usr/bin/env node
// Installs skills from their upstream GitHub repos at PINNED commits, and refuses anything that is not byte-identical
// to what was audited (skills-manifest.lock.json). Writes NOTHING unless every selected file verifies.
// Never executes anything from a fetched repo. See docs/development/INSTALL-FOR-AGENTS.md.
//
//   node scripts/install-skills.mjs plan
//   node scripts/install-skills.mjs install --phase=A[,B,...|all] [--only=a,b] [--include-optional=a,b] [--dry-run] [--no-sync]
//   node scripts/install-skills.mjs verify
//   (human-only flag) --accept-partial-audit=name[,name]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fetchPinned, collectTree, sha256, assertSafeDest, assertSafeRel } from './lib/pinned.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const lockPath = path.join(root, 'skills-manifest.lock.json');
const installedPath = path.join(root, 'third-party', 'INSTALLED.json');
const ALL_PHASES = ['A', 'B', 'C', 'D', 'pre-launch'];

const [cmd, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const list = (v) => (typeof v === 'string' ? v.split(',').filter(Boolean) : []);
const die = (msg, code = 1) => { console.error(msg); process.exit(code); };
const digest = (files) => sha256(Buffer.from(Object.keys(files).sort().map((k) => `${k}:${files[k]}`).join('\n')));
const readJson = (p, dflt) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { if (dflt !== undefined && e.code === 'ENOENT') return dflt; throw e; } };

if (!fs.existsSync(lockPath)) die('skills-manifest.lock.json is missing. The owner generates it with scripts/lock-manifest.mjs.', 2);
const lock = readJson(lockPath);
const installed = readJson(installedPath, { installed: {} });
const all = [...lock.entries.map((e) => ({ ...e, local: false })), ...lock.localEntries.map((e) => ({ ...e, local: true, audit: 'own' }))];
const byName = new Map(all.map((e) => [e.name, e]));

function compareTree(actual, expected, label, errors, { onlyExec = false } = {}) {
  for (const [rel, h] of Object.entries(expected.files)) {
    if (!(rel in actual.files)) errors.push(`${label}: missing ${rel}`);
    else if (actual.files[rel] !== h) errors.push(`${label}: CONTENT DIFFERS ${rel}`);
    else if (expected.modes && (actual.modes[rel] & 0o111 ? 1 : 0) !== (expected.modes[rel] & 0o111 ? 1 : 0)) errors.push(`${label}: executable bit differs ${rel}`);
  }
  for (const rel of Object.keys(actual.files)) if (!(rel in expected.files)) errors.push(`${label}: UNEXPECTED extra file ${rel}`);
}

function select() {
  const phases = list(flags.phase).flatMap((p) => (p === 'all' ? ALL_PHASES : [p]));
  const unknown = phases.filter((p) => !ALL_PHASES.includes(p)); if (unknown.length) die(`unknown phase(s): ${unknown.join(', ')} (use ${ALL_PHASES.join(', ')} or all)`, 2);
  const names = new Set();
  for (const e of all) if (e.tier === 'core' && phases.includes(e.phase)) names.add(e.name);
  for (const n of list(flags.only)) { if (!byName.has(n)) die(`--only: no such entry ${n}`, 2); names.add(n); }
  for (const n of list(flags['include-optional'])) { const e = byName.get(n); if (!e || e.tier !== 'optional') die(`--include-optional: ${n} is not an optional entry`, 2); names.add(n); }
  if (names.size === 0) die('nothing selected: pass --phase=..., --only=... or --include-optional=...', 2);
  return [...names].map((n) => byName.get(n));
}

if (cmd === 'plan') {
  const rows = all.map((e) => `${(e.local ? 'local' : e.source).padEnd(12)} ${e.name.padEnd(30)} ${String(e.phase).padEnd(19)} ${e.tier.padEnd(9)} ${String(e.audit).padEnd(8)} ${installed.installed[e.name] ? 'installed' : (e.local && fs.existsSync(path.join(root, 'skills', e.name)) ? 'present' : '-')}`);
  console.log(`${'source'.padEnd(12)} ${'name'.padEnd(30)} ${'phase'.padEnd(19)} ${'tier'.padEnd(9)} ${'audit'.padEnd(8)} state\n` + rows.join('\n'));
  process.exit(0);
}

if (cmd === 'verify') {
  const errors = [];
  for (const [name, rec] of Object.entries(installed.installed)) {
    const e = byName.get(name); if (!e || e.local) { errors.push(`${name}: recorded as installed but not in the lock`); continue; }
    for (const m of e.mappings) {
      const dest = path.join(root, m.to);
      if (!fs.existsSync(dest)) { errors.push(`${name}: installed path missing: ${m.to}`); continue; }
      try { compareTree(collectTree(dest), m, `${name}:${m.to}`, errors); } catch (x) { errors.push(`${name}:${m.to}: ${x.message}`); }
      if (m.to.startsWith('skills/')) for (const tool of ['.claude/skills', '.agents/skills']) {
        const copy = path.join(root, tool, name); if (!fs.existsSync(copy)) continue;
        try { compareTree(collectTree(copy), m, `${name}:${tool}/${name}`, errors); } catch (x) { errors.push(`${name}:${tool}/${name}: ${x.message}`); }
      }
    }
  }
  for (const [rel, h] of Object.entries(lock.local)) {
    const f = path.join(root, rel);
    if (!fs.existsSync(f)) errors.push(`local file missing: ${rel}`); else if (sha256(fs.readFileSync(f)) !== h) errors.push(`local file CONTENT DIFFERS: ${rel}`);
  }
  if (errors.length) { console.error('VERIFY FAILED. A file changed after it was audited. Stop and tell the owner; do not "fix" it.\n  - ' + errors.join('\n  - ')); process.exit(1); }
  console.log(`verified: ${Object.keys(installed.installed).length} installed entries and ${Object.keys(lock.local).length} local files match the audited lock`);
  process.exit(0);
}

if (cmd !== 'install') die('usage: install-skills.mjs plan | install --phase=A,B,... [--only=..] [--include-optional=..] [--dry-run] [--no-sync] | verify', 2);

const chosen = select();
// --- audit gate --------------------------------------------------------------------------------------------------
const accepted = new Set(list(flags['accept-partial-audit']));
const refused = chosen.filter((e) => !e.local && e.audit !== 'full' && !e.partialAuditApproved && !accepted.has(e.name));
if (refused.length) die(`REFUSED: partially audited entries need explicit owner approval:\n  - ${refused.map((e) => e.name).join('\n  - ')}\nIf (and only if) the owner approved them in this task, re-run with --accept-partial-audit=${refused.map((e) => e.name).join(',')}`);

// --- fetch + verify everything BEFORE writing -----------------------------------------------------------------------
const thirdParty = chosen.filter((e) => !e.local);
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-install-'));
const errors = [];
const verified = []; // {entry, mapping, tree, dir}
try {
  const bySource = {};
  for (const e of thirdParty) (bySource[e.source] ??= []).push(e);
  const dirs = {};
  for (const [key, entries] of Object.entries(bySource)) {
    const src = lock.sources[key];
    const paths = [...new Set([...entries.flatMap((e) => e.mappings.map((m) => m.from)), ...Object.keys(src.licenseFiles)])];
    console.log(`fetching ${key} @ ${src.commit.slice(0, 10)} ...`);
    dirs[key] = fetchPinned({ url: src.url, commit: src.commit, paths }, path.join(work, key));
    for (const [lf, h] of Object.entries(src.licenseFiles)) { const f = path.join(dirs[key], lf); if (!fs.existsSync(f) || sha256(fs.readFileSync(f)) !== h) errors.push(`${key}: licence file ${lf} differs from the audited one`); }
  }
  for (const e of thirdParty) for (const m of e.mappings) {
    assertSafeDest(m.to); assertSafeRel(m.from);
    try { const tree = collectTree(path.join(dirs[e.source], m.from), { include: m.include ?? null, exclude: m.exclude ?? [] }); compareTree(tree, m, `${e.name}:${m.from}`, errors); verified.push({ e, m, tree }); }
    catch (x) { errors.push(`${e.name}:${m.from}: ${x.message}`); }
  }
  if (errors.length) die(`VERIFICATION FAILED. Nothing was written. Upstream content differs from what was audited (or a safety check failed):\n  - ${errors.join('\n  - ')}\nTell the owner. Do not retry with other flags and do not edit the lock.`);

  console.log(`all ${verified.reduce((n, v) => n + Object.keys(v.tree.files).length, 0)} files verified against the lock`);
  if (flags['dry-run']) { console.log('dry run: nothing written. Would install: ' + chosen.map((e) => e.name).join(', ')); process.exit(0); }

  // --- write ------------------------------------------------------------------------------------------------------
  for (const { e, m, tree } of verified) {
    const dest = path.join(root, m.to);
    const fromIsFile = fs.statSync(path.join(dirs[e.source], m.from)).isFile();
    fs.rmSync(dest, { recursive: true, force: true });
    for (const [rel, abs] of Object.entries(tree.abs)) {
      const target = fromIsFile ? dest : path.join(dest, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(abs, target); fs.chmodSync(target, tree.modes[rel] & 0o755);
    }
    const rec = (installed.installed[e.name] ??= { source: e.source, commit: lock.sources[e.source].commit, installedAt: new Date().toISOString().slice(0, 10), mappings: [] });
    rec.commit = lock.sources[e.source].commit; rec.installedAt = new Date().toISOString().slice(0, 10);
    rec.mappings = rec.mappings.filter((x) => x.to !== m.to).concat([{ to: m.to, digest: digest(m.files) }]);
    console.log(`installed ${e.name}  ->  ${m.to}`);
  }
  for (const [key, src] of Object.entries(lock.sources)) if (dirs[key]) for (const lf of Object.keys(src.licenseFiles)) {
    fs.mkdirSync(path.join(root, 'third-party', 'licenses'), { recursive: true });
    fs.copyFileSync(path.join(dirs[key], lf), path.join(root, 'third-party', 'licenses', `${key}.${path.basename(lf)}`));
  }
  fs.mkdirSync(path.dirname(installedPath), { recursive: true });
  fs.writeFileSync(installedPath, JSON.stringify(installed, null, 2) + '\n');
} finally { fs.rmSync(work, { recursive: true, force: true }); }

// --- sync canonical skills into the tool folders ------------------------------------------------------------------------
const canonical = chosen.filter((e) => e.local || e.mappings.every((m) => m.to.startsWith('skills/'))).map((e) => e.name);
for (const n of chosen.filter((e) => e.local)) if (!fs.existsSync(path.join(root, 'skills', n.name, 'SKILL.md'))) die(`local skill ${n.name} is missing from skills/`);
if (!flags['no-sync'] && canonical.length) execFileSync('bash', [path.join(root, 'scripts', 'sync-skills.sh'), ...canonical], { stdio: 'inherit', cwd: root });
const steps = chosen.flatMap((e) => (e.humanSteps ?? []).map((s) => `  [${e.name}] ${s}`));
if (steps.length) console.log('\nHUMAN STEPS (the agent must not do these without the owner):\n' + steps.join('\n'));
console.log('\ndone. Run: node scripts/install-skills.mjs verify');
