// Invite codes (spec: Access). Random, single-tester, withdrawable. Only the owner script and test support create them;
// there is no invite endpoint for staff or admin.
import { createHash, randomInt } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

// Crockford base32: no I, L, O or U, so a code read aloud or typed from a phone is hard to get wrong.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 10; // 50 bits; redemption is rate-limited, so guessing is not practical
const CODE_PATTERN = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

export type InviteCodeStatus = 'unused' | 'redeemed' | 'withdrawn';
export type InviteCodeRow = { id: string; createdAt: Date; status: InviteCodeStatus };

// Shown as XXXXX-XXXXX; spaces, dashes and case are ignored when redeeming.
function generateInviteCode(): string {
  const chars = Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]);
  return `${chars.slice(0, 5).join('')}-${chars.slice(5).join('')}`;
}

function hashOf(normalized: string): Buffer {
  return createHash('sha256').update(normalized).digest();
}

// null for anything that cannot be a code, so the caller gives it the same "not valid" answer as an unknown code.
export function inviteCodeHash(input: string): Buffer | null {
  const normalized = input.toUpperCase().replace(/[\s-]/g, '');
  return CODE_PATTERN.test(normalized) ? hashOf(normalized) : null;
}

export async function createInviteCode(db: Pool): Promise<{ id: string; code: string }> {
  const code = generateInviteCode();
  const hash = inviteCodeHash(code);
  if (!hash) throw new Error('generated invite code does not match its own pattern');
  const { rows } = await db.query<{ id: string }>('insert into invite_codes (code_hash) values ($1) returning id', [
    hash,
  ]);
  return { id: rows[0].id, code };
}

export async function listInviteCodes(db: Pool): Promise<InviteCodeRow[]> {
  const { rows } = await db.query<InviteCodeRow>(
    `select id, created_at as "createdAt",
            case when redeemed_at is not null then 'redeemed' when withdrawn_at is not null then 'withdrawn'
                 else 'unused' end as status
       from invite_codes order by created_at`,
  );
  return rows;
}

// Only an unused code can be withdrawn; returns false otherwise (unknown id, already redeemed or withdrawn).
export async function withdrawInviteCode(db: Pool, id: string): Promise<boolean> {
  const { rowCount } = await db.query(
    'update invite_codes set withdrawn_at = now() where id = $1 and redeemed_at is null and withdrawn_at is null',
    [id],
  );
  return rowCount === 1;
}

// Claims the code inside the caller's transaction (the row stays locked until it commits). Returns the code id, or
// null when the code is unknown, used or withdrawn: the caller must not tell those apart.
export async function claimInviteCode(tx: PoolClient, hash: Buffer, now: Date): Promise<string | null> {
  const { rows } = await tx.query<{ id: string }>(
    `update invite_codes set redeemed_at = $2, adult_confirmed = true
      where code_hash = $1 and redeemed_at is null and withdrawn_at is null returning id`,
    [hash, now],
  );
  return rows[0]?.id ?? null;
}
