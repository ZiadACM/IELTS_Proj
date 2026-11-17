// /__test__/* routes for the live security suites (docs/security/test-harness-contract.md).
// Registered only when SECURITY_TEST_SUPPORT_TOKEN is set, which config.ts refuses in production (SECRET-04).
// A request without the right x-test-support-token header gets the app's normal 404.
import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { Auth } from '../access/auth.ts';
import { createInviteCode } from '../access/invite-codes.ts';
import type { RateLimit } from '../access/rate-limit.ts';
import type { Clock } from '../clock.ts';

type Options = { token: string; auth: Auth; db: Pool; clock: Clock; rateLimits: RateLimit[] };
type NewUser = { role: 'learner' | 'content_author' | 'content_reviewer' | 'admin'; email: string; password: string };

const digest = (value: string) => createHash('sha256').update(value).digest();

export async function testSupportRoutes(fastify: FastifyInstance, { token, auth, db, clock, rateLimits }: Options) {
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

  // shortcut: staff roles, items and retention do not exist yet; each is built in the named ticket. 501 makes the
  // suites fail loudly instead of passing on a fake.
  const notBuilt = (ticket: string) => async (_request: FastifyRequest, reply: FastifyReply) =>
    reply.code(501).send({ error: 'not_implemented', ticket });

  // An account with a known password, so the suites sign in through the real AUTH-02. Learners only until ticket 06.
  fastify.post<{ Body: NewUser }>(
    '/__test__/users',
    {
      schema: {
        body: {
          type: 'object',
          required: ['role', 'email', 'password'],
          additionalProperties: false,
          properties: {
            role: { type: 'string', enum: ['learner', 'content_author', 'content_reviewer', 'admin'] },
            email: { type: 'string', maxLength: 254 },
            password: { type: 'string', maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const { role, email, password } = request.body;
      if (role !== 'learner') return notBuilt('06-staff-import-publish')(request, reply);
      const { user } = await auth.api.signUpEmail({ body: { email, password, name: '' }, headers: new Headers() });
      await db.query('insert into learner_settings (user_id) values ($1)', [user.id]);
      return reply.code(201).send({ userId: user.id });
    },
  );
  fastify.get('/__test__/users/:userId', notBuilt('17-data-rights-retention'));

  // The token of the newest reset link for an email: the suites cannot read the owner's outbox by hand.
  fastify.get<{ Querystring: { email: string } }>(
    '/__test__/password-resets/latest',
    {
      schema: {
        querystring: { type: 'object', required: ['email'], properties: { email: { type: 'string', maxLength: 254 } } },
      },
    },
    async (request, reply) => {
      const { rows } = await db.query<{ link: string }>(
        'select link from password_reset_outbox where email = $1 order by created_at desc limit 1',
        [request.query.email.toLowerCase()],
      );
      if (!rows[0]) return reply.code(404).send({ error: 'not_found' });
      const token = decodeURIComponent(new URL(rows[0].link).hash.replace(/^#reset-password=/, ''));
      return { token };
    },
  );
  fastify.post('/__test__/items', notBuilt('06-staff-import-publish'));
  fastify.post('/__test__/jobs/retention', notBuilt('17-data-rights-retention'));
}
