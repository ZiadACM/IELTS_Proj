import type { FastifyInstance } from 'fastify';

// ME-01 GET /me/settings (docs/security/authorization-matrix.json).
// shortcut: sessions do not exist until ticket 04-invite-guest-onboarding, so every caller is anonymous and the
// matrix says deny. Replace with the real owner-scoped handler in that ticket.
export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.get('/me/settings', async (_request, reply) => reply.code(401).send({ error: 'unauthenticated' }));
}
