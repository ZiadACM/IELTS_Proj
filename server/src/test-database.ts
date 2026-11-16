// Database for server tests. Fails closed: a missing database is a failure, never a silent skip.
export function databaseUrlForTests(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Run `npm run db:up` (server/dev.env supplies the URL locally).');
  return url;
}
