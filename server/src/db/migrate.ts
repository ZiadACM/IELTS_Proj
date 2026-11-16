import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Pool } from 'pg';

export const MIGRATIONS_DIR = path.resolve(import.meta.dirname, '../../migrations');

const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;
const MIGRATION_LOCK_ID = 7_310_001; // any constant; serialises concurrent starts

// Applies each not-yet-applied migration in name order, one transaction per file. Returns the names applied.
export async function migrate(pool: Pool, dir = MIGRATIONS_DIR): Promise<string[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const misnamed = files.filter((f) => !MIGRATION_FILE.test(f));
  if (misnamed.length) throw new Error(`migration files must be named NNNN_name.sql: ${misnamed.join(', ')}`);

  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(
      'create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())',
    );
    const done = new Set(
      (await client.query<{ name: string }>('select name from schema_migrations')).rows.map((r) => r.name),
    );
    const applied: string[] = [];
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(dir, file), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into schema_migrations (name) values ($1)', [file]);
        await client.query('commit');
      } catch (err) {
        await client.query('rollback');
        throw new Error(`migration ${file} failed`, { cause: err });
      }
      applied.push(file);
    }
    return applied;
  } finally {
    // Destroying the connection ends the session, which releases the advisory lock even after an error.
    client.release(true);
  }
}
