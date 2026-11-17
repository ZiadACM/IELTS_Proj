// HTTP seam (spec, Testing Decisions, seam 1) for ticket 05: account creation and guest upgrade, sign-in, sign-out
// and password reset. Expected values come from the ticket, the spec (Access, Security & Privacy), the authorization
// matrix (AUTH-01..AUTH-06) and the security test plan (SESS-01, SESS-02, SESS-04, SESS-05, SESS-09).
import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { createTestApps } from '../test-app.ts';
import { createInviteCode } from './invite-codes.ts';
import { pendingResetLinks } from './password-reset-outbox.ts';

const apps = createTestApps();
after(() => apps.close());

let clientNumber = 0;
// A distinct client address per call site, so one test's tries never count against another's limit.
const newClient = () => `203.0.113.${++clientNumber}`;
let emailNumber = 0;
const newEmail = () => `tester-${process.pid}-${Date.now()}-${++emailNumber}@example.test`;
const PASSWORD = 'synthetic-password-1';

const newCode = async () => (await createInviteCode(apps.db)).code;

type Call = { cookie?: string; client?: string };
function call(
  app: FastifyInstance,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload?: object,
  opts: Call = {},
) {
  return app.inject({
    method,
    url,
    payload,
    remoteAddress: opts.client ?? newClient(),
    headers: opts.cookie ? { cookie: opts.cookie } : {},
  });
}

const sessionCookie = (res: LightMyRequestResponse) => {
  const cookie = res.cookies.find((c) => c.name.endsWith('session_token') && c.value);
  assert.ok(cookie, `no session cookie in ${JSON.stringify(res.headers['set-cookie'])}`);
  return `${cookie.name}=${cookie.value}`;
};

async function startGuest(app: FastifyInstance) {
  const res = await call(app, 'POST', '/auth/guest-sessions', { inviteCode: await newCode(), ageConfirmed: true });
  assert.equal(res.statusCode, 201, res.body);
  return { userId: res.json().userId as string, cookie: sessionCookie(res) };
}

async function signUp(app: FastifyInstance, email = newEmail(), password = PASSWORD) {
  const res = await call(app, 'POST', '/accounts', {
    email,
    password,
    inviteCode: await newCode(),
    ageConfirmed: true,
  });
  assert.equal(res.statusCode, 201, res.body);
  return { userId: res.json().userId as string, cookie: sessionCookie(res), email, password };
}

const settingsWith = (app: FastifyInstance, cookie: string) => call(app, 'GET', '/me/settings', undefined, { cookie });

describe('AUTH-01 POST /accounts without a guest session', () => {
  test('a valid invite code with the 18+ confirmation creates an account and signs it in', async () => {
    const app = await apps.app();
    const code = await newCode();
    const res = await call(app, 'POST', '/accounts', {
      email: newEmail(),
      password: PASSWORD,
      inviteCode: code,
      ageConfirmed: true,
    });
    assert.equal(res.statusCode, 201, res.body);
    const { userId } = res.json();
    assert.equal(typeof userId, 'string');
    const cookie = res.cookies.find((c) => c.name.endsWith('session_token'));
    assert.ok(cookie?.httpOnly, 'session cookie must be HttpOnly');
    assert.equal(cookie?.sameSite, 'Lax');

    const me = await settingsWith(app, sessionCookie(res));
    assert.equal(me.statusCode, 200);
    assert.deepEqual(me.json(), { interfaceLanguage: 'ar', targetBand: null });
    const { rows } = await apps.db.query(
      'select redeemed_by, adult_confirmed from invite_codes where redeemed_by = $1',
      [userId],
    );
    assert.deepEqual(rows, [{ redeemed_by: userId, adult_confirmed: true }]);
  });

  test('without a code, or with an unknown or malformed code, the answer is the same "not valid" and nothing is created', async () => {
    const app = await apps.app();
    const email = newEmail();
    for (const extra of [
      {},
      { inviteCode: 'ZZZZZ-ZZZZZ', ageConfirmed: true },
      { inviteCode: '<x>', ageConfirmed: true },
    ]) {
      const res = await call(app, 'POST', '/accounts', { email, password: PASSWORD, ...extra });
      assert.equal(res.statusCode, 400, res.body);
      assert.deepEqual(res.json(), { error: 'invite_code_not_valid' });
      assert.equal(res.cookies.length, 0);
    }
    const { rowCount } = await apps.db.query('select 1 from "user" where email = $1', [email]);
    assert.equal(rowCount, 0);
  });

  test('without the 18+ confirmation the code stays unused', async () => {
    const app = await apps.app();
    const code = await newCode();
    const refused = await call(app, 'POST', '/accounts', {
      email: newEmail(),
      password: PASSWORD,
      inviteCode: code,
      ageConfirmed: false,
    });
    assert.equal(refused.statusCode, 400);
    assert.deepEqual(refused.json(), { error: 'age_confirmation_required' });
    const res = await call(app, 'POST', '/accounts', {
      email: newEmail(),
      password: PASSWORD,
      inviteCode: code,
      ageConfirmed: true,
    });
    assert.equal(res.statusCode, 201, res.body);
  });

  test('an email that already has an account is refused and the code stays unused', async () => {
    const app = await apps.app();
    const { email } = await signUp(app);
    const code = await newCode();
    const res = await call(app, 'POST', '/accounts', {
      email,
      password: PASSWORD,
      inviteCode: code,
      ageConfirmed: true,
    });
    assert.equal(res.statusCode, 409, res.body);
    assert.deepEqual(res.json(), { error: 'email_taken' });
    assert.equal(res.cookies.length, 0);
    const reuse = await call(app, 'POST', '/accounts', {
      email: newEmail(),
      password: PASSWORD,
      inviteCode: code,
      ageConfirmed: true,
    });
    assert.equal(reuse.statusCode, 201, reuse.body);
  });

  test('a short password, a bad email and unknown fields are rejected', async () => {
    const app = await apps.app();
    const base = { email: newEmail(), password: PASSWORD, inviteCode: await newCode(), ageConfirmed: true };
    for (const body of [
      { ...base, password: 'short' },
      { ...base, email: 'not-an-email' },
      { ...base, role: 'admin' },
    ]) {
      const res = await call(app, 'POST', '/accounts', body);
      assert.equal(res.statusCode, 400, JSON.stringify(body));
    }
  });

  test('the password minimum is 12 characters (owner decision 2026-11-17, matches the security fixture)', async () => {
    const app = await apps.app();
    const base = { inviteCode: await newCode(), ageConfirmed: true };
    const eleven = await call(app, 'POST', '/accounts', { ...base, email: newEmail(), password: 'abcdefghijk' });
    assert.equal(eleven.statusCode, 400, eleven.body);
    const twelve = await call(app, 'POST', '/accounts', { ...base, email: newEmail(), password: 'abcdefghijkl' });
    assert.equal(twelve.statusCode, 201, twelve.body);
  });

  test('an account holder who is signed in is refused (matrix: learner deny)', async () => {
    const app = await apps.app();
    const { cookie } = await signUp(app);
    const res = await call(
      app,
      'POST',
      '/accounts',
      { email: newEmail(), password: PASSWORD, inviteCode: await newCode(), ageConfirmed: true },
      { cookie },
    );
    assert.equal(res.statusCode, 403);
  });

  test('account creation is rate-limited per client together with guest sessions', async () => {
    const app = await apps.app();
    const client = newClient();
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      statuses.push(
        (await call(app, 'POST', '/accounts', { email: newEmail(), password: PASSWORD }, { client })).statusCode,
      );
    }
    assert.deepEqual(statuses, [...Array(10).fill(400), 429]);
  });
});

describe('AUTH-01 POST /accounts with a guest session (upgrade, D5, SESS-09)', () => {
  test('the guest keeps its own user and data, gets a new session, and the old guest session stops working', async () => {
    const app = await apps.app();
    const guest = await startGuest(app);
    const other = await startGuest(app);
    assert.equal(
      (await call(app, 'PATCH', '/me/settings', { targetBand: '6.5' }, { cookie: guest.cookie })).statusCode,
      200,
    );
    assert.equal(
      (await call(app, 'PATCH', '/me/settings', { targetBand: '5.5' }, { cookie: other.cookie })).statusCode,
      200,
    );

    const res = await call(
      app,
      'POST',
      '/accounts',
      { email: newEmail(), password: PASSWORD },
      { cookie: guest.cookie },
    );
    assert.equal(res.statusCode, 201, res.body);
    assert.deepEqual(res.json(), { userId: guest.userId });
    const upgraded = sessionCookie(res);
    assert.notEqual(upgraded, guest.cookie);

    const mine = await settingsWith(app, upgraded);
    assert.deepEqual(mine.json(), { interfaceLanguage: 'ar', targetBand: '6.5' });
    assert.equal((await settingsWith(app, guest.cookie)).statusCode, 401, 'old guest session must be invalidated');
    assert.deepEqual((await settingsWith(app, other.cookie)).json(), { interfaceLanguage: 'ar', targetBand: '5.5' });
  });

  test("another guest's id in the body is rejected, and a plain upgrade moves only the caller", async () => {
    const app = await apps.app();
    const guest = await startGuest(app);
    const other = await startGuest(app);
    const foreign = await call(
      app,
      'POST',
      '/accounts',
      { email: newEmail(), password: PASSWORD, guestUserId: other.userId },
      { cookie: guest.cookie },
    );
    assert.equal(foreign.statusCode, 400);
    const res = await call(
      app,
      'POST',
      '/accounts',
      { email: newEmail(), password: PASSWORD },
      { cookie: guest.cookie },
    );
    assert.deepEqual(res.json(), { userId: guest.userId });
    assert.equal((await settingsWith(app, other.cookie)).statusCode, 200, 'the other guest keeps its session');
  });

  test('an upgrade needs no invite code, and an email already taken leaves the guest as it was', async () => {
    const app = await apps.app();
    const { email } = await signUp(app);
    const guest = await startGuest(app);
    const taken = await call(app, 'POST', '/accounts', { email, password: PASSWORD }, { cookie: guest.cookie });
    assert.equal(taken.statusCode, 409, taken.body);
    assert.deepEqual(taken.json(), { error: 'email_taken' });
    assert.equal((await settingsWith(app, guest.cookie)).statusCode, 200, 'guest session still works');
    const { rows } = await apps.db.query('select "isAnonymous" from "user" where id = $1', [guest.userId]);
    assert.deepEqual(rows, [{ isAnonymous: true }]);
  });
});

const signIn = (app: FastifyInstance, body: object, opts: Call = {}) => call(app, 'POST', '/auth/sessions', body, opts);

describe('AUTH-02 POST /auth/sessions (sign in)', () => {
  test('the right email and password sign in to the same user, with a new session', async () => {
    const app = await apps.app();
    const account = await signUp(app);
    const res = await signIn(app, { email: account.email.toUpperCase(), password: account.password });
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(res.json(), { userId: account.userId });
    const cookie = sessionCookie(res);
    assert.notEqual(cookie, account.cookie);
    assert.equal((await settingsWith(app, cookie)).statusCode, 200);
  });

  test('an upgraded guest signs in with the email and password it chose', async () => {
    const app = await apps.app();
    const guest = await startGuest(app);
    const email = newEmail();
    await call(app, 'POST', '/accounts', { email, password: PASSWORD }, { cookie: guest.cookie });
    const res = await signIn(app, { email, password: PASSWORD });
    assert.deepEqual(res.json(), { userId: guest.userId });
  });

  test('a wrong password and an unknown email get the same status and body (SESS-02)', async () => {
    const app = await apps.app();
    const account = await signUp(app);
    const wrong = await signIn(app, { email: account.email, password: 'wrong-password-1' });
    const unknown = await signIn(app, { email: newEmail(), password: 'wrong-password-1' });
    assert.equal(wrong.statusCode, 401);
    assert.equal(unknown.statusCode, 401);
    assert.deepEqual(wrong.json(), { error: 'invalid_credentials' });
    assert.deepEqual(unknown.json(), wrong.json());
    assert.equal(wrong.cookies.length + unknown.cookies.length, 0);
  });

  test('failed sign-ins are limited per client and per email; while throttled the right password is refused too (SESS-01)', async () => {
    const app = await apps.app();
    const account = await signUp(app);
    const client = newClient();
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await signIn(app, { email: newEmail(), password: 'wrong-password-1' }, { client })).statusCode);
    }
    assert.deepEqual(statuses, [...Array(10).fill(401), 429]);
    const right = await signIn(app, { email: account.email, password: account.password }, { client });
    assert.equal(right.statusCode, 429);

    // rotating clients against one email
    const byEmail = [];
    for (let i = 0; i < 11; i++)
      byEmail.push((await signIn(app, { email: account.email, password: 'wrong-password-1' })).statusCode);
    assert.deepEqual(byEmail, [...Array(10).fill(401), 429]);
    assert.equal((await signIn(app, { email: account.email, password: account.password })).statusCode, 429);
  });

  test('successful sign-ins do not count against the limit', async () => {
    const app = await apps.app();
    const account = await signUp(app);
    const client = newClient();
    for (let i = 0; i < 12; i++) {
      const res = await signIn(app, { email: account.email, password: account.password }, { client });
      assert.equal(res.statusCode, 200);
    }
  });

  test('a bad body is rejected', async () => {
    const app = await apps.app();
    for (const body of [{}, { email: newEmail() }, { email: newEmail(), password: PASSWORD, remember: true }]) {
      assert.equal((await signIn(app, body)).statusCode, 400, JSON.stringify(body));
    }
  });
});

describe('AUTH-03 DELETE /auth/sessions/current (sign out)', () => {
  test('signing out ends the session on the server; the old cookie is refused afterwards (SESS-04)', async () => {
    const app = await apps.app();
    const { cookie } = await signUp(app);
    const res = await call(app, 'DELETE', '/auth/sessions/current', undefined, { cookie });
    assert.equal(res.statusCode, 200, res.body);
    assert.ok(
      res.cookies.some((c) => c.name.endsWith('session_token') && (c.value === '' || c.maxAge === 0)),
      'the session cookie must be cleared',
    );
    assert.equal((await settingsWith(app, cookie)).statusCode, 401);
  });

  test('a guest can sign out too; without a session it is 401', async () => {
    const app = await apps.app();
    const guest = await startGuest(app);
    assert.equal(
      (await call(app, 'DELETE', '/auth/sessions/current', undefined, { cookie: guest.cookie })).statusCode,
      200,
    );
    assert.equal((await settingsWith(app, guest.cookie)).statusCode, 401);
    assert.equal((await call(app, 'DELETE', '/auth/sessions/current')).statusCode, 401);
  });
});

const requestReset = (app: FastifyInstance, email: string, opts: Call = {}) =>
  call(app, 'POST', '/auth/password-resets', { email }, opts);
const completeReset = (app: FastifyInstance, body: object, opts: Call = {}) =>
  call(app, 'POST', '/auth/password-resets/complete', body, opts);

async function resetLinks(email: string): Promise<string[]> {
  const { rows } = await apps.db.query<{ link: string }>(
    'select link from password_reset_outbox where email = $1 order by created_at',
    [email.toLowerCase()],
  );
  return rows.map((r) => r.link);
}
const tokenOf = (link: string) => decodeURIComponent(new URL(link).hash.replace(/^#reset-password=/, ''));

describe('AUTH-04 POST /auth/password-resets (request a reset link)', () => {
  test('a known and an unknown email get the same answer; only the known one gets a link in the outbox (SESS-02)', async () => {
    const app = await apps.app();
    const account = await signUp(app);
    const unknownEmail = newEmail();
    const known = await requestReset(app, account.email);
    const unknown = await requestReset(app, unknownEmail);
    assert.equal(known.statusCode, 202, known.body);
    assert.equal(unknown.statusCode, 202);
    assert.deepEqual(known.json(), { accepted: true });
    assert.deepEqual(unknown.json(), known.json());

    const links = await resetLinks(account.email);
    assert.equal(links.length, 1);
    assert.match(links[0], /^http:\/\/localhost:3000\/#reset-password=[^&?]+$/, 'token only in the fragment (SESS-06)');
    assert.deepEqual(await resetLinks(unknownEmail), []);
  });

  test('a guest is refused (matrix: guest deny); a signed-in account holder may ask', async () => {
    const app = await apps.app();
    const guest = await startGuest(app);
    assert.equal((await requestReset(app, newEmail(), { cookie: guest.cookie })).statusCode, 403);
    const account = await signUp(app);
    assert.equal((await requestReset(app, account.email, { cookie: account.cookie })).statusCode, 202);
  });

  test('requests are rate-limited per client', async () => {
    const app = await apps.app();
    const client = newClient();
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await requestReset(app, newEmail(), { client })).statusCode);
    assert.deepEqual(statuses, [...Array(10).fill(202), 429]);
  });
});

describe('AUTH-06 POST /auth/password-resets/complete (set a new password)', () => {
  test('the link token sets a new password, ends every session, and works only once (SESS-05)', async () => {
    const app = await apps.app();
    const account = await signUp(app);
    await requestReset(app, account.email);
    const [link] = await resetLinks(account.email);
    const token = tokenOf(link);
    const newPassword = 'a-brand-new-password-2';

    const res = await completeReset(app, { token, newPassword });
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(res.json(), { passwordReset: true });
    assert.equal((await settingsWith(app, account.cookie)).statusCode, 401, 'old sessions end after a reset');
    assert.equal((await signIn(app, { email: account.email, password: account.password })).statusCode, 401);
    assert.equal((await signIn(app, { email: account.email, password: newPassword })).statusCode, 200);

    const reuse = await completeReset(app, { token, newPassword: 'yet-another-password-3' });
    assert.equal(reuse.statusCode, 400);
    assert.deepEqual(reuse.json(), { error: 'reset_token_not_valid' });
  });

  test('an unknown token gets the same answer as a used one; a short password is rejected', async () => {
    const app = await apps.app();
    const unknown = await completeReset(app, { token: 'not-a-real-token', newPassword: 'whatever-password-4' });
    assert.equal(unknown.statusCode, 400);
    assert.deepEqual(unknown.json(), { error: 'reset_token_not_valid' });
    assert.equal((await completeReset(app, { token: 'x', newPassword: 'short' })).statusCode, 400);
    assert.equal(
      (await completeReset(app, { token: 'x', newPassword: 'whatever-password-4', userId: 'u' })).statusCode,
      400,
    );
  });

  test('a caller with a session is refused (matrix: deny for every signed-in role)', async () => {
    const app = await apps.app();
    const account = await signUp(app);
    const res = await completeReset(
      app,
      { token: 'x', newPassword: 'whatever-password-4' },
      { cookie: account.cookie },
    );
    assert.equal(res.statusCode, 403);
  });

  test('tries are rate-limited per client, so tokens cannot be guessed in bulk', async () => {
    const app = await apps.app();
    const client = newClient();
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      statuses.push(
        (await completeReset(app, { token: `guess-${i}`, newPassword: 'whatever-password-4' }, { client })).statusCode,
      );
    }
    assert.deepEqual(statuses, [...Array(10).fill(400), 429]);
  });
});

describe('owner reset-links function', () => {
  test('lists links that still work and deletes expired ones', async () => {
    const app = await apps.app();
    const account = await signUp(app);
    await requestReset(app, account.email);
    const stale = newEmail();
    await apps.db.query(
      `insert into password_reset_outbox (email, link, expires_at) values ($1, 'http://x/#reset-password=old', now() - interval '1 second')`,
      [stale],
    );
    const pending = await pendingResetLinks(apps.db);
    assert.ok(pending.some((p) => p.email === account.email.toLowerCase()));
    assert.ok(!pending.some((p) => p.email === stale));
    assert.deepEqual(await resetLinks(stale), [], 'expired row deleted');
  });
});

describe('review fixes', () => {
  test("a completed reset removes that account's links from the outbox; queuing a link clears expired ones", async () => {
    const app = await apps.app();
    const account = await signUp(app);
    const stale = newEmail();
    await apps.db.query(
      `insert into password_reset_outbox (email, link, expires_at) values ($1, 'http://x/#reset-password=old', now() - interval '1 second')`,
      [stale],
    );
    await requestReset(app, account.email);
    assert.deepEqual(await resetLinks(stale), [], 'expired row cleared when a new link is queued');
    const [link] = await resetLinks(account.email);
    await completeReset(app, { token: tokenOf(link), newPassword: 'a-brand-new-password-2' });
    assert.deepEqual(await resetLinks(account.email), [], 'used link removed');
  });

  test('a guest who signs in to an account loses its guest session on the server too', async () => {
    const app = await apps.app();
    const account = await signUp(app);
    const guest = await startGuest(app);
    const res = await signIn(app, { email: account.email, password: account.password }, { cookie: guest.cookie });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal((await settingsWith(app, guest.cookie)).statusCode, 401);
  });
});
