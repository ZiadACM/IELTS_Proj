// Password-reset links waiting for the owner to send them by hand (owner decision, ticket 05: no email provider yet).
// Each row holds the account email and a link that works for one hour; rows are deleted once expired (CS 2.6).
// The token is in the URL fragment, so it never reaches a server log or a Referer header (SESS-06).
import type { Pool } from 'pg';

export const RESET_TOKEN_SECONDS = 60 * 60; // SESS-05: a reset token is refused after 1 hour

export type ResetLink = { email: string; link: string; expiresAt: Date };

export const resetLinkFor = (publicOrigin: string, token: string) =>
  `${publicOrigin.replace(/\/+$/, '')}/#reset-password=${encodeURIComponent(token)}`;

export async function queueResetLink(db: Pool, publicOrigin: string, email: string, token: string) {
  await db.query(
    `insert into password_reset_outbox (email, link, expires_at) values ($1, $2, now() + make_interval(secs => $3))`,
    [email, resetLinkFor(publicOrigin, token), RESET_TOKEN_SECONDS],
  );
}

// Links that still work, oldest first. Expired ones are removed first.
export async function pendingResetLinks(db: Pool): Promise<ResetLink[]> {
  await db.query('delete from password_reset_outbox where expires_at <= now()');
  const { rows } = await db.query<ResetLink>(
    'select email, link, expires_at as "expiresAt" from password_reset_outbox order by created_at',
  );
  return rows;
}
