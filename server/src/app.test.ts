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

  test('routes for features not built yet answer 501, never a fake success', async () => {
    for (const [method, url] of SUPPORT_ROUTES.filter(([, u]) => /users|items|jobs/.test(u))) {
      const res = await support(method, url, method === 'POST' ? {} : undefined);
      assert.equal(res.statusCode, 501, `${method} ${url}`);
    }
  });
});
