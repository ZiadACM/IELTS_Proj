// SESS-08 and SESS-09 (docs/security/test-plan.md, threat model T2, owner decisions D5 and D11): guest-session abuse.
// SESS-01..SESS-06 are not written yet (they depend on the auth library configuration; see the baseline report).
// Live suite: needs SECURITY_BASE_URL. Guest creation comes from the `rateLimited` AUTH-05 row; upgrade is AUTH-01.
import assert from 'node:assert/strict';
import { liveTest, matrix, has, ok2xx } from './lib/live.mjs';

const byId = Object.fromEntries(matrix.endpoints.map((e) => [e.id, e]));
const PROBE = Number(process.env.SECURITY_GUEST_RATE_PROBE || 30);

liveTest('SESS-08: guest sessions are rate-limited per client, and idle guest data is deleted after 30 days (D11)', async (t, env) => {
  const e = byId['AUTH-05'];
  assert.ok(e && has(e, 'rateLimited'), 'AUTH-05 must exist and be flagged rateLimited');
  const problems = [];
  await env.supportOk('POST', '/rate-limits/reset');
  const statuses = [];
  for (let i = 0; i < PROBE; i++) statuses.push((await env.anonymous(`loop-${i}`).req(e.method, e.path)).status);
  if (!ok2xx(statuses[0])) problems.push(`first guest session should succeed, got ${statuses[0]}`);
  if (!statuses.includes(429)) problems.push(`${PROBE} guest sessions from one client, no 429 (statuses: ${[...new Set(statuses)].join(',')})`);
  await env.supportOk('POST', '/rate-limits/reset');

  // retention: idle guest data goes after 30 days of inactivity (the test controls the server clock)
  const g = await env.guest('idle-guest');
  await env.startAttempt(g, 'p1', 'guided');
  assert.ok(g.userId, 'POST /auth/guest-sessions must return userId');
  await env.advanceClock(30 * 24 * 3600 + 3600);
  const before = await env.support('GET', `/users/${encodeURIComponent(g.userId)}`);
  if (before.status !== 200) problems.push(`guest deleted before the retention job ran (${before.status}); the job must be what deletes data`);
  await env.supportOk('POST', '/jobs/retention');
  const after = await env.support('GET', `/users/${encodeURIComponent(g.userId)}`);
  if (after.status !== 404) problems.push(`idle guest still stored after the retention job (${after.status}, ${after.text.slice(0, 120)})`);
  const s = await g.req('GET', byId['ME-01'].path);
  if (s.status !== 401) problems.push(`idle guest's session still works after retention (${s.status})`);
  assert.deepEqual(problems, []);
});

liveTest("SESS-09: guest upgrade moves only the caller's own data and invalidates the old guest session", async (t, env) => {
  const e = byId['AUTH-01'];
  assert.ok(e && e.access.guest === 'allow', 'AUTH-01 must allow guests (upgrade, D5)');
  const problems = [];
  const ga = await env.guest('guest-a');
  const gb = await env.guest('guest-b');
  const a1 = (await env.startAttempt(ga, 'p1', 'guided')).id;
  const b1 = (await env.startAttempt(gb, 'p1', 'guided')).id;
  const oldA = ga.cookieHeader();
  const up = await ga.req(e.method, e.path, { body: { email: env.email('upgraded'), password: env.newPassword(), guestSessionId: gb.firstCookieValue(), guestUserId: gb.userId } });
  if (!ok2xx(up.status)) {
    // rejecting the foreign field is safe; then a plain upgrade must still work and keep the caller's data
    const plain = await ga.req(e.method, e.path, { body: { email: env.email('upgraded'), password: env.newPassword() } });
    if (!ok2xx(plain.status)) problems.push(`plain guest upgrade failed: ${plain.status} ${plain.text.slice(0, 120)}`);
  }
  const mine = await ga.req('GET', byId['ATT-02'].path);
  if (!mine.text.includes(a1)) problems.push("upgraded account lost the guest's own attempt");
  if (mine.text.includes(b1)) problems.push("upgraded account received another guest's attempt");
  const bAfter = await gb.req('GET', byId['ATT-02'].path);
  if (bAfter.status !== 200 || !bAfter.text.includes(b1)) problems.push(`guest-b lost its data or session (${bAfter.status})`);
  const replay = env.anonymous('replay-old-guest-a');
  for (const pair of oldA.split('; ')) { const i = pair.indexOf('='); replay.cookies.set(pair.slice(0, i), pair.slice(i + 1)); }
  const old = await replay.req('GET', byId['ATT-02'].path);
  if (old.status !== 401) problems.push(`old guest-a session still valid after upgrade (${old.status})`);
  assert.deepEqual(problems, []);
});
