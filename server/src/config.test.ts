import assert from 'node:assert/strict';
import test from 'node:test';
import { DEV_AUTH_SECRET, loadConfig } from './config.ts';

const DATABASE_URL = 'postgres://synthetic@127.0.0.1:5432/synthetic';
const TOKEN = 'synthetic-test-support-token-0123456789';
const AUTH_SECRET = 'synthetic-auth-secret-0123456789abcdef';
const PUBLIC_ORIGIN = 'https://masar.example';

test('defaults: local host, port 3000, test support off', () => {
  assert.deepEqual(loadConfig({ DATABASE_URL, AUTH_SECRET }), {
    databaseUrl: DATABASE_URL,
    host: '127.0.0.1',
    port: 3000,
    production: false,
    testSupportToken: null,
    authSecret: AUTH_SECRET,
    publicOrigin: 'http://localhost:3000',
  });
});

test('missing DATABASE_URL stops the app', () => {
  assert.throws(() => loadConfig({ AUTH_SECRET }), /DATABASE_URL/);
});

test('an invalid PORT stops the app', () => {
  for (const PORT of ['0', '70000', 'abc', '30.5'])
    assert.throws(() => loadConfig({ DATABASE_URL, AUTH_SECRET, PORT }), /PORT/);
});

test('SECRET-04: production with a test-support token refuses to start', () => {
  assert.throws(
    () =>
      loadConfig({
        DATABASE_URL,
        AUTH_SECRET,
        PUBLIC_ORIGIN,
        NODE_ENV: 'production',
        SECURITY_TEST_SUPPORT_TOKEN: TOKEN,
      }),
    /refusing to start/,
  );
});

test('production without a token starts with test support off', () => {
  const config = loadConfig({ DATABASE_URL, AUTH_SECRET, PUBLIC_ORIGIN, NODE_ENV: 'production' });
  assert.equal(config.production, true);
  assert.equal(config.testSupportToken, null);
});

test('a short test-support token is refused', () => {
  assert.throws(() => loadConfig({ DATABASE_URL, AUTH_SECRET, SECURITY_TEST_SUPPORT_TOKEN: 'short' }), /at least 32/);
});

test('a missing or short AUTH_SECRET stops the app', () => {
  assert.throws(() => loadConfig({ DATABASE_URL }), /AUTH_SECRET is not set/);
  assert.throws(() => loadConfig({ DATABASE_URL, AUTH_SECRET: 'short' }), /at least 32/);
});

test('production refuses the development AUTH_SECRET and needs PUBLIC_ORIGIN', () => {
  assert.throws(
    () => loadConfig({ DATABASE_URL, AUTH_SECRET: DEV_AUTH_SECRET, PUBLIC_ORIGIN, NODE_ENV: 'production' }),
    /development value/,
  );
  assert.throws(() => loadConfig({ DATABASE_URL, AUTH_SECRET, NODE_ENV: 'production' }), /PUBLIC_ORIGIN/);
});
