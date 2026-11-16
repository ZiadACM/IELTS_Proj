// Sessions and accounts through Better Auth (ADR 0001). Its HTTP handler is not mounted: our own literal routes (the
// matrix AUTH-* rows) call its server API, so every endpoint stays visible to the coverage gate.
import { betterAuth } from 'better-auth';
import { anonymous } from 'better-auth/plugins';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { Config } from '../config.ts';
import { forgetResetLinks, queueResetLink, RESET_TOKEN_SECONDS } from './password-reset-outbox.ts';

const DAY_SECONDS = 24 * 60 * 60;
export const PASSWORD_LENGTH = { min: 8, max: 128 };

export function createAuth(db: Pool, config: Pick<Config, 'authSecret' | 'publicOrigin' | 'production'>) {
  return betterAuth({
    database: db,
    secret: config.authSecret,
    baseURL: config.publicOrigin,
    plugins: [anonymous()],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_LENGTH.min,
      maxPasswordLength: PASSWORD_LENGTH.max,
      resetPasswordTokenExpiresIn: RESET_TOKEN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      onPasswordReset: ({ user }) => forgetResetLinks(db, user.email),
      // No email provider (owner decision, ticket 05): the link waits in an outbox the owner reads with a script.
      sendResetPassword: async ({ user, token }) => {
        // A guest has a placeholder email and no password: no link for it.
        if (!(user as { isAnonymous?: boolean }).isAnonymous)
          await queueResetLink(db, config.publicOrigin, user.email, token);
      },
    },
    // A guest may come back any time within the D11 inactivity window; each visit extends the session.
    session: { expiresIn: 30 * DAY_SECONDS, updateAge: DAY_SECONDS },
    advanced: { useSecureCookies: config.production, ipAddress: { disableIpTracking: true } },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type SessionUser = { id: string; isGuest: boolean };

// Only the cookie goes to Better Auth: no IP address or user agent is stored with a session (CS 2.6).
export const cookieHeaders = (request: FastifyRequest) => new Headers({ cookie: request.headers.cookie ?? '' });

export function forwardCookies(from: Headers, reply: FastifyReply) {
  const cookies = from.getSetCookie();
  if (cookies.length) reply.header('set-cookie', cookies);
}

// The caller's user, or null without a valid session. Passes on a refreshed session cookie.
export async function sessionUser(
  auth: Auth,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<SessionUser | null> {
  const { headers, response } = await auth.api.getSession({ headers: cookieHeaders(request), returnHeaders: true });
  forwardCookies(headers, reply);
  if (!response) return null;
  return { id: response.user.id, isGuest: response.user.isAnonymous === true };
}

// preValidation hook for owner-scoped routes: 401 without a session (matrix: anonymous deny).
export function requireSession(auth: Auth) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await sessionUser(auth, request, reply);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    request.user = user;
  };
}

// The signed-in caller of a route guarded by requireSession. Throws (500) if the guard is missing: fail closed.
export function callerId(request: FastifyRequest): string {
  if (!request.user) throw new Error(`${request.method} ${request.url} has no session guard`);
  return request.user.id;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser;
  }
}
