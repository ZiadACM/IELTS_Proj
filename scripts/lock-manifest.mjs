#!/usr/bin/env node
// MAINTAINER (OWNER) ONLY. Agents must never run this: it decides what counts as audited.
// Reads skills-manifest.src.json, fetches every source at its pinned commit, hashes every file we would install,
// scans for risky patterns, and writes skills-manifest.lock.json. Review the lock diff before committing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fetchPinned, collectTree, sha256, sortKeys, assertSafeDest, assertSafeRel, LIMITS } from './lib/pinned.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const spec = JSON.parse(fs.readFileSync(path.join(root, 'skills-manifest.src.json'), 'utf8'));
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-'));

// Patterns worth a human look. Hits are reported, not judged.
const RISKY = [
  ['pipe-to-shell', /\|\s*(sudo\s+)?(ba|z)?sh\b/], ['curl/wget', /\b(curl|wget)\s/], ['eval', /\beval\b\s*[\("'$]/], ['rm -rf', /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f?\b/],
  ['sudo', /\bsudo\s/], ['chmod', /\bchmod\s/], ['bypass-permissions', /--dangerously|bypassPermissions|--no-verify/], ['npm/pip install', /\b(npm|pnpm|yarn|pip3?|npx)\s+(install|add|i)\b/],
  ['child_process', /child_process|execSync|spawnSync|subprocess|os\.system/], ['network', /\bfetch\(|XMLHttpRequest|https?\.request|requests\.(get|post)|urllib/], ['secrets-paths', /\.ssh\b|\.aws\b|id_rsa|\.npmrc|\.netrc/],
];

const entries = spec.entries.filter((e) => e.kind !== 'local');
const bySource = {};
for (const e of entries) {
  e.mappings = (e.mappings ?? [{ from: e.from, to: `skills/${e.name}`, ...(e.include ? { include: e.include } : {}) }]);
  for (const m of e.mappings) { assertSafeRel(m.from, 'from'); assertSafeDest(m.to); }
  (bySource[e.source] ??= []).push(e);
}
const lock = { lockVersion: 1, generatedBy: 'scripts/lock-manifest.mjs', limits: LIMITS, sources: {}, entries: [], local: {} };
const report = [];

for (const [key, src] of Object.entries(spec.sources)) {
  const used = bySource[key] ?? []; if (used.length === 0) continue;
  const paths = [...new Set([...used.flatMap((e) => e.mappings.map((m) => m.from)), ...src.licenseFiles])];
  const dir = path.join(work, key);
  console.error(`fetching ${key} @ ${src.commit.slice(0, 10)} (${paths.length} paths)...`);
  fetchPinned({ url: src.url, commit: src.commit, paths }, dir);
  lock.sources[key] = { url: src.url, commit: src.commit, license: src.license, licenseFiles: {} };
  for (const lf of src.licenseFiles) lock.sources[key].licenseFiles[lf] = sha256(fs.readFileSync(path.join(dir, lf)));
  for (const e of used) {
    const out = { name: e.name, kind: e.kind ?? 'skill', source: key, phase: e.phase, tier: e.tier, audit: e.audit, ...(e.partialAuditApproved ? { partialAuditApproved: e.partialAuditApproved } : {}), ...(e.humanSteps ? { humanSteps: e.humanSteps } : {}), use: e.use, mappings: [] };
    for (const m of e.mappings) {
      const t = collectTree(path.join(dir, m.from), { include: m.include ?? null, exclude: m.exclude ?? [] });
      if (Object.keys(t.files).length === 0) throw new Error(`${e.name}: nothing found at ${m.from} (path moved upstream?)`);
      out.mappings.push({ from: m.from, to: m.to, ...(m.include ? { include: m.include } : {}), ...(m.exclude ? { exclude: m.exclude } : {}), files: sortKeys(t.files), modes: sortKeys(t.modes) });
      for (const [rel, abs] of Object.entries(t.abs)) {
        const text = fs.readFileSync(abs); if (text.includes(0)) continue; const lines = text.toString('utf8').split('\n');
        for (const [name, re] of RISKY) lines.forEach((ln, i) => { if (re.test(ln)) report.push({ entry: e.name, file: `${m.from}/${rel}`.replace(/\/[^/]+$/, (s) => (m.from.endsWith(path.basename(rel)) ? '' : s)), line: i + 1, kind: name, text: ln.trim().slice(0, 110) }); });
      }
    }
    lock.entries.push(out);
  }
}
// local files whose content we vouch for (adapted copies, the hook)
for (const rel of spec.localHashed) { assertSafeRel(rel); const t = collectTree(path.join(root, rel)); for (const [f, h] of Object.entries(t.files)) lock.local[fs.statSync(path.join(root, rel)).isFile() ? rel : `${rel}/${f}`] = h; }
lock.local = sortKeys(lock.local);
// carry through entry metadata for local skills so `plan` can list them
lock.localEntries = spec.entries.filter((e) => e.kind === 'local').map(({ name, phase, tier, use }) => ({ name, phase, tier, use }));
fs.writeFileSync(path.join(root, 'skills-manifest.lock.json'), JSON.stringify(lock, null, 2) + '\n');
fs.rmSync(work, { recursive: true, force: true });

const files = lock.entries.reduce((n, e) => n + e.mappings.reduce((k, m) => k + Object.keys(m.files).length, 0), 0);
console.log(`lock written: ${lock.entries.length} third-party entries, ${files} files, ${Object.keys(lock.local).length} local files hashed`);
const byEntry = {}; for (const r of report) (byEntry[r.entry] ??= []).push(r);
console.log(`\nRISKY-PATTERN HITS (review before approving): ${report.length} in ${Object.keys(byEntry).length} entries`);
for (const [name, hits] of Object.entries(byEntry)) { console.log(`\n== ${name} (${hits.length})`); for (const h of hits.slice(0, 12)) console.log(`  [${h.kind}] ${h.file}:${h.line}  ${h.text}`); if (hits.length > 12) console.log(`  ... ${hits.length - 12} more`); }
