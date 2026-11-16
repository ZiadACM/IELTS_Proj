import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from './config.ts';

const DATABASE_URL = 'postgres://synthetic@127.0.0.1:5432/synthetic';
const TOKEN = 'synthetic-test-support-token-0123456789';

test('defaults: local host, port 3000, test support off', () => {
  assert.deepEqual(loadConfig({ DATABASE_URL }), {
    databaseUrl: DATABASE_URL,
    host: '127.0.0.1',
    port: 3000,
    production: false,
    testSupportToken: null,
  });
});

test('missing DATABASE_URL stops the app', () => {
  assert.throws(() => loadConfig({}), /DATABASE_URL/);
});

test('an invalid PORT stops the app', () => {
  for (const PORT of ['0', '70000', 'abc', '30.5']) assert.throws(() => loadConfig({ DATABASE_URL, PORT }), /PORT/);
});

test('SECRET-04: production with a test-support token refuses to start', () => {
  assert.throws(
    () => loadConfig({ DATABASE_URL, NODE_ENV: 'production', SECURITY_TEST_SUPPORT_TOKEN: TOKEN }),
    /refusing to start/,
  );
});

test('production without a token starts with test support off', () => {
  const config = loadConfig({ DATABASE_URL, NODE_ENV: 'production' });
  assert.equal(config.production, true);
  assert.equal(config.testSupportToken, null);
});

test('a short test-support token is refused', () => {
  assert.throws(() => loadConfig({ DATABASE_URL, SECURITY_TEST_SUPPORT_TOKEN: 'short' }), /at least 32/);
});
