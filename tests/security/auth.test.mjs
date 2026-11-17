// SESS-02, SESS-04, SESS-05 (ticket 05: accounts), SESS-08 and SESS-09 (docs/security/test-plan.md, threat model T2,
// owner decisions D5 and D11). SESS-01, SESS-03 and SESS-06 are not written yet.
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
  // each try has a fresh valid invite code, so only the rate limit can refuse it
  for (let i = 0; i < PROBE; i++) statuses.push((await env.anonymous(`loop-${i}`).req(e.method, e.path, { body: await env.guestSessionBody() })).status);
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

liveTest('SESS-02: sign-in and password-reset requests answer the same for an existing and a non-existent email', async (t, env) => {
  const signIn = byId['AUTH-02'];
  const reset = byId['AUTH-04'];
  assert.ok(has(signIn, 'enumerationSensitive') && has(reset, 'enumerationSensitive'), 'AUTH-02 and AUTH-04 must be flagged enumerationSensitive');
  const problems = [];
  const learner = await env.user('learner', 'sess02-learner');
  await env.supportOk('POST', '/rate-limits/reset');
  const wrongPassword = await env.anonymous('sess02-a').req(signIn.method, signIn.path, { body: { email: learner.email, password: env.newPassword() } });
  const unknownEmail = await env.anonymous('sess02-b').req(signIn.method, signIn.path, { body: { email: env.email('nobody'), password: env.newPassword() } });
  if (ok2xx(wrongPassword.status)) problems.push(`sign-in with a wrong password succeeded (${wrongPassword.status})`);
  if (wrongPassword.status !== unknownEmail.status || wrongPassword.text !== unknownEmail.text) {
    problems.push(`sign-in differs: wrong password ${wrongPassword.status} ${wrongPassword.text.slice(0, 80)} vs unknown email ${unknownEmail.status} ${unknownEmail.text.slice(0, 80)}`);
  }
  const known = await env.anonymous('sess02-c').req(reset.method, reset.path, { body: { email: learner.email } });
  const unknown = await env.anonymous('sess02-d').req(reset.method, reset.path, { body: { email: env.email('nobody') } });
  if (!ok2xx(known.status)) problems.push(`reset request for an existing account failed (${known.status})`);
  if (known.status !== unknown.status || known.text !== unknown.text) {
    problems.push(`reset request differs: existing ${known.status} ${known.text.slice(0, 80)} vs unknown ${unknown.status} ${unknown.text.slice(0, 80)}`);
  }
  assert.deepEqual(problems, []);
});

liveTest('SESS-04: after sign-out the old session cookie is refused (invalidated on the server)', async (t, env) => {
  const signOut = byId['AUTH-03'];
  const problems = [];
  const learner = await env.user('learner', 'sess04-learner');
  const old = learner.cookieHeader();
  const out = await learner.req(signOut.method, signOut.path);
  if (!ok2xx(out.status)) problems.push(`sign-out failed (${out.status})`);
  const replay = env.anonymous('sess04-replay');
  for (const pair of old.split('; ')) { const i = pair.indexOf('='); replay.cookies.set(pair.slice(0, i), pair.slice(i + 1)); }
  const r = await replay.req('GET', byId['ME-01'].path);
  if (r.status !== 401) problems.push(`old session still works after sign-out (${r.status})`);
  assert.deepEqual(problems, []);
});

liveTest('SESS-05: a password-reset token works once; reusing it is refused', async (t, env) => {
  const complete = byId['AUTH-06'];
  assert.ok(complete && complete.access.anonymous === 'allow', 'AUTH-06 must exist and allow anonymous callers');
  const problems = [];
  const learner = await env.user('learner', 'sess05-learner');
  await env.supportOk('POST', '/rate-limits/reset');
  const token = await env.resetToken(learner.email);
  const first = env.newPassword();
  const used = await env.anonymous('sess05-a').req(complete.method, complete.path, { body: { token, newPassword: first } });
  if (!ok2xx(used.status)) problems.push(`first use of the reset token failed (${used.status} ${used.text.slice(0, 120)})`);
  const second = env.newPassword();
  const reuse = await env.anonymous('sess05-b').req(complete.method, complete.path, { body: { token, newPassword: second } });
  if (ok2xx(reuse.status)) problems.push(`reset token accepted a second time (${reuse.status})`);
  const signIn = byId['AUTH-02'];
  const withFirst = await env.anonymous('sess05-c').req(signIn.method, signIn.path, { body: { email: learner.email, password: first } });
  if (!ok2xx(withFirst.status)) problems.push(`the password set by the reset does not sign in (${withFirst.status})`);
  const withSecond = await env.anonymous('sess05-d').req(signIn.method, signIn.path, { body: { email: learner.email, password: second } });
  if (ok2xx(withSecond.status)) problems.push('the password sent with the reused token signs in');
  assert.deepEqual(problems, []);
});
