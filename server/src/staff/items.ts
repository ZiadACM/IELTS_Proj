// Items (content format v1) as stored by the app. Every write runs the content validator itself
// (tools/validate-content.mjs, a protected file): import and publish apply exactly the checks the CLI applies.
import path from 'node:path';
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

// With a content folder (import and publish), the validator also checks that the audio file exists inside it (owner
// decision, ticket 07). The folder's own path is cut from the messages: staff need the file name, not server paths.
export function problemsOf(item: unknown, contentDir?: string): Problem[] {
  if (!contentDir) return validateItem(item);
  const root = path.resolve(contentDir) + path.sep;
  // shortcut: the cast stands in for types on the protected validator (CS section 7). It is plain JS: TypeScript infers its assetsDir option (default null) as null only.
  const options = { assetsDir: contentDir } as unknown as Parameters<typeof validateItem>[1];
  return validateItem(item, options).map((p: Problem) => ({ ...p, msg: p.msg.replaceAll(root, '') }));
}

// The status lives in the app, not the file: an import is always a draft, whatever the file says.
const asDraft = (item: Item): Item => ({ ...item, validation: { status: 'draft' } });

export type ImportResult =
  | { kind: 'invalid'; problems: Problem[] }
  | { kind: 'published' }
  | { kind: 'created' | 'replaced'; itemId: string };

// Stores a valid item as a draft. An id that is still a draft is replaced; a published one is never changed.
export async function importItem(
  db: Pool,
  contentDir: string,
  item: Item,
  importedBy: string,
  now: Date,
): Promise<ImportResult> {
  const draft = asDraft(item);
  const problems = problemsOf(draft, contentDir);
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
// human recording or synthetic audio with its D24 record (validator rule audio-source); the reviewer and date are
// recorded in the item.
export async function publishItem(
  db: Pool,
  contentDir: string,
  itemId: string,
  reviewerId: string,
  now: Date,
): Promise<PublishResult> {
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
  const problems = problemsOf(published, contentDir);
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
// The file's own status must agree, so a published item still passes the published rules (human audio, reviewer).
// The audio file is not checked: the security fixtures name audio that does not exist.
export async function seedItem(
  db: Pool,
  item: Item,
  status: ItemStatus,
  now: Date,
): Promise<{ kind: 'invalid'; problems: Problem[] } | { kind: 'exists' } | { kind: 'created'; itemId: string }> {
  const problems = problemsOf(item);
  const fileStatus = (item.validation as { status?: unknown } | undefined)?.status;
  if (fileStatus !== status)
    problems.push({ code: 'validation', msg: `the file says ${JSON.stringify(fileStatus)}, not "${status}"` });
  if (problems.length) return { kind: 'invalid', problems };
  const { rows } = await db.query<{ id: string }>(
    `insert into items (content_id, status, content, imported_at, published_at) values ($1, $2, $3, $4, $5)
     on conflict (content_id) do nothing returning id`,
    [item.id, status, item, now, status === 'published' ? now : null],
  );
  return rows[0] ? { kind: 'created', itemId: rows[0].id } : { kind: 'exists' };
}
