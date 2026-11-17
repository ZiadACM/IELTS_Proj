import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyError, type FastifyServerOptions } from 'fastify';
import type { Pool } from 'pg';
import { createAuth } from './access/auth.ts';
import { createRateLimit } from './access/rate-limit.ts';
import { accessRoutes } from './access/routes.ts';
import type { Clock } from './clock.ts';
import type { Config } from './config.ts';
import { settingsRoutes } from './settings/routes.ts';
import { staffRoutes } from './staff/routes.ts';
import { testSupportRoutes } from './test-support/routes.ts';

type AppOptions = {
  config: Pick<Config, 'testSupportToken' | 'authSecret' | 'publicOrigin' | 'production'>;
  db: Pool;
  clock: Clock;
  webRoot: string; // the built single-page app (web/dist)
  logger?: FastifyServerOptions['logger'];
};

// No inline or remote script, style or eval, so an injected string cannot run (CODING_STANDARDS 2.5).
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export async function buildApp({ config, db, clock, webRoot, logger = false }: AppOptions) {
  // removeAdditional: false makes `additionalProperties: false` reject unknown fields instead of silently
  // stripping them (mass assignment, ADR 0001).
  const app = Fastify({ logger, ajv: { customOptions: { removeAdditional: false } } });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('content-security-policy', CONTENT_SECURITY_POLICY);
    reply.header('referrer-policy', 'no-referrer');
    return payload;
  });

  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: 'not_found' }));

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      request.log.error(error);
      return reply.code(500).send({ error: 'internal' });
    }
    return reply.code(status).send({ error: error.code ?? 'bad_request', message: error.message });
  });

  await app.register(fastifyStatic, { root: webRoot });
  const auth = createAuth(db, config);
  // Per client (and per email for sign-in failures); spec: Security & Privacy. A tester with a few typos stays well
  // inside each limit.
  const tenPer15Min = { limit: 10, windowSeconds: 15 * 60, clock };
  const limits = {
    redemption: createRateLimit(tenPer15Min),
    signInFailures: createRateLimit(tenPer15Min),
    resetRequests: createRateLimit(tenPer15Min),
    resetCompletions: createRateLimit(tenPer15Min),
  };
  await app.register(accessRoutes, { auth, db, clock, limits });
  await app.register(settingsRoutes, { auth, db });
  await app.register(staffRoutes, { auth, db, clock });
  if (config.testSupportToken) {
    await app.register(testSupportRoutes, {
      token: config.testSupportToken,
      auth,
      db,
      clock,
      rateLimits: Object.values(limits),
    });
  }

  return app;
}
