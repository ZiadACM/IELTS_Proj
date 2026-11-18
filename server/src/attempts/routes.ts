// Attempts (spec: Attempts, Audio delivery; matrix ATT-01, ATT-03, ATT-06). Ticket 07 starts guided practice and
// serves its audio. Answers and submit are ticket 08, replays and hints 11, the independent check (mode `exam`) 13.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { type Auth, callerId, requireSession } from '../access/auth.ts';
import { publishedContent, UUID } from '../catalogue/routes.ts';
import type { Clock } from '../clock.ts';
import { staffRolesOf } from '../staff/roles.ts';

type Mode = 'guided' | 'exam';
type Row = {
  id: string;
  itemId: string;
  mode: Mode;
  status: 'open' | 'submitted';
  answers: Record<string, string>;
  replayCount: number;
  hintCount: number;
  deadline: Date | null;
  seenBefore: boolean;
  late: boolean;
  score: number | null;
};
const COLUMNS = `id, item_id as "itemId", mode, status, answers, replay_count as "replayCount",
  hint_count as "hintCount", deadline, seen_before as "seenBefore", late, score`;

// The attempt as the harness contract states it ("Attempt state").
const attemptOf = (r: Row) => ({
  id: r.id,
  itemId: r.itemId,
  mode: r.mode,
  status: r.status,
  answers: r.answers,
  supportUsage: { replayCount: r.replayCount, hintCount: r.hintCount },
  deadline: r.deadline?.toISOString() ?? null,
  seenBefore: r.seenBefore,
  // Only an independent check on an unseen item is evidence of independent readiness (spec: Skill states).
  countsTowardIndependentReadiness: r.mode === 'exam' && !r.seenBefore,
  late: r.late,
  score: r.score,
});

export async function attemptRoutes(
  fastify: FastifyInstance,
  { auth, db, clock, contentDir }: { auth: Auth; db: Pool; clock: Clock; contentDir: string },
) {
  const signedIn = requireSession(auth);
  // Matrix: an admin may start practice (ATT-01) but never reads or uses an attempt (ATT-03 to ATT-09, D7).
  const attemptUser = async (request: FastifyRequest, reply: FastifyReply) => {
    await signedIn(request, reply);
    if (reply.sent || !request.user) return;
    if (!request.user.isGuest && (await staffRolesOf(db, request.user.id)).includes('admin'))
      return reply.code(403).send({ error: 'forbidden' });
  };

  // The caller's own attempt; anyone else's is indistinguishable from a missing one (404).
  const ownAttempt = async (request: FastifyRequest<{ Params: { attemptId: string } }>) => {
    const { attemptId } = request.params;
    if (!UUID.test(attemptId)) return null;
    const { rows } = await db.query<Row>(`select ${COLUMNS} from attempts where id = $1 and user_id = $2`, [
      attemptId,
      callerId(request),
    ]);
    return rows[0] ?? null;
  };

  // ATT-01: start practice on a published item. An open attempt on the same item is resumed instead (D10).
  fastify.post<{ Body: { itemId: string; mode: Mode } }>(
    '/attempts',
    {
      preValidation: attemptUser,
      schema: {
        body: {
          type: 'object',
          required: ['itemId', 'mode'],
          additionalProperties: false,
          properties: { itemId: { type: 'string', maxLength: 64 }, mode: { type: 'string', enum: ['guided', 'exam'] } },
        },
      },
    },
    async (request, reply) => {
      const { itemId, mode } = request.body;
      if (!(await publishedContent(db, itemId))) return reply.code(404).send({ error: 'not_found' });
      // shortcut: the independent check (one listen, deadline, single audio grant) is ticket 13; until then it is
      // refused rather than offered without its server-side rules (CS 2.3).
      if (mode === 'exam') return reply.code(501).send({ error: 'not_implemented', ticket: '13-independent-check' });
      const userId = callerId(request);
      const { rows } = await db.query<Row & { created: boolean }>(
        `insert into attempts (user_id, item_id, mode, seen_before, started_at)
         values ($1, $2, $3,
           exists (select 1 from attempts where user_id = $1 and item_id = $2 and status = 'submitted'), $4)
         on conflict (user_id, item_id) where status = 'open' do update set user_id = excluded.user_id
         returning ${COLUMNS}, (xmax = 0) as created`,
        [userId, itemId, mode, clock.now()],
      );
      const row = rows[0];
      return reply.code(row.created ? 201 : 200).send(attemptOf(row));
    },
  );

  // ATT-03: the caller's own attempt.
  fastify.get<{ Params: { attemptId: string } }>(
    '/attempts/:attemptId',
    { preValidation: attemptUser },
    async (request, reply) => {
      const attempt = await ownAttempt(request);
      if (!attempt) return reply.code(404).send({ error: 'not_found' });
      return attemptOf(attempt);
    },
  );

  // ATT-06: the item audio for the caller's own open guided attempt, with byte ranges. The uninterrupted first listen
  // is an interaction rule in the player (spec: Audio delivery).
  fastify.get<{ Params: { attemptId: string } }>(
    '/attempts/:attemptId/audio',
    { preValidation: attemptUser },
    async (request, reply) => {
      const attempt = await ownAttempt(request);
      if (!attempt) return reply.code(404).send({ error: 'not_found' });
      if (attempt.status !== 'open') return reply.code(409).send({ error: 'attempt_submitted' });
      const content = await publishedContent(db, attempt.itemId);
      if (!content) return reply.code(404).send({ error: 'not_found' });
      reply.header('cache-control', 'private, no-cache');
      // A missing file falls through to the app's 404; @fastify/send refuses paths outside contentDir.
      return reply.sendFile(content.audioFile, contentDir, { cacheControl: false });
    },
  );
}
