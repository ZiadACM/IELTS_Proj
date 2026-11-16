import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { Clock } from '../clock.ts';
import { type Auth, cookieHeaders, forwardCookies, sessionUser } from './auth.ts';
import { claimInviteCode, inviteCodeHash } from './invite-codes.ts';
import type { RateLimit } from './rate-limit.ts';

type Options = { auth: Auth; db: Pool; clock: Clock; redemptionLimit: RateLimit };
type GuestSessionBody = { inviteCode: string; ageConfirmed: boolean };

// Unknown, used, withdrawn and malformed codes all get exactly this answer, so it never reveals whether a code exists.
const NOT_VALID = { error: 'invite_code_not_valid' } as const;

// AUTH-05 POST /auth/guest-sessions: a valid invite code plus the 18+ confirmation (D12) starts a guest session (D5).
export async function accessRoutes(fastify: FastifyInstance, { auth, db, clock, redemptionLimit }: Options) {
  fastify.post<{ Body: GuestSessionBody }>(
    '/auth/guest-sessions',
    {
      // Before body validation, so every try counts and a signed-in caller is refused whatever it sends.
      preValidation: async (request, reply) => {
        // shortcut: request.ip is the proxy's address behind a reverse proxy; set Fastify trustProxy for the host
        // when deployment is decided, or every tester shares one limit.
        if (!redemptionLimit.allow(request.ip)) return reply.code(429).send({ error: 'rate_limited' });
        if (await sessionUser(auth, request, reply)) return reply.code(403).send({ error: 'already_signed_in' });
      },
      schema: {
        body: {
          type: 'object',
          required: ['inviteCode', 'ageConfirmed'],
          additionalProperties: false,
          properties: { inviteCode: { type: 'string', maxLength: 64 }, ageConfirmed: { type: 'boolean' } },
        },
      },
    },
    async (request, reply) => {
      if (!request.body.ageConfirmed) return reply.code(400).send({ error: 'age_confirmation_required' });
      const hash = inviteCodeHash(request.body.inviteCode);
      if (!hash) return reply.code(400).send(NOT_VALID);

      const tx = await db.connect();
      try {
        await tx.query('begin');
        const codeId = await claimInviteCode(tx, hash, clock.now());
        if (!codeId) {
          await tx.query('rollback');
          return reply.code(400).send(NOT_VALID);
        }
        // Better Auth writes the user and session on its own connection. If anything below fails, the claim rolls
        // back. shortcut: the orphan guest (never handed a cookie) stays until retention exists; ticket 17.
        const { headers, response } = await auth.api.signInAnonymous({
          headers: cookieHeaders(request),
          returnHeaders: true,
        });
        if (!response) throw new Error('Better Auth returned no guest user');
        const userId = response.user.id;
        await tx.query('update invite_codes set redeemed_by = $2 where id = $1', [codeId, userId]);
        await tx.query('insert into learner_settings (user_id) values ($1)', [userId]);
        await tx.query('commit');
        forwardCookies(headers, reply);
        return reply.code(201).send({ userId });
      } catch (err) {
        await tx.query('rollback');
        throw err;
      } finally {
        tx.release();
      }
    },
  );
}
