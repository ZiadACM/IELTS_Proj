// Item catalogue for learners (spec: Item catalogue; matrix ITEM-01, ITEM-02). Only published items, and only what the
// player shows before an answer is submitted: never answers, the authored route, transcript, hints or explanations
// (CS 2.2). Every field is picked by name, so a field added to the content format stays out until it is listed here.
import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { type Auth, requireSession } from '../access/auth.ts';

export const READING_TIME_SEC = 30; // spec: Reading time and deadlines
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The first challenge is offered once at onboarding and the pilot transfer items are kept for the pilot's checks, so
// neither appears in Browse (spec: Item catalogue).
const HIDDEN_FROM_BROWSE = ['first-challenge', 'pilot-transfer'];

type Point = { x: number; y: number };
type Content = {
  tier: number;
  purpose: string;
  focusSkill?: string;
  audio: { durationSec: number };
  map: {
    width: number;
    height: number;
    landmarks: (Point & { id: string; label: string })[];
    targets: (Point & { label: string })[];
  };
  questions: { id: string; prompt: string }[];
};

// What the player receives for a published item.
function deliveryOf(itemId: string, c: Content) {
  return {
    itemId,
    tier: c.tier,
    purpose: c.purpose,
    focusSkill: c.focusSkill ?? null,
    readingTimeSec: READING_TIME_SEC,
    audio: { durationSec: c.audio.durationSec },
    map: {
      width: c.map.width,
      height: c.map.height,
      landmarks: c.map.landmarks.map(({ id, label, x, y }) => ({ id, label, x, y })),
      targets: c.map.targets.map(({ label, x, y }) => ({ label, x, y })),
    },
    questions: c.questions.map(({ id, prompt }) => ({ id, prompt })),
  };
}

// A published item's content for practice, or null (unknown, malformed, not published and pilot all look the same:
// 404). Pilot transfer items are refused too, not only hidden from Browse, so a tester holding an id cannot practise
// one before the pilot's check (owner decision, ticket 07); the independent check (ticket 13) opens them.
export async function publishedContent(db: Pool, itemId: string): Promise<(Content & { audioFile: string }) | null> {
  if (!UUID.test(itemId)) return null;
  const { rows } = await db.query<{ content: Content & { audio: { file: string } } }>(
    `select content from items where id = $1 and status = 'published' and content->>'purpose' <> 'pilot-transfer'`,
    [itemId],
  );
  return rows[0] ? { ...rows[0].content, audioFile: rows[0].content.audio.file } : null;
}

export async function catalogueRoutes(fastify: FastifyInstance, { auth, db }: { auth: Auth; db: Pool }) {
  const preValidation = requireSession(auth);

  // ITEM-01: Browse. Grouping by difficulty tier is the screen's job; the order within a tier is publishing order.
  fastify.get('/items', { preValidation }, async () => {
    const { rows } = await db.query(
      `select id as "itemId", (content->>'tier')::int as tier, content->>'purpose' as purpose,
         content->>'focusSkill' as "focusSkill", jsonb_array_length(content->'questions') as "questionCount"
       from items where status = 'published' and not (content->>'purpose' = any($1))
       order by tier, published_at, id`,
      [HIDDEN_FROM_BROWSE],
    );
    return { items: rows };
  });

  // ITEM-02: the player's view of one published item.
  fastify.get<{ Params: { itemId: string } }>('/items/:itemId', { preValidation }, async (request, reply) => {
    const content = await publishedContent(db, request.params.itemId);
    if (!content) return reply.code(404).send({ error: 'not_found' });
    return deliveryOf(request.params.itemId, content);
  });
}
