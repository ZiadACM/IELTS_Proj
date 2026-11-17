// HTTP seam (spec, Testing Decisions, seam 1): Fastify inject() against the real app and a real database.
// Expected values come from docs/security/test-harness-contract.md and ticket 03.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { createTestApps, TEST_SUPPORT_TOKEN as TOKEN } from './test-app.ts';

const SUPPORT_ROUTES = [
  ['GET', '/__test__/health'],
  ['POST', '/__test__/users'],
  ['GET', '/__test__/users/some-user'],
  ['POST', '/__test__/items'],
  ['POST', '/__test__/clock'],
  ['POST', '/__test__/rate-limits/reset'],
  ['POST', '/__test__/invite-codes'],
  ['GET', '/__test__/password-resets/latest?email=a%40example.test'],
  ['POST', '/__test__/jobs/retention'],
] as const;

const apps = createTestApps();
const appWith = (testSupportToken: string | null) => apps.app(testSupportToken);

after(() => apps.close());

describe('page', () => {
  test('GET / serves the RTL frame with nosniff and a strict script policy', async () => {
    const app = await appWith(null);
    const res = await app.inject({ method: 'GET', url: '/' });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] as string, /^text\/html/);
    assert.match(res.body, /dir="rtl"/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');

    const csp = res.headers['content-security-policy'] as string;
    const scriptSrc = csp
      .split(';')
      .map((d) => d.trim().split(/\s+/))
      .find(([name]) => name === 'script-src');
    assert.ok(scriptSrc, `no script-src in ${csp}`);
    for (const forbidden of ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'data:']) {
      assert.ok(!scriptSrc.includes(forbidden), `script-src contains ${forbidden}`);
    }
  });
});

describe('API responses are JSON with nosniff', () => {
  test('ME-01 GET /me/settings without a session is 401', async () => {
    const app = await appWith(null);
    const res = await app.inject({ method: 'GET', url: '/me/settings' });
    assert.equal(res.statusCode, 401);
    assert.match(res.headers['content-type'] as string, /^application\/json/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.deepEqual(res.json(), { error: 'unauthenticated' });
  });

  test('an unknown path is a JSON 404', async () => {
    const app = await appWith(null);
    const res = await app.inject({ method: 'POST', url: '/no-such-endpoint' });
    assert.equal(res.statusCode, 404);
    assert.match(res.headers['content-type'] as string, /^application\/json/);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });
});

describe('test-support routes', () => {
  let app: FastifyInstance;
  let notFoundBody: string;
  before(async () => {
    app = await appWith(TOKEN);
    notFoundBody = (await app.inject({ method: 'GET', url: '/no-such-endpoint' })).body;
  });

  for (const [method, url] of SUPPORT_ROUTES) {
    test(`${method} ${url} is an ordinary 404 without the token or with a wrong one`, async () => {
      for (const headers of [{}, { 'x-test-support-token': 'wrong' }, { 'x-test-support-token': `${TOKEN}x` }]) {
        const res = await app.inject({ method, url, headers, payload: method === 'POST' ? {} : undefined });
        assert.equal(res.statusCode, 404);
        assert.equal(res.body, notFoundBody);
      }
    });
  }

  test('they are not mounted at all when no token is configured', async () => {
    const off = await appWith(null);
    for (const [method, url] of SUPPORT_ROUTES) {
      const res = await off.inject({ method, url, headers: { 'x-test-support-token': TOKEN } });
      assert.equal(res.statusCode, 404, `${method} ${url}`);
    }
  });

  const support = (method: 'GET' | 'POST', url: string, payload?: object) =>
    app.inject({ method, url, payload, headers: { 'x-test-support-token': TOKEN } });

  test('GET /__test__/health is 200 with the token', async () => {
    const res = await support('GET', '/__test__/health');
    assert.equal(res.statusCode, 200);
  });

  test('POST /__test__/clock moves the server clock forward', async () => {
    const before = Date.now();
    const res = await support('POST', '/__test__/clock', { advanceSeconds: 3600 });
    assert.equal(res.statusCode, 200);
    const now = Date.parse(res.json().now);
    assert.ok(now >= before + 3_600_000 && now < Date.now() + 3_600_000 + 1000, res.body);
  });

  test('POST /__test__/clock rejects a bad body as JSON 400', async () => {
    for (const payload of [{}, { advanceSeconds: -1 }, { advanceSeconds: 'soon' }, { advanceSeconds: 1, x: 1 }]) {
      const res = await support('POST', '/__test__/clock', payload);
      assert.equal(res.statusCode, 400, JSON.stringify(payload));
      assert.match(res.headers['content-type'] as string, /^application\/json/);
    }
  });

  test('POST /__test__/rate-limits/reset is 2xx', async () => {
    const res = await support('POST', '/__test__/rate-limits/reset');
    assert.ok(res.statusCode >= 200 && res.statusCode < 300);
  });

  test('POST /__test__/invite-codes returns a fresh code in the owner-script format', async () => {
    const res = await support('POST', '/__test__/invite-codes');
    assert.equal(res.statusCode, 201);
    assert.match(res.json().code, /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
  });

  test('POST /__test__/users creates a learner account that signs in through the real AUTH-02', async () => {
    const email = `support-${process.pid}-${Date.now()}@example.test`;
    const password = 'synthetic-password-9';
    const res = await support('POST', '/__test__/users', { role: 'learner', email, password });
    assert.equal(res.statusCode, 201, res.body);
    const { userId } = res.json();
    const signIn = await app.inject({ method: 'POST', url: '/auth/sessions', payload: { email, password } });
    assert.equal(signIn.statusCode, 200, signIn.body);
    assert.deepEqual(signIn.json(), { userId });
  });

  test('GET /__test__/password-resets/latest returns the newest reset token for an email, or 404', async () => {
    const email = `reset-${process.pid}-${Date.now()}@example.test`;
    await support('POST', '/__test__/users', { role: 'learner', email, password: 'synthetic-password-9' });
    const none = await support('GET', `/__test__/password-resets/latest?email=${encodeURIComponent(email)}`);
    assert.equal(none.statusCode, 404);
    await app.inject({ method: 'POST', url: '/auth/password-resets', payload: { email } });
    const res = await support('GET', `/__test__/password-resets/latest?email=${encodeURIComponent(email)}`);
    assert.equal(res.statusCode, 200, res.body);
    const { token } = res.json();
    const done = await app.inject({
      method: 'POST',
      url: '/auth/password-resets/complete',
      payload: { token, newPassword: 'synthetic-password-10' },
    });
    assert.equal(done.statusCode, 200, done.body);
  });

  test('routes for features not built yet answer 501, never a fake success', async () => {
    const notBuilt = [
      [
        'POST',
        '/__test__/users',
        { role: 'content_reviewer', email: 'staff@example.test', password: 'synthetic-password-9' },
      ],
      ['GET', '/__test__/users/some-user', undefined],
      ['POST', '/__test__/items', {}],
      ['POST', '/__test__/jobs/retention', {}],
    ] as const;
    for (const [method, url, payload] of notBuilt) {
      const res = await support(method, url, payload);
      assert.equal(res.statusCode, 501, `${method} ${url}`);
    }
  });
});
