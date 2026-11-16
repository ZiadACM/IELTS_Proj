// Owner script for invite codes (spec: Staff; there is no invite endpoint).
//   npm run invite-codes -w server -- create [count]   prints new codes once; only their hashes are stored
//   npm run invite-codes -w server -- list             id, created, status (codes cannot be shown again)
//   npm run invite-codes -w server -- withdraw <id>    an unused code stops working
// Uses DATABASE_URL from the environment (server/dev.env locally).
import pg from 'pg';
import { createInviteCode, listInviteCodes, withdrawInviteCode } from './invite-codes.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USAGE = 'usage: invite-codes create [count 1-100] | list | withdraw <id>';

const [command, arg] = process.argv.slice(2);
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const db = new pg.Pool({ connectionString: databaseUrl });
try {
  if (command === 'create') {
    const count = Number(arg ?? '1');
    if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error(USAGE);
    for (let i = 0; i < count; i++) {
      const { id, code } = await createInviteCode(db);
      console.log(`${code}  (id ${id})`);
    }
  } else if (command === 'list') {
    for (const row of await listInviteCodes(db))
      console.log(`${row.id}  ${row.createdAt.toISOString()}  ${row.status}`);
  } else if (command === 'withdraw') {
    if (!arg || !UUID.test(arg)) throw new Error(USAGE);
    if (!(await withdrawInviteCode(db, arg))) throw new Error(`no unused invite code with id ${arg}`);
    console.log(`withdrawn ${arg}`);
  } else {
    throw new Error(USAGE);
  }
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 1;
} finally {
  await db.end();
}
