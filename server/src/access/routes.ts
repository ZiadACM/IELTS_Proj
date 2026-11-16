import { randomUUID } from 'node:crypto';
import { isAPIError } from 'better-auth/api';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { Clock } from '../clock.ts';
import { type Auth, cookieHeaders, forwardCookies, PASSWORD_LENGTH, requireSession, sessionUser } from './auth.ts';
import { claimInviteCode, inviteCodeHash } from './invite-codes.ts';
import type { RateLimit } from './rate-limit.ts';

export type AccessLimits = {
  redemption: RateLimit; // AUTH-05 and AUTH-01, per client: every try counts
  signInFailures: RateLimit; // AUTH-02, per client and per email: only failed tries count (SESS-01)
  resetRequests: RateLimit; // AUTH-04, per client
  resetCompletions: RateLimit; // AUTH-06, per client: every try counts, so tokens cannot be guessed in bulk
};
type Options = { auth: Auth; db: Pool; clock: Clock; limits: AccessLimits };
type Redemption = { inviteCode: string; ageConfirmed: boolean };
type Credentials = { email: string; password: string };
type AccountBody = Credentials & { inviteCode?: string; ageConfirmed?: boolean };

// Unknown, used, withdrawn and malformed codes all get exactly this answer, so it never reveals whether a code exists.
const NOT_VALID = { error: 'invite_code_not_valid' } as const;

// shortcut: sign-up says when an email already has an account. It needs a valid invite code (anonymous) or a guest
// session, and is rate-limited, so probing emails this way is slow; full non-enumeration would need email
// verification, which waits for an email provider.
const EMAIL_TAKEN = { error: 'email_taken' } as const;
const isEmailTaken = (err: unknown) =>
  isAPIError(err) && (err.body as { code?: string } | undefined)?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL';

const redemptionProperties = { inviteCode: { type: 'string', maxLength: 64 }, ageConfirmed: { type: 'boolean' } };
const credentialProperties = {
  email: { type: 'string', format: 'email', maxLength: 254 },
  password: { type: 'string', minLength: PASSWORD_LENGTH.min, maxLength: PASSWORD_LENGTH.max },
};

// The user Better Auth created (on its own connection) and the headers carrying its new session cookie.
type CreatedUser = { userId: string; headers: Headers };

export async function accessRoutes(fastify: FastifyInstance, { auth, db, clock, limits }: Options) {
  // shortcut: request.ip is the proxy's address behind a reverse proxy; set Fastify trustProxy for the host when
  // deployment is decided, or every tester shares one limit.
  const refuseOverLimit = (limit: RateLimit) => (request: FastifyRequest, reply: FastifyReply) => {
    if (!limit.allow(request.ip)) {
      reply.code(429).send({ error: 'rate_limited' });
      return true;
    }
    return false;
  };
  const redemptionLimited = refuseOverLimit(limits.redemption);

  // Redeems a code (with the 18+ confirmation, D12) for a user that createUser makes. The claim, the redemption
  // record and the new learner's settings commit together; on any failure the code stays unused.
  async function redeem(
    reply: FastifyReply,
    { inviteCode, ageConfirmed }: Partial<Redemption>,
    createUser: () => Promise<CreatedUser | FastifyReply>,
  ) {
    if (inviteCode === undefined || ageConfirmed === undefined) return reply.code(400).send(NOT_VALID);
    if (!ageConfirmed) return reply.code(400).send({ error: 'age_confirmation_required' });
    const hash = inviteCodeHash(inviteCode);
    if (!hash) return reply.code(400).send(NOT_VALID);

    const tx = await db.connect();
    try {
      await tx.query('begin');
      const codeId = await claimInviteCode(tx, hash, clock.now());
      if (!codeId) {
        await tx.query('rollback');
        return reply.code(400).send(NOT_VALID);
      }
      // shortcut: if anything below fails after Better Auth wrote the user, the claim rolls back but the orphan user
      // (never handed a cookie) stays until retention exists; ticket 17.
      const created = await createUser();
      if (!('userId' in created)) {
        await tx.query('rollback');
        return created;
      }
      await tx.query('update invite_codes set redeemed_by = $2 where id = $1', [codeId, created.userId]);
      await tx.query('insert into learner_settings (user_id) values ($1)', [created.userId]);
      await tx.query('commit');
      forwardCookies(created.headers, reply);
      return reply.code(201).send({ userId: created.userId });
    } catch (err) {
      await tx.query('rollback');
      throw err;
    } finally {
      tx.release();
    }
  }

  // AUTH-05 POST /auth/guest-sessions: a valid invite code plus the 18+ confirmation starts a guest session (D5).
  fastify.post<{ Body: Redemption }>(
    '/auth/guest-sessions',
    {
      // Before body validation, so every try counts and a signed-in caller is refused whatever it sends.
      preValidation: async (request, reply) => {
        if (redemptionLimited(request, reply)) return reply;
        if (await sessionUser(auth, request, reply)) return reply.code(403).send({ error: 'already_signed_in' });
      },
      schema: {
        body: {
          type: 'object',
          required: ['inviteCode', 'ageConfirmed'],
          additionalProperties: false,
          properties: redemptionProperties,
        },
      },
    },
    (request, reply) =>
      redeem(reply, request.body, async () => {
        const { headers, response } = await auth.api.signInAnonymous({
          headers: cookieHeaders(request),
          returnHeaders: true,
        });
        if (!response) throw new Error('Better Auth returned no guest user');
        return { userId: response.user.id, headers };
      }),
  );

  // Guest upgrade (D5, SESS-09): the caller's own guest user becomes the account in place, so every row it owns stays
  // with it. All its sessions end, and a new one is issued.
  async function upgradeGuest(userId: string, { email, password }: AccountBody, reply: FastifyReply) {
    const hash = await (await auth.$context).password.hash(password);
    const tx = await db.connect();
    try {
      await tx.query('begin');
      const { rowCount } = await tx.query(
        `update "user" set email = $2, "isAnonymous" = false, "updatedAt" = now() where id = $1 and "isAnonymous"`,
        [userId, email.toLowerCase()],
      );
      if (rowCount !== 1) {
        await tx.query('rollback');
        return reply.code(403).send({ error: 'already_signed_in' });
      }
      // Better Auth's credential account: accountId is the user id, providerId "credential".
      await tx.query(
        `insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         values ($1, $2, 'credential', $2, $3, now(), now())`,
        [randomUUID(), userId, hash],
      );
      await tx.query('delete from session where "userId" = $1', [userId]);
      await tx.query('commit');
    } catch (err) {
      await tx.query('rollback');
      if ((err as { code?: string }).code === '23505') return reply.code(409).send(EMAIL_TAKEN); // email unique
      throw err;
    } finally {
      tx.release();
    }
    // shortcut: if this sign-in fails, the account exists but has no session; the learner signs in by hand.
    const { headers } = await auth.api.signInEmail({
      body: { email, password },
      headers: new Headers(),
      returnHeaders: true,
    });
    forwardCookies(headers, reply);
    return reply.code(201).send({ userId });
  }

  // AUTH-01 POST /accounts. Without a session: a valid invite code and the 18+ confirmation create an account.
  // With a guest session: the guest is upgraded (no code needed; it redeemed one already).
  fastify.post<{ Body: AccountBody }>(
    '/accounts',
    {
      preValidation: async (request, reply) => {
        if (redemptionLimited(request, reply)) return reply;
        const user = await sessionUser(auth, request, reply);
        if (user && !user.isGuest) return reply.code(403).send({ error: 'already_signed_in' });
        if (user) request.user = user;
      },
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          additionalProperties: false,
          properties: { ...credentialProperties, ...redemptionProperties },
        },
      },
    },
    (request, reply) => {
      if (request.user) return upgradeGuest(request.user.id, request.body, reply);
      const { email, password } = request.body;
      return redeem(reply, request.body, async () => {
        try {
          // No request headers: Better Auth must not see (and link) any other session. No name is asked (CS 2.6).
          const { headers, response } = await auth.api.signUpEmail({
            body: { email, password, name: '' },
            headers: new Headers(),
            returnHeaders: true,
          });
          return { userId: response.user.id, headers };
        } catch (err) {
          if (isEmailTaken(err)) return reply.code(409).send(EMAIL_TAKEN);
          throw err;
        }
      });
    },
  );

  // AUTH-02 POST /auth/sessions: sign in. A wrong password and an unknown email get the same answer (SESS-02).
  fastify.post<{ Body: Credentials }>(
    '/auth/sessions',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          additionalProperties: false,
          properties: credentialProperties,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;
      const keys = [`client:${request.ip}`, `email:${email.toLowerCase()}`];
      // While throttled even the right password is refused, so guessing on cannot confirm a hit (SESS-01).
      if (keys.some((k) => limits.signInFailures.exceeded(k))) return reply.code(429).send({ error: 'rate_limited' });
      try {
        // No request headers: a guest signing in to an account is not linked to (or merged with) its guest user.
        const { headers, response } = await auth.api.signInEmail({
          body: { email, password },
          headers: new Headers(),
          returnHeaders: true,
        });
        // A guest signing in to an account leaves its guest session: end it on the server, not just in the cookie.
        if ((await sessionUser(auth, request, reply))?.isGuest) {
          await auth.api.signOut({ headers: cookieHeaders(request) });
        }
        forwardCookies(headers, reply);
        return { userId: response.user.id };
      } catch (err) {
        if (!isAPIError(err) || err.statusCode !== 401) throw err;
        for (const k of keys) limits.signInFailures.allow(k); // records the failure
        return reply.code(401).send({ error: 'invalid_credentials' });
      }
    },
  );

  // AUTH-03 DELETE /auth/sessions/current: sign out. The session is deleted on the server, not just the cookie.
  fastify.delete('/auth/sessions/current', { preValidation: requireSession(auth) }, async (request, reply) => {
    const { headers } = await auth.api.signOut({ headers: cookieHeaders(request), returnHeaders: true });
    forwardCookies(headers, reply);
    return { signedOut: true };
  });

  // AUTH-04 POST /auth/password-resets: the same answer whether or not the email has an account (SESS-02). A link
  // for a real account waits in the outbox for the owner (password-reset-outbox.ts). Guests have no password.
  fastify.post<{ Body: { email: string } }>(
    '/auth/password-resets',
    {
      preValidation: async (request, reply) => {
        if (refuseOverLimit(limits.resetRequests)(request, reply)) return reply;
        if ((await sessionUser(auth, request, reply))?.isGuest) return reply.code(403).send({ error: 'guest' });
      },
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          additionalProperties: false,
          properties: { email: credentialProperties.email },
        },
      },
    },
    async (request, reply) => {
      await auth.api.requestPasswordReset({ body: { email: request.body.email }, headers: new Headers() });
      return reply.code(202).send({ accepted: true });
    },
  );

  // AUTH-06 POST /auth/password-resets/complete: a link token sets a new password once, within an hour (SESS-05),
  // and ends every session of that account. Unknown, used and expired tokens get the same answer.
  fastify.post<{ Body: { token: string; newPassword: string } }>(
    '/auth/password-resets/complete',
    {
      preValidation: async (request, reply) => {
        if (refuseOverLimit(limits.resetCompletions)(request, reply)) return reply;
        if (await sessionUser(auth, request, reply)) return reply.code(403).send({ error: 'already_signed_in' });
      },
      schema: {
        body: {
          type: 'object',
          required: ['token', 'newPassword'],
          additionalProperties: false,
          properties: {
            token: { type: 'string', minLength: 1, maxLength: 128 },
            newPassword: credentialProperties.password,
          },
        },
      },
    },
    async (request, reply) => {
      const { token, newPassword } = request.body;
      try {
        await auth.api.resetPassword({ body: { token, newPassword }, headers: new Headers() });
      } catch (err) {
        if (!isAPIError(err) || err.statusCode !== 400) throw err;
        return reply.code(400).send({ error: 'reset_token_not_valid' });
      }
      return { passwordReset: true };
    },
  );
}
