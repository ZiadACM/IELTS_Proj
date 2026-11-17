// Owner script for staff roles (D8; owner decision, ticket 06: there is no endpoint that changes roles).
//   npm run staff-roles -w server -- grant <email> <role>    the person must already have an account
//   npm run staff-roles -w server -- revoke <email> <role>
//   npm run staff-roles -w server -- list
// Roles: content_author, content_reviewer, admin. One person may hold both content roles.
// Uses DATABASE_URL from the environment (server/dev.env locally).
import pg from 'pg';
import { grantStaffRole, listStaff, revokeStaffRole, STAFF_ROLES, type StaffRole } from './roles.ts';

const USAGE = `usage: staff-roles grant <email> <role> | revoke <email> <role> | list   (role: ${STAFF_ROLES.join(', ')})`;
const isRole = (value: string | undefined): value is StaffRole => STAFF_ROLES.includes(value as StaffRole);

const [command, email, role] = process.argv.slice(2);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const db = new pg.Pool({ connectionString: databaseUrl });
try {
  if (command === 'list') {
    for (const row of await listStaff(db)) console.log(`${row.email}  ${row.roles.join(', ')}`);
  } else if ((command === 'grant' || command === 'revoke') && email && isRole(role)) {
    if (command === 'grant') {
      if (!(await grantStaffRole(db, email, role))) throw new Error(`no account with email ${email}`);
      console.log(`granted ${role} to ${email}`);
    } else {
      if (!(await revokeStaffRole(db, email, role))) throw new Error(`${email} does not hold ${role}`);
      console.log(`revoked ${role} from ${email}`);
    }
  } else {
    throw new Error(USAGE);
  }
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 1;
} finally {
  await db.end();
}
