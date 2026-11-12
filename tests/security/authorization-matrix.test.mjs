// Authorization matrix checks. Run: node --test tests/security/*.test.mjs
// Fails the build when:
//   - the matrix is incomplete or uses an unknown decision;
//   - a cell contradicts CODING_STANDARDS.md section 2 or the threat model (invariants below);
//   - the Markdown copy drifts from the JSON source of truth;
//   - a REAL endpoint exists in the app but has no row in the matrix (coverage gate).
// Stack-neutral today. The coverage gate becomes active automatically once application code exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  repoRoot, loadMatrix, matrixMdPath, normalizePath, endpointKey, findUnlisted, parseMarkdownTable,
} from './lib/matrix.mjs';

const matrix = loadMatrix();
const roles = Object.freeze(Object.keys(matrix.roles)); // column order of the Markdown table; frozen so no test reorders it
const decisions = new Set(Object.keys(matrix.decisions));
const OWNER_DATA = new Set(['attempt', 'progress', 'settings', 'recommendation']);
const OWNER_DECISIONS = new Set(['deny', 'own', 'own-open', 'own-open-guided', 'own-submitted']);
const NON_STAFF = ['anonymous', 'guest', 'learner'];
const has = (e, flag) => (e.flags ?? []).includes(flag);
const each = (fn) => { for (const e of matrix.endpoints) for (const r of roles) fn(e, r, e.access[r]); };

// --- completeness --------------------------------------------------------------------------------
test('matrix declares the six expected roles (guest added by owner decision D5)', () => {
  assert.deepEqual([...roles].sort(), ['admin', 'anonymous', 'content_author', 'content_reviewer', 'guest', 'learner']);
});

test('every endpoint has a decision for every role, from the known vocabulary', () => {
  const problems = [];
  for (const e of matrix.endpoints) {
    const got = Object.keys(e.access ?? {}).sort();
    if (JSON.stringify(got) !== JSON.stringify([...roles].sort())) problems.push(`${e.id}: roles ${got.join(',')} != ${roles.join(',')}`);
    for (const r of roles) if (!decisions.has(e.access?.[r])) problems.push(`${e.id}/${r}: unknown decision ${JSON.stringify(e.access?.[r])}`);
  }
  assert.deepEqual(problems, []);
});

test('endpoint ids and method+path pairs are unique', () => {
  const ids = matrix.endpoints.map((e) => e.id);
  const keys = matrix.endpoints.map(endpointKey);
  assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), [], 'duplicate ids');
  assert.deepEqual(keys.filter((x, i) => keys.indexOf(x) !== i), [], 'duplicate method+path');
});

test('every endpoint cites at least one rule or threat (CS2.x, CS3.x, T1-T8)', () => {
  const bad = matrix.endpoints.filter((e) => !(e.refs?.length) || e.refs.some((r) => !/^(CS[23]\.\d|T[1-8])$/.test(r)));
  assert.deepEqual(bad.map((e) => e.id), []);
});

// --- invariants from CODING_STANDARDS.md section 2 and the threat model -----------------------------
test('CS2.1/T3: paths under /me or with {attemptId} are flagged ownerScoped', () => {
  const bad = matrix.endpoints.filter((e) => (/^\/me(\/|$)/.test(e.path) || e.path.includes('{attemptId}')) && !has(e, 'ownerScoped'));
  assert.deepEqual(bad.map((e) => e.id), []);
});

test('CS2.1/T3: owner-scoped endpoints are never "allow" for any role (server checks ownership)', () => {
  const bad = []; each((e, r, d) => { if (has(e, 'ownerScoped') && !OWNER_DECISIONS.has(d)) bad.push(`${e.id}/${r}=${d}`); });
  assert.deepEqual(bad, []);
});

test('CS2.1/T3: anonymous is denied all learner data (attempts, progress, settings, recommendations)', () => {
  const bad = matrix.endpoints.filter((e) => (has(e, 'ownerScoped') || OWNER_DATA.has(e.resource)) && e.access.anonymous !== 'deny');
  assert.deepEqual(bad.map((e) => e.id), []);
});

test('CS2.2/T1: learner-facing endpoints returning answer data require a submitted attempt', () => {
  const bad = [];
  each((e, r, d) => {
    if (!has(e, 'returnsAnswerData')) return;
    const staffPath = e.path.startsWith('/admin/');
    if (staffPath ? NON_STAFF.includes(r) && d !== 'deny' : !['deny', 'own-submitted'].includes(d)) bad.push(`${e.id}/${r}=${d}`);
  });
  assert.deepEqual(bad, []);
});

test('CS2.2/T1: delivery payloads are never also flagged as returning answer data', () => {
  const bad = matrix.endpoints.filter((e) => has(e, 'deliveryPayload') && has(e, 'returnsAnswerData'));
  assert.deepEqual(bad.map((e) => e.id), []);
});

test('CS2.3/T4: exam-forbidden actions (replay, hint) are guided-only or denied, and vice versa', () => {
  const bad = [];
  each((e, r, d) => {
    if (has(e, 'examForbidden') && !['deny', 'own-open-guided'].includes(d)) bad.push(`${e.id}/${r}=${d}`);
    if (d === 'own-open-guided' && !has(e, 'examForbidden')) bad.push(`${e.id}/${r}: own-open-guided without examForbidden flag`);
  });
  assert.deepEqual(bad, []);
});

test('CS2.3/T3/T4: writes to an attempt are refused once it is submitted or past its deadline', () => {
  const bad = [];
  each((e, r, d) => {
    if (e.resource === 'attempt' && has(e, 'ownerScoped') && e.method !== 'GET' && !['deny', 'own-open', 'own-open-guided'].includes(d)) bad.push(`${e.id}/${r}=${d}`);
  });
  assert.deepEqual(bad, []);
});

test('T5: /admin endpoints are staff-only (anonymous, guest and learner denied)', () => {
  const bad = matrix.endpoints.filter((e) => e.path.startsWith('/admin/') && (!has(e, 'staffOnly') || NON_STAFF.some((r) => e.access[r] !== 'deny')));
  assert.deepEqual(bad.map((e) => e.id), []);
});

test('CS3.1/T5: only the human content_reviewer role can publish', () => {
  const pub = matrix.endpoints.filter((e) => has(e, 'publishAction'));
  assert.ok(pub.length >= 1, 'no publish endpoint in matrix');
  for (const e of pub) for (const r of roles) assert.equal(e.access[r], r === 'content_reviewer' ? 'allow' : 'deny', `${e.id}/${r}`);
});

// --- Markdown copy stays in sync -----------------------------------------------------------------
test('authorization-matrix.md matches the JSON exactly', () => {
  const md = parseMarkdownTable(fs.readFileSync(matrixMdPath, 'utf8'), roles);
  assert.deepEqual(Object.keys(md).sort(), matrix.endpoints.map((e) => e.id).sort(), 'row ids differ');
  for (const e of matrix.endpoints) {
    assert.equal(md[e.id].method, e.method, `${e.id} method`);
    assert.equal(md[e.id].path, e.path, `${e.id} path`);
    assert.deepEqual(md[e.id].access, e.access, `${e.id} access`);
  }
});

// --- coverage gate: real endpoints must be in the matrix ----------------------------------------------
test('coverage logic: path syntaxes normalise and unlisted endpoints are reported (synthetic)', () => {
  assert.equal(normalizePath('/attempts/:attemptId/hints'), '/attempts/{}/hints');
  assert.equal(normalizePath('/attempts/[attemptId]/hints/'), '/attempts/{}/hints');
  assert.equal(normalizePath('/items/<int:itemId>?x=1'), '/items/{}');
  const discovered = [
    { method: 'get', path: '/items/:id' },
    { method: 'POST', path: '/attempts/[attemptId]/hints' },
    { method: 'GET', path: '/debug/vars' },
    { method: 'DELETE', path: '/items/{itemId}' },
  ];
  assert.deepEqual(findUnlisted(discovered, matrix), ['GET /debug/vars', 'DELETE /items/{}']);
});

const APP_DIRS = ['src', 'app', 'apps', 'server', 'api', 'backend', 'packages', 'functions', 'routes', 'pages'];
const ADAPTER = path.join(repoRoot, 'tests', 'security', 'adapters', 'discover-endpoints.mjs');

test('every real endpoint in the application appears in the matrix', async (t) => {
  const appDirs = APP_DIRS.filter((d) => fs.existsSync(path.join(repoRoot, d)));
  if (appDirs.length === 0 && !fs.existsSync(ADAPTER)) {
    t.skip('NOT VERIFIED: no application code yet (none of ' + APP_DIRS.join(', ') + '). Activates automatically when one appears.');
    return;
  }
  assert.ok(fs.existsSync(ADAPTER),
    `application code found (${appDirs.join(', ')}) but no endpoint discovery adapter at tests/security/adapters/discover-endpoints.mjs. ` +
    'Add one for the chosen stack (export async function discoverEndpoints({ root }) returning [{ method, path }]). Failing closed.');
  const { discoverEndpoints } = await import(pathToFileURL(ADAPTER).href);
  const discovered = await discoverEndpoints({ root: repoRoot });
  assert.ok(Array.isArray(discovered) && discovered.length > 0, 'adapter found no endpoints; a broken adapter must not pass silently');
  const unlisted = findUnlisted(discovered, matrix);
  assert.deepEqual(unlisted, [], 'endpoints missing from docs/security/authorization-matrix.json');
});
