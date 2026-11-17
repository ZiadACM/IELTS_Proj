// Items (content format v1) as stored by the app. Every write runs the content validator itself
// (tools/validate-content.mjs, a protected file): import and publish apply exactly the checks the CLI applies.
import type { Pool } from 'pg';
import { validateItem } from '../../../tools/validate-content.mjs';

export type ItemStatus = 'draft' | 'published';
export type Problem = { code: string; msg: string };
export type ItemSummary = {
  itemId: string;
  contentId: string;
  purpose: string;
  tier: number;
  questionCount: number;
  status: ItemStatus;
  importedAt: Date;
  publishedAt: Date | null;
};
type Item = Record<string, unknown> & { id: string };

// shortcut: no assets directory yet, so the audio file's existence and path are not checked here (owner decision,
// ticket 06): ticket 07 decides where audio lives and passes that directory to validateItem.
export function problemsOf(item: unknown): Problem[] {
  return validateItem(item);
}

// The status lives in the app, not the file: an import is always a draft, whatever the file says.
const asDraft = (item: Item): Item => ({ ...item, validation: { status: 'draft' } });

export type ImportResult =
  | { kind: 'invalid'; problems: Problem[] }
  | { kind: 'published' }
  | { kind: 'created' | 'replaced'; itemId: string };

// Stores a valid item as a draft. An id that is still a draft is replaced; a published one is never changed.
export async function importItem(db: Pool, item: Item, importedBy: string, now: Date): Promise<ImportResult> {
  const draft = asDraft(item);
  const problems = problemsOf(draft);
  if (problems.length) return { kind: 'invalid', problems };
  const { rows } = await db.query<{ id: string; created: boolean }>(
    `insert into items (content_id, status, content, imported_by, imported_at) values ($1, 'draft', $2, $3, $4)
     on conflict (content_id) do update set content = excluded.content, imported_by = excluded.imported_by,
       imported_at = excluded.imported_at
     where items.status = 'draft'
     returning id, (xmax = 0) as created`,
    [draft.id, draft, importedBy, now],
  );
  if (!rows[0]) return { kind: 'published' };
  return { kind: rows[0].created ? 'created' : 'replaced', itemId: rows[0].id };
}

export type PublishResult =
  | { kind: 'not_found' }
  | { kind: 'already_published' }
  | { kind: 'invalid'; problems: Problem[] }
  | { kind: 'published' };

// A content_reviewer publishes a draft (CS 3.1). The item is validated again as published, which also requires a
// human recording (validator rule audio-source); the reviewer and date are recorded in the item.
export async function publishItem(db: Pool, itemId: string, reviewerId: string, now: Date): Promise<PublishResult> {
  const { rows } = await db.query<{ status: ItemStatus; content: Item }>(
    'select status, content from items where id = $1',
    [itemId],
  );
  if (!rows[0]) return { kind: 'not_found' };
  if (rows[0].status === 'published') return { kind: 'already_published' };
  const published = {
    ...rows[0].content,
    validation: { status: 'published', reviewer: reviewerId, reviewedOn: now.toISOString().slice(0, 10) },
  };
  const problems = problemsOf(published);
  if (problems.length) return { kind: 'invalid', problems };
  const { rowCount } = await db.query(
    `update items set status = 'published', content = $2, published_by = $3, published_at = $4
     where id = $1 and status = 'draft'`,
    [itemId, published, reviewerId, now],
  );
  return rowCount ? { kind: 'published' } : { kind: 'already_published' };
}

// The staff list: what an item is and its status. No answers, route, transcript, hints or explanations.
export async function listItems(db: Pool): Promise<ItemSummary[]> {
  const { rows } = await db.query<ItemSummary>(
    `select id as "itemId", content_id as "contentId", content->>'purpose' as purpose,
       (content->>'tier')::int as tier, jsonb_array_length(content->'questions') as "questionCount",
       status, imported_at as "importedAt", published_at as "publishedAt"
     from items order by imported_at desc, content_id`,
  );
  return rows;
}

// Test support only (docs/security/test-harness-contract.md): stores a valid item with the given status directly.
export async function seedItem(db: Pool, item: Item, status: ItemStatus, now: Date): Promise<ImportResult> {
  const problems = problemsOf(item);
  if (problems.length) return { kind: 'invalid', problems };
  const { rows } = await db.query<{ id: string }>(
    `insert into items (content_id, status, content, imported_at, published_at) values ($1, $2, $3, $4, $5)
     returning id`,
    [item.id, status, item, now, status === 'published' ? now : null],
  );
  return { kind: 'created', itemId: rows[0].id };
}
