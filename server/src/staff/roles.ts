// Staff roles (D8; matrix roles content_author, content_reviewer, admin). Granted and revoked only by the owner script
// (owner decision, ticket 06): there is no endpoint that changes roles.
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { type Auth, sessionUser } from '../access/auth.ts';

export const STAFF_ROLES = ['content_author', 'content_reviewer', 'admin'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

// Grants a role to the account with this email. A guest has no email of its own, so it can never be staff.
// Returns false when no such account exists.
export async function grantStaffRole(db: Pool, email: string, role: StaffRole): Promise<boolean> {
  const { rowCount } = await db.query(
    `insert into staff_roles (user_id, role)
     select id, $2 from "user" where email = lower($1) and "isAnonymous" is not true
     on conflict do nothing`,
    [email, role],
  );
  if (rowCount) return true;
  return (await rolesOfEmail(db, email)) !== null;
}

export async function revokeStaffRole(db: Pool, email: string, role: StaffRole): Promise<boolean> {
  const { rowCount } = await db.query(
    'delete from staff_roles where role = $2 and user_id = (select id from "user" where email = lower($1))',
    [email, role],
  );
  return (rowCount ?? 0) > 0;
}

export async function listStaff(db: Pool): Promise<{ email: string; roles: StaffRole[] }[]> {
  const { rows } = await db.query<{ email: string; roles: StaffRole[] }>(
    `select u.email, array_agg(r.role order by r.role) as roles
     from staff_roles r join "user" u on u.id = r.user_id group by u.email order by u.email`,
  );
  return rows;
}

async function rolesOfEmail(db: Pool, email: string): Promise<StaffRole[] | null> {
  const { rows } = await db.query<{ roles: StaffRole[] }>(
    `select coalesce(array_agg(r.role) filter (where r.role is not null), '{}') as roles
     from "user" u left join staff_roles r on r.user_id = u.id
     where u.email = lower($1) and u."isAnonymous" is not true group by u.id`,
    [email],
  );
  return rows[0]?.roles ?? null;
}

export async function staffRolesOf(db: Pool, userId: string): Promise<StaffRole[]> {
  const { rows } = await db.query<{ role: StaffRole }>('select role from staff_roles where user_id = $1', [userId]);
  return rows.map((r) => r.role);
}

// preValidation hook: 401 without a session, 403 unless the caller holds one of `allowed` (matrix: deny). Runs
// before body and params validation, so a denied caller learns nothing about the request's shape.
export function requireStaffRole(auth: Auth, db: Pool, allowed: readonly StaffRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await sessionUser(auth, request, reply);
    if (!user) return reply.code(401).send({ error: 'unauthenticated' });
    const roles = user.isGuest ? [] : await staffRolesOf(db, user.id);
    if (!roles.some((r) => allowed.includes(r))) return reply.code(403).send({ error: 'forbidden' });
    request.user = user;
    request.staffRoles = roles;
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    staffRoles?: StaffRole[];
  }
}
