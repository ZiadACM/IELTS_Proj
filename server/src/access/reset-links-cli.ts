// Owner script for password-reset links (ticket 05: no email provider yet, so the owner sends each link by hand).
//   npm run reset-links -w server     email, link and expiry of every link that still works (expired ones are deleted)
// Each link works once, for one hour. Send it only to the address shown. Uses DATABASE_URL (server/dev.env locally).
import pg from 'pg';
import { pendingResetLinks } from './password-reset-outbox.ts';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const db = new pg.Pool({ connectionString: databaseUrl });
try {
  const links = await pendingResetLinks(db);
  if (!links.length) console.log('no pending reset links');
  for (const { email, link, expiresAt } of links)
    console.log(`${email}  expires ${expiresAt.toISOString()}\n  ${link}`);
} catch (err) {
  console.error((err as Error).message);
  process.exitCode = 1;
} finally {
  await db.end();
}
