// Staff item routes (spec: Staff; matrix ADM-01, ADM-02, ADM-04, ADM-05, ADM-08). ADM-06 (reports, ticket 14) is not
// built yet. There is no item editor and no roles endpoint (owner decision D19).
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { type Auth, callerId } from '../access/auth.ts';
import type { ItemContent } from '../attempts/routes.ts';
import { type Content, deliveryOf } from '../catalogue/routes.ts';
import type { Clock } from '../clock.ts';
import { importItem, listItems, publishItem } from './items.ts';
import { requireStaffRole } from './roles.ts';

// Any item, draft or published: staff check drafts before they publish them.
async function itemRow(db: Pool, itemId: string) {
  if (!UUID.test(itemId)) return null;
  const { rows } = await db.query<{ status: 'draft' | 'published'; content: Omit<Content, 'questions'> & ItemContent }>(
    'select status, content from items where id = $1',
    [itemId],
  );
  return rows[0] ?? null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function staffRoutes(
  fastify: FastifyInstance,
  { auth, db, clock, contentDir }: { auth: Auth; db: Pool; clock: Clock; contentDir: string },
) {
  const contentStaffOnly = requireStaffRole(auth, db, ['content_author', 'content_reviewer']);
  const reviewerOnly = requireStaffRole(auth, db, ['content_reviewer']);

  // ADM-01: every item with its status; canPublish tells the screen whether to offer publishing.
  fastify.get('/admin/items', { preValidation: contentStaffOnly }, async (request) => ({
    canPublish: request.staffRoles?.includes('content_reviewer') === true,
    items: await listItems(db),
  }));

  // ADM-02: import an item file (JSON). The validator decides what is acceptable; its codes come back on rejection.
  fastify.post<{ Body: { item: Record<string, unknown> & { id: string } } }>(
    '/admin/items',
    {
      preValidation: contentStaffOnly,
      schema: {
        body: {
          type: 'object',
          required: ['item'],
          additionalProperties: false,
          properties: { item: { type: 'object' } },
        },
      },
    },
    async (request, reply) => {
      const result = await importItem(db, contentDir, request.body.item, callerId(request), clock.now());
      if (result.kind === 'invalid') return reply.code(400).send({ error: 'item_invalid', problems: result.problems });
      if (result.kind === 'published') return reply.code(409).send({ error: 'item_published' });
      return reply.code(result.kind === 'created' ? 201 : 200).send({ itemId: result.itemId, status: 'draft' });
    },
  );

  // ADM-05: only a content_reviewer publishes (D8).
  fastify.post<{ Params: { itemId: string } }>(
    '/admin/items/:itemId/publish',
    {
      preValidation: reviewerOnly,
      schema: { body: { type: 'object', additionalProperties: false, properties: {} } },
    },
    async (request, reply) => {
      const { itemId } = request.params;
      if (!UUID.test(itemId)) return reply.code(404).send({ error: 'not_found' });
      const result = await publishItem(db, contentDir, itemId, callerId(request), clock.now());
      if (result.kind === 'not_found') return reply.code(404).send({ error: 'not_found' });
      if (result.kind === 'already_published') return reply.code(409).send({ error: 'item_published' });
      if (result.kind === 'invalid') return reply.code(400).send({ error: 'item_invalid', problems: result.problems });
      return { itemId, status: 'published' };
    },
  );

  // ADM-04: the item exactly as a learner receives it, plus what review shows (answers, explanations, the authored
  // route and the transcript) for Answer Replay. Staff only (D6 holds for learners).
  fastify.get<{ Params: { itemId: string } }>(
    '/admin/items/:itemId/preview',
    { preValidation: contentStaffOnly },
    async (request, reply) => {
      const row = await itemRow(db, request.params.itemId);
      if (!row) return reply.code(404).send({ error: 'not_found' });
      const c = row.content;
      reply.header('cache-control', 'private, no-store');
      return {
        status: row.status,
        item: deliveryOf(request.params.itemId, c),
        questions: c.questions.map((q) => ({
          id: q.id,
          cueId: c.events.find((e) => e.id === q.eventId)?.cueId ?? null,
          prompt: q.prompt,
          correctAnswer: q.answerLabel,
          explanation: { en: q.explanation.en, ar: q.explanation.ar },
        })),
        route: c.events,
        transcript: c.transcript,
      };
    },
  );

  // ADM-08: the item's audio for preview, draft or published, with byte ranges.
  fastify.get<{ Params: { itemId: string } }>(
    '/admin/items/:itemId/audio',
    { preValidation: contentStaffOnly },
    async (request, reply) => {
      const row = await itemRow(db, request.params.itemId);
      if (!row) return reply.code(404).send({ error: 'not_found' });
      reply.header('cache-control', 'private, no-cache');
      // A missing file falls through to the app's 404; @fastify/send refuses paths outside contentDir.
      return reply.sendFile(row.content.audio.file, contentDir, { cacheControl: false });
    },
  );
}
