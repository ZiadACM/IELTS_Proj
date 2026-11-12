// SYNTHETIC TEST FIXTURE. NOT APPLICATION CODE. Never deploy, never copy into src/.
// A tiny in-memory HTTP server that implements docs/security/authorization-matrix.json plus the test-support
// contract (docs/security/test-harness-contract.md), so the live security suites can be proven to work before the
// real app exists: every suite must FAIL against the vulnerable variant and PASS against the safe one
// (tests/security/fixture-proof.test.mjs). Each vulnerability is switched on by the test-plan case id it breaks.
// Passwords are synthetic and hashed with node:crypto scrypt only to avoid storing them in plain text in memory.
import http from 'node:http';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { validateItem } from '../../../tools/validate-content.mjs';

export const VULNERABILITIES = Object.freeze({
  'LEAK-02': 'item delivery payload carries answerLabel for every question',
  'LEAK-03': 'exam attempt state carries the transcript while the exam is in progress',
  'LEAK-04': 'review is served before the attempt is submitted',
  'LEAK-05': 'client bundle embeds published items and its source map is served',
  'LEAK-06': 'attempt ids are sequential integers',
  'LEAK-07': 'validation errors quote the correct answer',
  'LEAK-08': 'review after submit omits the authored route and transcript (positive control broken)',
  'EXAM-02': 'replay is allowed in exam mode',
  'EXAM-03': 'hint is allowed in exam mode',
  'EXAM-04': 'exam audio can be fetched again, rewound and from a new session',
  'EXAM-05': 'late writes accepted; client deadline field honoured',
  'EXAM-06': 'attempt mode can be PATCHed; a guided attempt may be opened beside an open exam',
  'EXAM-07': 'parallel exam attempts allowed; seenBefore never set',
  'AUTHZ-03': 'attempt endpoints do not check ownership (IDOR)',
  'AUTHZ-04': '/me endpoints honour userId from query, header or body',
  'AUTHZ-05': 'attempt reads work without a session',
  'AUTHZ-06': 'content_author can publish and learners can list admin items',
  'AUTHZ-07': 'request bodies are mass-assigned onto stored records',
  'AUTHZ-08': 'progress is writable by the client',
  'XSS-01': 'item import skips validation and staff preview is served as text/html',
  'XSS-02': 'staff report view renders learner text as raw HTML',
  'XSS-03': 'no nosniff header on API responses and no CSP on pages',
  'SESS-08': 'guest sessions are not rate-limited and idle guest data is never deleted',
  'SESS-09': 'guest upgrade adopts the guest session named in the body; the old session stays valid',
});

const ROLES_STAFF = new Set(['content_author', 'content_reviewer', 'admin']);
const GUEST_LIMIT = 10; // guest sessions per client per window
const GUEST_WINDOW_MS = 60_000;
const GUEST_IDLE_MS = 30 * 24 * 3600_000; // D11
const EXAM_EXTRA_SEC = 60; // fixture exam time limit = audio duration + 60 s
const AUDIO_BUFFER_SEC = 10; // D9

const hash = (pw, salt = randomBytes(16)) => ({ salt, h: scryptSync(pw, salt, 32) });
const checkPw = (pw, rec) => rec && timingSafeEqual(scryptSync(pw, rec.salt, 32), rec.h);

export function createFixtureServer({ vulnerable = [], supportToken = randomBytes(16).toString('hex') } = {}) {
  const V = new Set(vulnerable === 'all' ? Object.keys(VULNERABILITIES) : vulnerable);
  for (const v of V) if (!VULNERABILITIES[v]) throw new Error(`unknown vulnerability ${v}`);
  const vuln = (id) => V.has(id);

  let clockOffset = 0;
  const now = () => Date.now() + clockOffset;
  const users = new Map(); const sessions = new Map(); const items = new Map(); const attempts = new Map();
  const reports = []; const progressOverrides = new Map(); const guestRate = new Map();
  let seq = 1000;
  const newAttemptId = () => (vuln('LEAK-06') ? String(++seq) : randomUUID());
  const audioBytes = randomBytes(4096);

  // ---- response helpers ---------------------------------------------------------------------------
  const send = (res, status, body, type = 'application/json; charset=utf-8', extra = {}) => {
    const h = { 'content-type': type, 'cache-control': 'no-store', ...extra };
    if (!vuln('XSS-03')) h['x-content-type-options'] = 'nosniff';
    res.writeHead(status, h);
    res.end(body === undefined ? undefined : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };
  const json = (res, status, obj, extra) => send(res, status, obj === undefined ? undefined : JSON.stringify(obj), 'application/json; charset=utf-8', extra);
  const err = (res, status, error) => json(res, status, { error });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const sessionCookie = (token) => `sid=${token}; HttpOnly; SameSite=Lax; Path=/`;
  const newSession = (res, userId) => {
    const token = randomBytes(24).toString('base64url');
    sessions.set(token, { userId, createdAt: now() });
    res.setHeader('set-cookie', sessionCookie(token));
    return token;
  };
  const tokenOf = (req) => /(?:^|;\s*)sid=([^;]+)/.exec(req.headers.cookie ?? '')?.[1] ?? null;
  const caller = (req) => {
    const t = tokenOf(req); const s = t && sessions.get(t); const u = s && users.get(s.userId);
    if (u) u.lastActiveAt = now();
    return u ? { user: u, token: t } : null;
  };

  const readBody = (req) => new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 256 * 1024) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { const v = JSON.parse(raw); resolve(v && typeof v === 'object' && !Array.isArray(v) ? v : Symbol.for('bad')); } catch { resolve(Symbol.for('bad')); }
    });
    req.on('error', reject);
  });
  const onlyKeys = (body, allowed) => Object.keys(body).every((k) => allowed.includes(k));

  // ---- views (what the client may see) ----------------------------------------------------------------
  const deliveryView = (rec) => {
    const i = rec.item;
    return {
      id: rec.id, type: i.type, audio: { durationSec: i.audio.durationSec },
      map: { width: i.map.width, height: i.map.height, landmarks: i.map.landmarks.map(({ id, label, x, y }) => ({ id, label, x, y })), targets: i.map.targets.map(({ label, x, y }) => ({ label, x, y })) },
      questions: i.questions.map((q) => (vuln('LEAK-02') ? { id: q.id, prompt: q.prompt, answerLabel: q.answerLabel } : { id: q.id, prompt: q.prompt })),
      unofficialPractice: true,
    };
  };
  const attemptView = (a) => {
    const v = {
      id: a.id, itemId: a.itemId, mode: a.mode, status: a.status, answers: a.answers,
      supportUsage: { replayCount: a.replayCount, hintCount: a.hintCount },
      deadline: a.deadline ? new Date(a.deadline).toISOString() : null,
      seenBefore: a.seenBefore, countsTowardIndependentReadiness: a.countsTowardIndependentReadiness,
      late: a.late,
    };
    if (a.status === 'submitted') v.score = a.score;
    if (vuln('LEAK-03') && a.mode === 'exam') v.transcript = items.get(a.itemId).item.transcript;
    return v;
  };
  const reviewView = (a) => {
    const i = items.get(a.itemId).item;
    if (vuln('LEAK-08')) return { score: a.score };
    return {
      attemptId: a.id, score: a.score, yourAnswers: a.answers,
      correctAnswers: Object.fromEntries(i.questions.map((q) => [q.id, q.answerLabel])),
      explanations: Object.fromEntries(i.questions.map((q) => [q.id, q.explanation ?? null])),
      route: i.events, transcript: i.transcript,
    };
  };

  // ---- attempt rules -------------------------------------------------------------------------------
  const isOpen = (a) => a.status === 'open' && !(a.mode === 'exam' && a.deadline && now() > a.deadline && !vuln('EXAM-05'));
  const ownAttempt = (req, res, id) => {
    const c = caller(req);
    const a = attempts.get(id);
    if (!c) {
      if (vuln('AUTHZ-05') && a && req.method === 'GET') return { a, c: { user: users.get(a.userId) } };
      err(res, 401, 'unauthenticated'); return null;
    }
    if (c.user.role === 'admin') { err(res, 403, 'forbidden'); return null; } // D7
    if (!a || (a.userId !== c.user.id && !vuln('AUTHZ-03'))) { err(res, 404, 'not found'); return null; }
    return { a, c };
  };
  const scoreOf = (a) => {
    const i = items.get(a.itemId).item;
    return i.questions.filter((q) => a.answers[q.id] === q.answerLabel).length;
  };

  // ---- routes ----------------------------------------------------------------------------------------
  const routes = [];
  const route = (method, pattern, handler) => routes.push({ method, re: new RegExp('^' + pattern.replace(/\{(\w+)\}/g, '(?<$1>[^/]+)') + '$'), handler });
  const requireUser = (req, res) => { const c = caller(req); if (!c) err(res, 401, 'unauthenticated'); return c; };
  const requireRole = (req, res, roles) => {
    const c = requireUser(req, res); if (!c) return null;
    if (!roles.includes(c.user.role)) { err(res, 403, 'forbidden'); return null; }
    return c;
  };

  // static page and bundle (LEAK-05, XSS-03)
  route('GET', '/', (req, res) => {
    const extra = vuln('XSS-03') ? {} : { 'content-security-policy': "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" };
    send(res, 200, '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>SYNTHETIC fixture</title><script src="/assets/app.js" defer></script></head><body><main id="app"></main></body></html>', 'text/html; charset=utf-8', extra);
  });
  route('GET', '/assets/app.js', (req, res) => {
    const baked = vuln('LEAK-05') ? `const ITEMS=${JSON.stringify([...items.values()].filter((r) => r.status === 'published').map((r) => r.item))};\n` : '';
    send(res, 200, `${baked}document.getElementById('app').textContent='SYNTHETIC fixture';\n${vuln('LEAK-05') ? '//# sourceMappingURL=app.js.map\n' : ''}`, 'text/javascript; charset=utf-8');
  });
  route('GET', '/assets/app.js.map', (req, res) => (vuln('LEAK-05') ? json(res, 200, { version: 3, sources: ['src/answers.ts'], sourcesContent: ['export const KEY = "C"'] }) : err(res, 404, 'not found')));

  // AUTH
  route('POST', '/auth/guest-sessions', (req, res) => {
    if (caller(req)) return err(res, 403, 'already signed in');
    const ip = req.socket.remoteAddress;
    const recent = (guestRate.get(ip) ?? []).filter((t) => now() - t < GUEST_WINDOW_MS);
    if (!vuln('SESS-08') && recent.length >= GUEST_LIMIT) return err(res, 429, 'too many guest sessions');
    recent.push(now()); guestRate.set(ip, recent);
    const u = { id: randomUUID(), role: 'guest', email: null, pw: null, settings: { displayName: '', language: 'ar', goalBand: null }, lastActiveAt: now() };
    users.set(u.id, u); newSession(res, u.id);
    json(res, 201, { userId: u.id, role: 'guest' });
  });
  route('POST', '/accounts', async (req, res, body) => {
    const c = caller(req);
    if (c && c.user.role !== 'guest') return err(res, 403, 'already have an account');
    const allowed = ['email', 'password'];
    if (!vuln('SESS-09') && !onlyKeys(body, allowed)) return err(res, 400, 'unexpected field');
    if (typeof body.email !== 'string' || !/^[^@\s]+@[^@\s]+$/.test(body.email) || typeof body.password !== 'string' || body.password.length < 12) return err(res, 400, 'invalid email or password');
    if ([...users.values()].some((u) => u.email === body.email)) return err(res, 409, 'cannot create account');
    let u;
    if (c) { // guest upgrade: only the caller's own guest data moves
      u = c.user;
      if (vuln('SESS-09') && typeof body.guestSessionId === 'string' && sessions.get(body.guestSessionId)) u = users.get(sessions.get(body.guestSessionId).userId);
      if (!vuln('SESS-09')) for (const [t, s] of sessions) if (s.userId === u.id) sessions.delete(t);
    } else {
      u = { id: randomUUID(), settings: { displayName: '', language: 'ar', goalBand: null } };
      users.set(u.id, u);
    }
    Object.assign(u, { role: 'learner', email: body.email, pw: hash(body.password), lastActiveAt: now() });
    newSession(res, u.id);
    json(res, 201, { userId: u.id, role: 'learner' });
  });
  route('POST', '/auth/sessions', (req, res, body) => {
    if (!onlyKeys(body, ['email', 'password']) || typeof body.email !== 'string' || typeof body.password !== 'string') return err(res, 400, 'invalid request');
    const u = [...users.values()].find((x) => x.email === body.email);
    if (!u || !checkPw(body.password, u.pw)) return err(res, 401, 'invalid credentials');
    newSession(res, u.id);
    json(res, 200, { userId: u.id, role: u.role });
  });
  route('DELETE', '/auth/sessions/current', (req, res) => {
    const c = requireUser(req, res); if (!c) return;
    sessions.delete(c.token);
    res.setHeader('set-cookie', 'sid=; Max-Age=0; Path=/');
    json(res, 204);
  });
  route('POST', '/auth/password-resets', (req, res, body) => {
    const c = caller(req);
    if (c?.user.role === 'guest') return err(res, 403, 'forbidden');
    if (!onlyKeys(body, ['email']) || typeof body.email !== 'string') return err(res, 400, 'invalid request');
    json(res, 202, { status: 'if the account exists, a reset email was sent' });
  });

  // ME
  const meTarget = (req, c, body, url) => {
    if (!vuln('AUTHZ-04')) return c.user;
    const id = url.searchParams.get('userId') ?? req.headers['x-user-id'] ?? body?.userId;
    return (id && users.get(id)) || c.user;
  };
  route('GET', '/me/settings', (req, res, body, url) => {
    const c = requireUser(req, res); if (!c) return;
    const u = meTarget(req, c, body, url);
    json(res, 200, { userId: u.id, settings: u.settings });
  });
  route('PATCH', '/me/settings', (req, res, body, url) => {
    const c = requireUser(req, res); if (!c) return;
    const u = meTarget(req, c, body, url);
    if (vuln('AUTHZ-07')) { const { settings, ...rest } = body; Object.assign(u, rest); Object.assign(u.settings, body); return json(res, 200, { userId: u.id, settings: u.settings }); }
    const allowed = vuln('AUTHZ-04') ? ['displayName', 'language', 'goalBand', 'userId'] : ['displayName', 'language', 'goalBand'];
    if (!onlyKeys(body, allowed)) return err(res, 400, 'unexpected field');
    if (body.displayName !== undefined && (typeof body.displayName !== 'string' || body.displayName.length > 80)) return err(res, 400, 'invalid displayName');
    if (body.language !== undefined && !['ar', 'en'].includes(body.language)) return err(res, 400, 'invalid language');
    if (body.goalBand !== undefined && body.goalBand !== null && !(typeof body.goalBand === 'number' && body.goalBand >= 4 && body.goalBand <= 9)) return err(res, 400, 'invalid goalBand');
    for (const k of ['displayName', 'language', 'goalBand']) if (body[k] !== undefined) u.settings[k] = body[k];
    json(res, 200, { userId: u.id, settings: u.settings });
  });
  route('DELETE', '/me', (req, res) => {
    const c = requireUser(req, res); if (!c) return;
    users.delete(c.user.id);
    for (const [t, s] of sessions) if (s.userId === c.user.id) sessions.delete(t);
    for (const [id, a] of attempts) if (a.userId === c.user.id) attempts.delete(id);
    res.setHeader('set-cookie', 'sid=; Max-Age=0; Path=/');
    json(res, 204);
  });

  // ITEMS
  const visibleItem = (id, c) => {
    const r = items.get(id);
    if (!r) return null;
    if (r.status === 'published') return r;
    return null;
  };
  route('GET', '/items', (req, res) => {
    const c = requireUser(req, res); if (!c) return;
    json(res, 200, { items: [...items.values()].filter((r) => r.status === 'published').map((r) => ({ id: r.id, type: r.item.type, unofficialPractice: true })) });
  });
  route('GET', '/items/{itemId}', (req, res, body, url, p) => {
    const c = requireUser(req, res); if (!c) return;
    const r = visibleItem(p.itemId, c); if (!r) return err(res, 404, 'not found');
    json(res, 200, deliveryView(r));
  });
  route('POST', '/items/{itemId}/reports', (req, res, body, url, p) => {
    const c = requireUser(req, res); if (!c) return;
    if (!visibleItem(p.itemId, c)) return err(res, 404, 'not found');
    if (!onlyKeys(body, ['text']) || typeof body.text !== 'string' || body.text.length < 1 || body.text.length > 2000) return err(res, 400, 'invalid report');
    const r = { id: randomUUID(), itemId: p.itemId, text: body.text, createdAt: new Date(now()).toISOString() };
    reports.push(r);
    json(res, 201, { id: r.id });
  });

  // ATTEMPTS
  route('POST', '/attempts', (req, res, body) => {
    const c = requireUser(req, res); if (!c) return;
    if (!vuln('AUTHZ-07') && !onlyKeys(body, ['itemId', 'mode'])) return err(res, 400, 'unexpected field');
    if (!['guided', 'exam'].includes(body.mode)) return err(res, 400, 'mode must be guided or exam');
    const r = visibleItem(body.itemId, c); if (!r) return err(res, 404, 'not found');
    const mine = [...attempts.values()].filter((a) => a.userId === c.user.id && a.itemId === r.id);
    const open = mine.filter((a) => a.status === 'open');
    const blocking = open.filter((a) => !(vuln('EXAM-06') && a.mode !== body.mode) && !(vuln('EXAM-07') && a.mode === body.mode));
    if (blocking.length) return err(res, 409, 'an attempt on this item is already open');
    const seenBefore = !vuln('EXAM-07') && mine.some((a) => a.status === 'submitted');
    const a = {
      id: newAttemptId(), userId: c.user.id, itemId: r.id, mode: body.mode, status: 'open', answers: {},
      replayCount: 0, hintCount: 0, createdAt: now(),
      deadline: body.mode === 'exam' ? now() + (r.item.audio.durationSec + EXAM_EXTRA_SEC) * 1000 : null,
      seenBefore, countsTowardIndependentReadiness: body.mode === 'exam' && !seenBefore, late: false,
      audio: { delivered: 0, token: null, grantEndsAt: null },
    };
    if (vuln('AUTHZ-07')) { const { itemId, ...rest } = body; Object.assign(a, rest); }
    attempts.set(a.id, a);
    json(res, 201, attemptView(a));
  });
  route('GET', '/me/attempts', (req, res) => {
    const c = requireUser(req, res); if (!c) return;
    json(res, 200, { attempts: [...attempts.values()].filter((a) => a.userId === c.user.id).map(attemptView) });
  });
  route('GET', '/attempts/{attemptId}', (req, res, body, url, p) => {
    const o = ownAttempt(req, res, p.attemptId); if (!o) return;
    json(res, 200, attemptView(o.a));
  });
  route('PATCH', '/attempts/{attemptId}', (req, res, body, url, p) => {
    if (!vuln('EXAM-06')) return err(res, 405, 'method not allowed');
    const o = ownAttempt(req, res, p.attemptId); if (!o) return;
    if (body.mode) o.a.mode = body.mode;
    json(res, 200, attemptView(o.a));
  });
  route('PUT', '/attempts/{attemptId}/answers', (req, res, body, url, p) => {
    const o = ownAttempt(req, res, p.attemptId); if (!o) return;
    const { a } = o;
    if (vuln('EXAM-05') && typeof body.deadline === 'string') a.deadline = Date.parse(body.deadline);
    if (!isOpen(a)) return err(res, 409, a.status === 'open' ? 'deadline passed' : 'attempt is submitted');
    const i = items.get(a.itemId).item;
    const labels = new Set(i.map.targets.map((t) => t.label));
    if (!vuln('AUTHZ-07') && !vuln('EXAM-05') && !onlyKeys(body, ['answers'])) return err(res, 400, 'unexpected field');
    if (!body.answers || typeof body.answers !== 'object' || Array.isArray(body.answers)) return err(res, 400, 'answers must be an object');
    for (const [q, v] of Object.entries(body.answers)) {
      const question = i.questions.find((x) => x.id === q);
      if (!question || typeof v !== 'string' || !labels.has(v)) {
        return err(res, 400, vuln('LEAK-07') && question ? `invalid answer for ${q}: expected ${question.answerLabel} (${question.explanation})` : `invalid answer for ${q}`);
      }
    }
    Object.assign(a.answers, body.answers);
    if (vuln('AUTHZ-07')) { const { answers, ...rest } = body; Object.assign(a, rest); }
    json(res, 200, attemptView(a));
  });
  route('POST', '/attempts/{attemptId}/submit', (req, res, body, url, p) => {
    const o = ownAttempt(req, res, p.attemptId); if (!o) return;
    const { a } = o;
    if (!isOpen(a)) return err(res, 409, a.status === 'open' ? 'deadline passed' : 'attempt is submitted');
    if (!vuln('AUTHZ-07') && !vuln('AUTHZ-08') && !onlyKeys(body, [])) return err(res, 400, 'unexpected field');
    a.status = 'submitted';
    a.score = (vuln('AUTHZ-07') || vuln('AUTHZ-08')) && typeof body.score === 'number' ? body.score : scoreOf(a);
    if (a.mode === 'exam' && a.deadline && now() > a.deadline) a.late = true;
    json(res, 200, attemptView(a));
  });
  route('GET', '/attempts/{attemptId}/audio', (req, res, body, url, p) => {
    const o = ownAttempt(req, res, p.attemptId); if (!o) return;
    const { a } = o;
    if (!isOpen(a)) return err(res, 409, 'attempt is not open');
    const size = audioBytes.length;
    const m = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
    let start = m ? Number(m[1]) : 0; let end = m && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (a.mode === 'exam' && !vuln('EXAM-04')) {
      const t = tokenOf(req);
      if (a.audio.token && a.audio.token !== t) return err(res, 403, 'audio grant belongs to another session');
      if (a.audio.grantEndsAt && now() > a.audio.grantEndsAt) return err(res, 410, 'audio grant ended');
      if (start < a.audio.delivered) return err(res, 416, 'exam audio is forward-only');
      if (start >= size) return err(res, 416, 'audio already delivered');
      if (!a.audio.token) { a.audio.token = t; a.audio.grantEndsAt = now() + (items.get(a.itemId).item.audio.durationSec + AUDIO_BUFFER_SEC) * 1000; }
      a.audio.delivered = Math.max(a.audio.delivered, end + 1);
    }
    if (start >= size || start > end) return err(res, 416, 'range not satisfiable');
    const chunk = audioBytes.subarray(start, end + 1);
    res.writeHead(m ? 206 : 200, {
      'content-type': 'audio/mpeg', 'cache-control': 'no-store', 'accept-ranges': 'bytes',
      ...(m ? { 'content-range': `bytes ${start}-${end}/${size}` } : {}),
      ...(vuln('XSS-03') ? {} : { 'x-content-type-options': 'nosniff' }),
    });
    res.end(chunk);
  });
  route('POST', '/attempts/{attemptId}/replays', (req, res, body, url, p) => {
    const o = ownAttempt(req, res, p.attemptId); if (!o) return;
    const { a } = o;
    if (!isOpen(a)) return err(res, 409, 'attempt is not open');
    if (a.mode !== 'guided' && !vuln('EXAM-02')) return err(res, 403, 'replay is not allowed in exam mode');
    a.replayCount++;
    a.audio.delivered = 0;
    json(res, 201, { supportUsage: { replayCount: a.replayCount, hintCount: a.hintCount } });
  });
  route('POST', '/attempts/{attemptId}/hints', (req, res, body, url, p) => {
    const o = ownAttempt(req, res, p.attemptId); if (!o) return;
    const { a } = o;
    if (!isOpen(a)) return err(res, 409, 'attempt is not open');
    if (a.mode !== 'guided' && !vuln('EXAM-03')) return err(res, 403, 'hints are not allowed in exam mode');
    const q = items.get(a.itemId).item.questions.find((x) => x.id === body.questionId);
    if (!q) return err(res, 400, 'unknown questionId');
    a.hintCount++;
    json(res, 201, { questionId: q.id, hint: q.hint, supportUsage: { replayCount: a.replayCount, hintCount: a.hintCount } });
  });
  route('GET', '/attempts/{attemptId}/review', (req, res, body, url, p) => {
    const o = ownAttempt(req, res, p.attemptId); if (!o) return;
    if (o.a.status !== 'submitted' && !vuln('LEAK-04')) return err(res, 409, 'review opens after submission');
    json(res, 200, reviewView(o.a));
  });

  // PROGRESS
  const progressOf = (u) => {
    if (vuln('AUTHZ-08') && progressOverrides.has(u.id)) return progressOverrides.get(u.id);
    const mine = [...attempts.values()].filter((a) => a.userId === u.id && a.status === 'submitted');
    return { attemptsSubmitted: mine.length, independentReadiness: { examAttemptsCounted: mine.filter((a) => a.countsTowardIndependentReadiness).length } };
  };
  route('GET', '/me/progress', (req, res) => { const c = requireUser(req, res); if (c) json(res, 200, progressOf(c.user)); });
  route('GET', '/me/recommendations', (req, res) => { const c = requireUser(req, res); if (c) json(res, 200, { provisional: true, next: [...items.values()].find((r) => r.status === 'published')?.id ?? null }); });
  for (const m of ['PUT', 'PATCH', 'POST']) {
    route(m, '/me/progress', (req, res, body) => {
      if (!vuln('AUTHZ-08')) return err(res, 405, 'method not allowed');
      const c = requireUser(req, res); if (!c) return;
      progressOverrides.set(c.user.id, body); json(res, 200, body);
    });
    route(m, '/me/recommendations', (req, res) => err(res, 405, 'method not allowed'));
  }

  // ADMIN
  const AUTHOR_REVIEWER = ['content_author', 'content_reviewer'];
  const learnerSeesAdmin = () => (vuln('AUTHZ-06') ? ['learner'] : []);
  const importItem = (body) => {
    if (!body.item || typeof body.item !== 'object') return { error: 'item is required' };
    const item = { ...body.item, validation: { status: 'draft' } };
    if (!vuln('XSS-01')) {
      const errors = validateItem(item);
      if (errors.length) return { error: 'item failed validation', codes: [...new Set(errors.map((e) => e.code))] };
    }
    return { item };
  };
  route('GET', '/admin/items', (req, res) => {
    const c = requireRole(req, res, [...AUTHOR_REVIEWER, ...learnerSeesAdmin()]); if (!c) return;
    json(res, 200, { items: [...items.values()].map((r) => ({ id: r.id, status: r.status })) });
  });
  route('POST', '/admin/items', (req, res, body) => {
    const c = requireRole(req, res, AUTHOR_REVIEWER); if (!c) return;
    const r = importItem(body); if (r.error) return json(res, 422, r);
    const id = randomUUID(); items.set(id, { id, item: r.item, status: 'draft' });
    json(res, 201, { itemId: id, status: 'draft' });
  });
  route('PUT', '/admin/items/{itemId}', (req, res, body, url, p) => {
    const c = requireRole(req, res, AUTHOR_REVIEWER); if (!c) return;
    const rec = items.get(p.itemId); if (!rec) return err(res, 404, 'not found');
    if (rec.status === 'published') return err(res, 409, 'published items cannot be edited');
    const r = importItem(body); if (r.error) return json(res, 422, r);
    rec.item = r.item; json(res, 200, { itemId: rec.id, status: rec.status });
  });
  route('GET', '/admin/items/{itemId}/preview', (req, res, body, url, p) => {
    const c = requireRole(req, res, AUTHOR_REVIEWER); if (!c) return;
    const rec = items.get(p.itemId); if (!rec) return err(res, 404, 'not found');
    if (vuln('XSS-01')) return send(res, 200, `<html><body>${rec.item.transcript.cues.map((x) => `<p>${x.text}</p>`).join('')}${rec.item.questions.map((q) => `<p>${q.prompt}</p>`).join('')}</body></html>`, 'text/html; charset=utf-8');
    json(res, 200, { itemId: rec.id, status: rec.status, item: rec.item });
  });
  route('POST', '/admin/items/{itemId}/publish', (req, res, body, url, p) => {
    const c = requireRole(req, res, vuln('AUTHZ-06') ? AUTHOR_REVIEWER : ['content_reviewer']); if (!c) return;
    const rec = items.get(p.itemId); if (!rec) return err(res, 404, 'not found');
    rec.status = 'published';
    rec.item.validation = { status: 'published', reviewer: c.user.id, reviewedOn: new Date(now()).toISOString().slice(0, 10) };
    json(res, 200, { itemId: rec.id, status: rec.status });
  });
  route('GET', '/admin/reports', (req, res) => {
    const c = requireRole(req, res, AUTHOR_REVIEWER); if (!c) return;
    if (vuln('XSS-02')) return send(res, 200, `<ul>${reports.map((r) => `<li>${r.text}</li>`).join('')}</ul>`, 'text/html; charset=utf-8');
    json(res, 200, { reports: reports.map((r) => ({ id: r.id, itemId: r.itemId, text: r.text, createdAt: r.createdAt })) });
  });
  route('PUT', '/admin/users/{userId}/roles', (req, res, body, url, p) => {
    const c = requireRole(req, res, ['admin']); if (!c) return;
    const u = users.get(p.userId); if (!u || u.role === 'guest') return err(res, 404, 'not found');
    if (!vuln('AUTHZ-07') && !onlyKeys(body, ['roles'])) return err(res, 400, 'unexpected field');
    if (!Array.isArray(body.roles) || !body.roles.every((r) => ['content_author', 'content_reviewer', 'admin'].includes(r))) return err(res, 400, 'invalid roles');
    u.role = body.roles[0] ?? 'learner';
    if (vuln('AUTHZ-07')) { const { roles, ...rest } = body; Object.assign(u, rest); }
    json(res, 200, { userId: u.id, roles: body.roles });
  });

  // TEST SUPPORT (contract: docs/security/test-harness-contract.md). Disabled without the token.
  const supportOkHeader = (req) => {
    const got = Buffer.from(String(req.headers['x-test-support-token'] ?? ''));
    const want = Buffer.from(supportToken);
    return got.length === want.length && timingSafeEqual(got, want);
  };
  route('GET', '/__test__/health', (req, res) => json(res, 200, { ok: true, synthetic: true }));
  route('POST', '/__test__/users', (req, res, body) => {
    if (!['learner', ...ROLES_STAFF].includes(body.role)) return err(res, 400, 'invalid role');
    const u = { id: randomUUID(), role: body.role, email: body.email, pw: hash(body.password), settings: { displayName: '', language: 'ar', goalBand: null }, lastActiveAt: now() };
    users.set(u.id, u); json(res, 201, { userId: u.id });
  });
  route('GET', '/__test__/users/{userId}', (req, res, body, url, p) => {
    const u = users.get(p.userId); if (!u) return err(res, 404, 'not found');
    json(res, 200, { userId: u.id, role: u.role, attempts: [...attempts.values()].filter((a) => a.userId === u.id).length });
  });
  route('POST', '/__test__/items', (req, res, body) => {
    const id = randomUUID(); items.set(id, { id, item: body.item, status: body.status === 'published' ? 'published' : 'draft' });
    json(res, 201, { itemId: id });
  });
  route('POST', '/__test__/clock', (req, res, body) => { clockOffset += (Number(body.advanceSeconds) || 0) * 1000; json(res, 200, { now: new Date(now()).toISOString() }); });
  route('POST', '/__test__/rate-limits/reset', (req, res) => { guestRate.clear(); json(res, 204); });
  route('POST', '/__test__/jobs/retention', (req, res) => {
    let deleted = 0;
    if (!vuln('SESS-08')) for (const u of [...users.values()]) {
      if (u.role === 'guest' && now() - u.lastActiveAt > GUEST_IDLE_MS) {
        users.delete(u.id); deleted++;
        for (const [t, s] of sessions) if (s.userId === u.id) sessions.delete(t);
        for (const [id, a] of attempts) if (a.userId === u.id) attempts.delete(id);
      }
    }
    json(res, 200, { deleted });
  });

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://fixture.invalid');
      if (url.pathname.startsWith('/__test__/') && !supportOkHeader(req)) return err(res, 404, 'not found');
      const matches = routes.map((r) => ({ r, m: r.re.exec(url.pathname) })).filter((x) => x.m);
      if (!matches.length) return err(res, 404, 'not found');
      const hit = matches.find((x) => x.r.method === req.method);
      if (!hit) return err(res, 405, 'method not allowed');
      const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? await readBody(req) : {};
      if (body === Symbol.for('bad')) return err(res, 400, 'body must be a JSON object');
      await hit.r.handler(req, res, body, url, hit.m.groups ?? {});
    } catch (e) {
      if (!res.headersSent) err(res, e.status ?? 500, e.status ? e.message : 'internal error');
    }
  });

  return {
    supportToken, vulnerabilities: [...V],
    async listen() { await new Promise((r) => server.listen(0, '127.0.0.1', r)); return `http://127.0.0.1:${server.address().port}`; },
    close() { server.closeAllConnections?.(); return new Promise((r) => server.close(r)); },
  };
}

// CLI: node tests/security/fixtures/fixture-server.mjs [safe|vulnerable|<CASE-ID,...>]
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2] ?? 'safe';
  const fx = createFixtureServer({ vulnerable: arg === 'safe' ? [] : arg === 'vulnerable' ? 'all' : arg.split(',') });
  const url = await fx.listen();
  console.log(`SYNTHETIC fixture (${arg}) at ${url}\nSECURITY_BASE_URL=${url} SECURITY_TEST_SUPPORT_TOKEN=${fx.supportToken}`);
}
