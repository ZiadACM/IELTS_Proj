// /__test__/* routes for the live security suites (docs/security/test-harness-contract.md).
// Registered only when SECURITY_TEST_SUPPORT_TOKEN is set, which config.ts refuses in production (SECRET-04).
// A request without the right x-test-support-token header gets the app's normal 404.
import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { createInviteCode } from '../access/invite-codes.ts';
import type { RateLimit } from '../access/rate-limit.ts';
import type { Clock } from '../clock.ts';

type Options = { token: string; db: Pool; clock: Clock; rateLimits: RateLimit[] };

const digest = (value: string) => createHash('sha256').update(value).digest();

export async function testSupportRoutes(fastify: FastifyInstance, { token, db, clock, rateLimits }: Options) {
  const expected = digest(token);
  fastify.addHook('onRequest', async (request, reply) => {
    const given = request.headers['x-test-support-token'];
    if (typeof given !== 'string' || !timingSafeEqual(digest(given), expected)) return reply.callNotFound();
  });

  fastify.get('/__test__/health', async () => {
    await db.query('select 1');
    return { status: 'ok' };
  });

  fastify.post<{ Body: { advanceSeconds: number } }>(
    '/__test__/clock',
    {
      schema: {
        body: {
          type: 'object',
          required: ['advanceSeconds'],
          additionalProperties: false,
          properties: { advanceSeconds: { type: 'number', minimum: 0 } },
        },
      },
    },
    async (request) => ({ now: clock.advance(request.body.advanceSeconds).toISOString() }),
  );

  fastify.post('/__test__/rate-limits/reset', async () => {
    for (const limit of rateLimits) limit.reset();
    return { reset: true };
  });

  // A fresh, unused invite code, so the suites can start guest sessions through the real AUTH-05.
  fastify.post('/__test__/invite-codes', async (_request, reply) => {
    const { code } = await createInviteCode(db);
    return reply.code(201).send({ code });
  });

  // shortcut: users, items and retention do not exist yet; each route is built in the named ticket. 501 makes the
  // suites fail loudly instead of passing on a fake.
  const notBuilt = (ticket: string) => async (_request: FastifyRequest, reply: FastifyReply) =>
    reply.code(501).send({ error: 'not_implemented', ticket });
  fastify.post('/__test__/users', notBuilt('05-accounts'));
  fastify.get('/__test__/users/:userId', notBuilt('05-accounts'));
  fastify.post('/__test__/items', notBuilt('06-staff-import-publish'));
  fastify.post('/__test__/jobs/retention', notBuilt('17-data-rights-retention'));
}
