// Unit tests for tests/security/adapters/discover-endpoints.mjs (feeds the AUTHZ-02 coverage gate).
// Synthetic sources only. The adapter must find literal routes and FAIL CLOSED on anything it cannot read.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { discoverInSource, discoverEndpoints } from './adapters/discover-endpoints.mjs';
import { findUnlisted, loadMatrix } from './lib/matrix.mjs';

const keys = (found) => found.map((e) => `${e.method} ${e.path}`);

test('finds shorthand and route() registrations in Fastify style', () => {
  const src = `
    export default async function routes(fastify) {
      fastify.get('/items', handler);
      fastify.get<{ Params: P }>("/items/:itemId", { schema }, handler);
      app.put(\`/attempts/:attemptId/answers\`, opts, handler);
      fastify.route({ method: ['POST'], url: '/attempts/:attemptId/submit', handler });
      instance.route({ url: '/me/settings', method: 'PATCH', schema, handler });
      cache.get('key'); headers.get('x'); // not routes
      // fastify.get('/commented-out', h);
    }`;
  assert.deepEqual(keys(discoverInSource(src)), [
    'GET /items', 'GET /items/:itemId', 'PUT /attempts/:attemptId/answers', 'POST /attempts/:attemptId/submit', 'PATCH /me/settings',
  ]);
});

for (const [name, src] of [
  ['non-literal path', 'fastify.get(routePath, h)'],
  ['template path with a variable', 'fastify.post(`/x/${id}`, h)'],
  ['route() without a literal url', 'fastify.route({ method: "GET", url: base + "/x", handler })'],
  ['route() without a method', 'fastify.route({ url: "/x", handler })'],
  ['register with a prefix', 'fastify.register(plugin, { prefix: "/v1" })'],
]) {
  test(`fails closed: ${name}`, () => assert.throws(() => discoverInSource(src, 'synthetic.ts'), /discover-endpoints: synthetic\.ts:1/));
}

test('scans server/, skips tests and test-support, and the gate reports an unlisted route', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'discover-'));
  try {
    fs.mkdirSync(path.join(root, 'server', 'src', 'test-support'), { recursive: true });
    fs.writeFileSync(path.join(root, 'server', 'src', 'routes.ts'), "fastify.get('/items/:itemId', h);\nfastify.get('/debug/vars', h);\n");
    fs.writeFileSync(path.join(root, 'server', 'src', 'routes.test.ts'), "fastify.get('/only-in-a-test', h);\n");
    fs.writeFileSync(path.join(root, 'server', 'src', 'test-support', 'routes.ts'), "fastify.post('/__test__/clock', h);\n");
    const found = await discoverEndpoints({ root });
    assert.deepEqual(keys(found), ['GET /items/:itemId', 'GET /debug/vars']);
    assert.deepEqual(findUnlisted(found, loadMatrix()), ['GET /debug/vars']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('returns nothing when there is no server/ directory (the gate then reports NOT VERIFIED)', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'discover-empty-'));
  try { assert.deepEqual(await discoverEndpoints({ root }), []); } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
