// HTTP seam (spec, Testing Decisions, seam 1) for ticket 04: invite codes, guest sessions and settings.
// Expected values come from the ticket, the spec (Access, Settings, Security & Privacy) and the authorization matrix.
import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { createTestApps, TEST_SUPPORT_TOKEN } from '../test-app.ts';
import { createInviteCode, listInviteCodes, withdrawInviteCode } from './invite-codes.ts';

const apps = createTestApps();
after(() => apps.close());

let clientNumber = 0;
// A distinct client address per test, so one test's tries never count against another's limit.
const newClient = () => `198.51.100.${++clientNumber}`;

const newCode = async () => (await createInviteCode(apps.db)).code;

function redeem(app: FastifyInstance, payload: object, { client = newClient(), cookie = '' } = {}) {
  return app.inject({
    method: 'POST',
    url: '/auth/guest-sessions',
    payload,
    remoteAddress: client,
    headers: cookie ? { cookie } : {},
  });
}

const sessionCookie = (res: LightMyRequestResponse) => {
  const cookie = res.cookies.find((c) => c.name.endsWith('session_token'));
  assert.ok(cookie, `no session cookie in ${JSON.stringify(res.headers['set-cookie'])}`);
  return `${cookie.name}=${cookie.value}`;
};

async function startGuest(app: FastifyInstance) {
  const res = await redeem(app, { inviteCode: await newCode(), ageConfirmed: true });
  assert.equal(res.statusCode, 201, res.body);
  return { userId: res.json().userId as string, cookie: sessionCookie(res) };
}

const redemptionOf = async (code: string) => {
  const { rows } = await apps.db.query(
    `select redeemed_by, redeemed_at is not null as redeemed, adult_confirmed from invite_codes
      where code_hash = sha256(convert_to(replace($1, '-', ''), 'UTF8'))`,
    [code],
  );
  return rows[0];
};

describe('AUTH-05 POST /auth/guest-sessions', () => {
  test('a valid code with the 18+ confirmation starts a guest session; both are stored with the redemption', async () => {
    const app = await apps.app();
    const code = await newCode();
    const res = await redeem(app, { inviteCode: code, ageConfirmed: true });
    assert.equal(res.statusCode, 201, res.body);
    const { userId } = res.json();
    assert.equal(typeof userId, 'string');

    const cookie = res.cookies.find((c) => c.name.endsWith('session_token'));
    assert.ok(cookie?.httpOnly, 'session cookie must be HttpOnly');
    assert.equal(cookie?.sameSite, 'Lax');

    assert.deepEqual(await redemptionOf(code), { redeemed_by: userId, redeemed: true, adult_confirmed: true });
    const me = await app.inject({ method: 'GET', url: '/me/settings', headers: { cookie: sessionCookie(res) } });
    assert.equal(me.statusCode, 200);
  });

  test('codes are accepted in any case and with or without the dash or spaces', async () => {
    const app = await apps.app();
    const code = await newCode();
    const typed = ` ${code.toLowerCase().replace('-', ' ')} `;
    assert.equal((await redeem(app, { inviteCode: typed, ageConfirmed: true })).statusCode, 201);
  });

  test('without the 18+ confirmation no session starts and the code stays unused', async () => {
    const app = await apps.app();
    const code = await newCode();
    const refused = await redeem(app, { inviteCode: code, ageConfirmed: false });
    assert.equal(refused.statusCode, 400);
    assert.deepEqual(refused.json(), { error: 'age_confirmation_required' });
    assert.equal(refused.cookies.length, 0);
    assert.equal((await redemptionOf(code)).redeemed, false);

    assert.equal((await redeem(app, { inviteCode: code })).statusCode, 400, 'ageConfirmed is required');
    assert.equal((await redeem(app, { inviteCode: code, ageConfirmed: true })).statusCode, 201);
  });

  test('unknown, used, withdrawn and malformed codes all get the same "not valid" response', async () => {
    const app = await apps.app();
    const used = await newCode();
    await redeem(app, { inviteCode: used, ageConfirmed: true });
    const withdrawn = await createInviteCode(apps.db);
    assert.ok(await withdrawInviteCode(apps.db, withdrawn.id));

    const cases = { unknown: 'ZZZZZ-ZZZZZ', used, withdrawn: withdrawn.code, malformed: 'not a code' };
    for (const [name, inviteCode] of Object.entries(cases)) {
      const res = await redeem(app, { inviteCode, ageConfirmed: true });
      assert.equal(res.statusCode, 400, name);
      assert.equal(res.body, JSON.stringify({ error: 'invite_code_not_valid' }), name);
      assert.equal(res.cookies.length, 0, name);
    }
  });

  test('a code is single-tester even when two people redeem it at the same moment', async () => {
    const app = await apps.app();
    const code = await newCode();
    const results = await Promise.all([1, 2, 3].map(() => redeem(app, { inviteCode: code, ageConfirmed: true })));
    assert.deepEqual(results.map((r) => r.statusCode).sort(), [201, 400, 400]);
  });

  test('redemption is rate-limited per client, counting every try, and recovers after the window', async () => {
    const app = await apps.app();
    const client = newClient();
    const statuses = [];
    for (let i = 0; i < 10; i++)
      statuses.push((await redeem(app, { inviteCode: 'ZZZZZ-ZZZZZ', ageConfirmed: true }, { client })).statusCode);
    assert.deepEqual(new Set(statuses), new Set([400]));

    const limited = await redeem(app, { inviteCode: await newCode(), ageConfirmed: true }, { client });
    assert.equal(limited.statusCode, 429, 'even a valid code is refused once the limit is reached');
    assert.equal(
      (await redeem(app, { inviteCode: await newCode(), ageConfirmed: true })).statusCode,
      201,
      'other clients unaffected',
    );

    await app.inject({
      method: 'POST',
      url: '/__test__/clock',
      payload: { advanceSeconds: 15 * 60 },
      headers: { 'x-test-support-token': TEST_SUPPORT_TOKEN },
    });
    assert.equal((await redeem(app, { inviteCode: await newCode(), ageConfirmed: true }, { client })).statusCode, 201);
  });

  test('a caller who already has a session is refused (matrix: guest deny), whatever the body', async () => {
    const app = await apps.app();
    const { cookie } = await startGuest(app);
    const code = await newCode();
    for (const payload of [{}, { inviteCode: code, ageConfirmed: true }]) {
      assert.equal((await redeem(app, payload, { cookie })).statusCode, 403);
    }
    assert.equal((await redemptionOf(code)).redeemed, false);
  });

  test('unknown fields are rejected', async () => {
    const app = await apps.app();
    const res = await redeem(app, { inviteCode: await newCode(), ageConfirmed: true, role: 'admin' });
    assert.equal(res.statusCode, 400);
  });
});

describe('owner invite-code functions', () => {
  test('list shows each code as unused, redeemed or withdrawn; only unused codes can be withdrawn', async () => {
    const app = await apps.app();
    const [unused, redeemed, withdrawn] = [
      await createInviteCode(apps.db),
      await createInviteCode(apps.db),
      await createInviteCode(apps.db),
    ];
    await redeem(app, { inviteCode: redeemed.code, ageConfirmed: true });
    assert.ok(await withdrawInviteCode(apps.db, withdrawn.id));
    assert.equal(await withdrawInviteCode(apps.db, withdrawn.id), false, 'already withdrawn');
    assert.equal(await withdrawInviteCode(apps.db, redeemed.id), false, 'already redeemed');

    const status = new Map((await listInviteCodes(apps.db)).map((r) => [r.id, r.status]));
    assert.equal(status.get(unused.id), 'unused');
    assert.equal(status.get(redeemed.id), 'redeemed');
    assert.equal(status.get(withdrawn.id), 'withdrawn');
  });

  test('codes are random: no repeats across many', async () => {
    const codes = new Set();
    for (let i = 0; i < 200; i++) codes.add((await createInviteCode(apps.db)).code);
    assert.equal(codes.size, 200);
  });
});

describe('ME-01 and ME-02 /me/settings', () => {
  const get = (app: FastifyInstance, cookie: string) =>
    app.inject({ method: 'GET', url: '/me/settings', headers: { cookie } });
  const patch = (app: FastifyInstance, cookie: string, payload: object) =>
    app.inject({ method: 'PATCH', url: '/me/settings', headers: { cookie }, payload });

  test('a new guest has Arabic and no target band', async () => {
    const app = await apps.app();
    const { cookie } = await startGuest(app);
    assert.deepEqual((await get(app, cookie)).json(), { interfaceLanguage: 'ar', targetBand: null });
  });

  test('target band can be chosen, changed and cleared; language can be switched; each persists for later requests', async () => {
    const app = await apps.app();
    const { cookie } = await startGuest(app);

    assert.deepEqual((await patch(app, cookie, { targetBand: '6.5' })).json(), {
      interfaceLanguage: 'ar',
      targetBand: '6.5',
    });
    assert.deepEqual((await patch(app, cookie, { interfaceLanguage: 'en' })).json(), {
      interfaceLanguage: 'en',
      targetBand: '6.5',
    });
    assert.deepEqual((await get(app, cookie)).json(), { interfaceLanguage: 'en', targetBand: '6.5' });

    assert.deepEqual((await patch(app, cookie, { targetBand: '7.0+' })).json(), {
      interfaceLanguage: 'en',
      targetBand: '7.0+',
    });
    assert.deepEqual((await patch(app, cookie, { targetBand: null })).json(), {
      interfaceLanguage: 'en',
      targetBand: null,
    });
    assert.deepEqual((await get(app, cookie)).json(), { interfaceLanguage: 'en', targetBand: null });
  });

  test('values outside the lists, unknown fields and empty updates are rejected and change nothing', async () => {
    const app = await apps.app();
    const { cookie } = await startGuest(app);
    for (const payload of [
      { targetBand: '8.0' },
      { targetBand: 7 },
      { interfaceLanguage: 'fr' },
      { userId: 'x' },
      {},
    ]) {
      assert.equal((await patch(app, cookie, payload)).statusCode, 400, JSON.stringify(payload));
    }
    assert.deepEqual((await get(app, cookie)).json(), { interfaceLanguage: 'ar', targetBand: null });
  });

  test("one guest's change never touches another guest's settings", async () => {
    const app = await apps.app();
    const a = await startGuest(app);
    const b = await startGuest(app);
    await patch(app, a.cookie, { targetBand: '5.5', interfaceLanguage: 'en' });
    assert.deepEqual((await get(app, b.cookie)).json(), { interfaceLanguage: 'ar', targetBand: null });
  });

  test('without a session both are 401, even with a bad body', async () => {
    const app = await apps.app();
    assert.equal((await app.inject({ method: 'GET', url: '/me/settings' })).statusCode, 401);
    for (const payload of [{ targetBand: '6.0' }, { displayName: 'x' }]) {
      const res = await app.inject({ method: 'PATCH', url: '/me/settings', payload });
      assert.equal(res.statusCode, 401, JSON.stringify(payload));
    }
    const forged = await get(app, 'better-auth.session_token=forged.value');
    assert.equal(forged.statusCode, 401);
  });
});
