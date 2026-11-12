// Harness for the LIVE security suites (they send real HTTP requests to a running app).
// Contract the app must implement for these tests: docs/security/test-harness-contract.md.
// Configuration (environment only; nothing is read from the repo, no real secrets):
//   SECURITY_BASE_URL            e.g. http://127.0.0.1:3000 (a TEST environment, never production)
//   SECURITY_TEST_SUPPORT_TOKEN  random per-run value; the app enables /__test__/* only when it is set
//   SECURITY_REQUIRE_TARGET=1    make a missing SECURITY_BASE_URL a failure instead of NOT VERIFIED (CI, once the app exists)
// No target configured => every live test is SKIPPED with a "NOT VERIFIED" reason. It never passes silently.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { repoRoot, loadMatrix } from './matrix.mjs';

export const matrix = loadMatrix();
export const config = Object.freeze({
  baseUrl: (process.env.SECURITY_BASE_URL || '').replace(/\/+$/, '') || null,
  supportToken: process.env.SECURITY_TEST_SUPPORT_TOKEN || null,
  requireTarget: process.env.SECURITY_REQUIRE_TARGET === '1',
});

export const NOT_VERIFIED_NO_TARGET =
  'NOT VERIFIED: no application to test (SECURITY_BASE_URL is not set). See docs/security/test-harness-contract.md.';

// Every live test goes through this wrapper so the "no target" rule is applied in exactly one place.
export function liveTest(name, fn) {
  test(name, async (t) => {
    if (!config.baseUrl) {
      if (config.requireTarget) assert.fail(`SECURITY_REQUIRE_TARGET=1 but SECURITY_BASE_URL is not set (${name})`);
      t.skip(NOT_VERIFIED_NO_TARGET);
      return;
    }
    assert.ok(config.supportToken, 'SECURITY_BASE_URL is set but SECURITY_TEST_SUPPORT_TOKEN is not: the harness cannot create synthetic users. Failing closed.');
    const env = await getEnv();
    await fn(t, env);
  });
}

// ---- HTTP client with a cookie jar per actor --------------------------------------------------------
export class Actor {
  constructor(name) { this.name = name; this.cookies = new Map(); this.userId = null; this.email = null; this.password = null; }
  cookieHeader() { return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '); }
  firstCookieValue() { return [...this.cookies.values()][0] ?? null; }
  async req(method, p, { body, headers = {}, rawBody } = {}) {
    const h = { ...headers };
    if (this.cookies.size) h.cookie = this.cookieHeader();
    let payload;
    if (rawBody !== undefined) payload = rawBody;
    else if (body !== undefined) { payload = JSON.stringify(body); h['content-type'] ??= 'application/json'; }
    const res = await fetch(config.baseUrl + p, { method, headers: h, body: payload, redirect: 'manual' });
    for (const c of res.headers.getSetCookie()) {
      const [pair, ...attrs] = c.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i).trim(); const v = pair.slice(i + 1).trim();
      const expired = attrs.some((a) => /^\s*max-age=0\s*$/i.test(a)) || v === '';
      if (expired) this.cookies.delete(k); else this.cookies.set(k, v);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    const text = bytes.toString('utf8');
    let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
    return { status: res.status, headers: res.headers, bytes, text, json, method, path: p };
  }
}

const ok2xx = (s) => s >= 200 && s < 300;
export { ok2xx };

async function support(method, p, body) {
  const res = await fetch(config.baseUrl + '/__test__' + p, {
    method, redirect: 'manual',
    headers: { 'x-test-support-token': config.supportToken, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : undefined; } catch { json = undefined; }
  return { status: res.status, json, text };
}

async function supportOk(method, p, body) {
  const r = await support(method, p, body);
  assert.ok(ok2xx(r.status), `test-support ${method} /__test__${p} returned ${r.status}: ${r.text.slice(0, 200)}`);
  return r.json;
}

// ---- synthetic data ----------------------------------------------------------------------------
const TEMPLATE = path.join(repoRoot, 'tests', 'security', 'fixtures', 'items', 'security-map.template.json');
export const WRONG_LABELS = ['A', 'D']; // never correct in the template; used as deliberately wrong answers

export function buildItem(runId, { suffix = '', status = 'published', mutate } = {}) {
  const item = JSON.parse(fs.readFileSync(TEMPLATE, 'utf8').replaceAll('{{RUN}}', runId));
  delete item._comment;
  item.id += suffix;
  item.validation = status === 'published'
    ? { status: 'published', reviewer: 'synthetic-reviewer', reviewedOn: '2026-11-12' }
    : { status: 'draft' };
  if (mutate) mutate(item);
  return item;
}

let envPromise = null;
export function getEnv() { return (envPromise ??= createEnv()); }

async function createEnv() {
  const health = await support('GET', '/health').catch((e) => { throw new Error(`target ${config.baseUrl} unreachable: ${e.message}. Failing closed.`); });
  assert.equal(health.status, 200, `GET /__test__/health returned ${health.status}; the test-support contract is not available`);
  const runId = randomBytes(6).toString('hex');
  const env = { runId, counter: 0, items: {} };
  const template = buildItem(runId);
  env.answers = Object.fromEntries(template.questions.map((q) => [q.id, q.answerLabel]));
  env.questionIds = template.questions.map((q) => q.id);
  env.durationSec = template.audio.durationSec;
  env.canaryRe = new RegExp(`CANARY-[A-Z]+-${runId}`);
  for (const key of ['p1', 'p2', 'p3', 'p4']) env.items[key] = (await supportOk('POST', '/items', { item: buildItem(runId, { suffix: `-${key}` }), status: 'published' })).itemId;
  env.items.draft = (await supportOk('POST', '/items', { item: buildItem(runId, { suffix: '-draft', status: 'draft' }), status: 'draft' })).itemId;

  env.uniq = (p) => `${p}-${runId}-${++env.counter}`;
  env.email = (p) => `${env.uniq(p)}@example.test`;
  env.newPassword = () => `Synthetic-${randomBytes(12).toString('hex')}`;
  env.support = support;
  env.supportOk = supportOk;
  env.seedDraft = async () => (await supportOk('POST', '/items', { item: buildItem(runId, { suffix: `-d${++env.counter}`, status: 'draft' }), status: 'draft' })).itemId;
  env.serverNow = async () => Date.parse((await supportOk('POST', '/clock', { advanceSeconds: 0 })).now);
  env.advanceClock = (seconds) => supportOk('POST', '/clock', { advanceSeconds: seconds });

  // Actors. Staff and learners are created through test-support, then sign in through the REAL endpoint (AUTH-02).
  env.anonymous = (name = 'anonymous') => new Actor(name);
  env.guest = async (name = 'guest') => {
    await supportOk('POST', '/rate-limits/reset');
    const a = new Actor(name);
    const r = await a.req('POST', '/auth/guest-sessions');
    assert.ok(ok2xx(r.status) && a.cookies.size > 0, `could not start a guest session for ${name}: ${r.status} ${r.text.slice(0, 200)}`);
    a.userId = r.json?.userId ?? null;
    return a;
  };
  env.user = async (role, name = role) => {
    const a = new Actor(name);
    a.email = env.email(name); a.password = env.newPassword();
    a.userId = (await supportOk('POST', '/users', { role, email: a.email, password: a.password })).userId;
    await env.signIn(a);
    return a;
  };
  env.actor = (role, name) => (role === 'anonymous' ? env.anonymous(name) : role === 'guest' ? env.guest(name) : env.user(role, name));
  env.signIn = async (a) => {
    const r = await a.req('POST', '/auth/sessions', { body: { email: a.email, password: a.password } });
    assert.ok(ok2xx(r.status), `sign-in failed for ${a.name}: ${r.status} ${r.text.slice(0, 200)}`);
    return r;
  };

  // Attempt helpers (owner's view). They assert the happy path so a broken setup fails loudly.
  env.startAttempt = async (a, itemKey, mode) => {
    const r = await a.req('POST', '/attempts', { body: { itemId: env.items[itemKey] ?? itemKey, mode } });
    assert.ok(ok2xx(r.status), `${a.name} could not start a ${mode} attempt on ${itemKey}: ${r.status} ${r.text.slice(0, 200)}`);
    assert.ok(r.json?.id, 'POST /attempts must return the attempt id');
    return r.json;
  };
  env.readAttempt = async (a, id) => {
    const r = await a.req('GET', `/attempts/${id}`);
    assert.equal(r.status, 200, `${a.name} could not read own attempt ${id}: ${r.status}`);
    return r.json;
  };
  env.saveWrongAnswers = async (a, id) => {
    const r = await a.req('PUT', `/attempts/${id}/answers`, { body: { answers: Object.fromEntries(env.questionIds.map((q, i) => [q, WRONG_LABELS[i % 2]])) } });
    assert.ok(ok2xx(r.status), `${a.name} could not save answers on ${id}: ${r.status} ${r.text.slice(0, 200)}`);
  };
  env.submit = async (a, id) => {
    const r = await a.req('POST', `/attempts/${id}/submit`, { body: {} });
    assert.ok(ok2xx(r.status), `${a.name} could not submit ${id}: ${r.status} ${r.text.slice(0, 200)}`);
    return r.json;
  };
  env.findLeaks = (res) => findLeaks(res, env);
  return env;
}

// ---- leak detection (test-plan section 2, item 4: structural plus canaries) ----------------------------
export const FORBIDDEN_KEYS = new Set(['answerLabel', 'eventId', 'events', 'transcript', 'cues', 'note', 'explanation', 'rationale', 'evidence', 'route', 'isCorrect', 'hint']);
const isForbiddenKey = (k) => FORBIDDEN_KEYS.has(k) || /^correct/i.test(k);

export function findLeaks(res, env) {
  const found = [];
  const where = res.method ? `${res.method} ${res.path}` : 'response';
  const m = env.canaryRe.exec(res.text ?? '');
  if (m) found.push(`${where}: canary ${m[0]}`);
  const walk = (v, at) => {
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${at}[${i}]`)); return; }
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (isForbiddenKey(k)) found.push(`${where}: forbidden key ${at}.${k}`);
      // an answer-key map, e.g. { q1: "C" } (tests only ever save WRONG labels, so a correct pair is a leak)
      if (env.answers[k] !== undefined && x === env.answers[k]) found.push(`${where}: question-to-target pair ${at}.${k}=${x}`);
      walk(x, `${at}.${k}`);
    }
    // a question object carrying its own correct label, e.g. { id: "q1", target: "C" }
    if (typeof v.id === 'string' && env.answers[v.id] !== undefined) {
      for (const [k, x] of Object.entries(v)) if (k !== 'id' && k !== 'prompt' && x === env.answers[v.id]) found.push(`${where}: question ${v.id} carries its answer in "${k}"`);
    }
  };
  walk(res.json, '$');
  return found;
}

// ---- matrix helpers ------------------------------------------------------------------------------------
export const has = (e, flag) => (e.flags ?? []).includes(flag);
export const fillPath = (p, params) => p.replace(/\{(\w+)\}/g, (_, k) => {
  assert.ok(params[k] !== undefined, `no value for {${k}} in ${p}`);
  return encodeURIComponent(params[k]);
});
export const DENIED_WITH_SESSION = [403, 404];
export const REFUSED = [400, 403, 404, 405, 409, 410, 416, 422];
