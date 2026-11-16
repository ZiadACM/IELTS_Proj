// Sessions through Better Auth (ADR 0001). Its HTTP handler is not mounted: our own literal routes call its server API,
// so every endpoint stays visible to the coverage gate. Ticket 05 maps the account routes.
import { betterAuth } from 'better-auth';
import { anonymous } from 'better-auth/plugins';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import type { Config } from '../config.ts';

const DAY_SECONDS = 24 * 60 * 60;

export function createAuth(db: Pool, config: Pick<Config, 'authSecret' | 'publicOrigin' | 'production'>) {
  return betterAuth({
    database: db,
    secret: config.authSecret,
    baseURL: config.publicOrigin,
    plugins: [anonymous()],
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

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionUser;
  }
}
