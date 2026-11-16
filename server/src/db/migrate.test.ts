import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import pg from 'pg';
import { databaseUrlForTests } from '../test-database.ts';
import { MIGRATIONS_DIR, migrate } from './migrate.ts';

// Each test runs in its own throwaway schema so it never touches the app's tables.
const admin = new pg.Pool({ connectionString: databaseUrlForTests() });
const scoped = new pg.Pool({ connectionString: databaseUrlForTests(), options: '-c search_path=migrate_test' });
const dirs: string[] = [];

function migrationsDir(files: Record<string, string>) {
  const dir = mkdtempSync(path.join(tmpdir(), 'migrations-'));
  dirs.push(dir);
  for (const [name, sql] of Object.entries(files)) writeFileSync(path.join(dir, name), sql);
  return dir;
}

before(async () => {
  await admin.query('drop schema if exists migrate_test cascade');
  await admin.query('create schema migrate_test');
});

after(async () => {
  await admin.query('drop schema if exists migrate_test cascade');
  await Promise.all([admin.end(), scoped.end()]);
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

test('applies migrations once, in name order', async () => {
  const dir = migrationsDir({
    '0002_add_row.sql': "insert into widget (name) values ('first');",
    '0001_create.sql': 'create table widget (name text not null);',
  });
  assert.deepEqual(await migrate(scoped, dir), ['0001_create.sql', '0002_add_row.sql']);
  assert.deepEqual(await migrate(scoped, dir), []);
  assert.deepEqual((await scoped.query('select name from widget')).rows, [{ name: 'first' }]);
});

test('a failing migration is rolled back and not recorded', async () => {
  const dir = migrationsDir({
    '0001_create.sql': 'create table widget (name text not null);',
    '0002_add_row.sql': "insert into widget (name) values ('first');",
    '0003_broken.sql': "create table half_done (x int); insert into no_such_table values ('x');",
  });
  await assert.rejects(migrate(scoped, dir), /migration 0003_broken\.sql failed/);
  const recorded = (await scoped.query('select name from schema_migrations order by name')).rows.map((r) => r.name);
  assert.deepEqual(recorded, ['0001_create.sql', '0002_add_row.sql']);
  assert.equal((await scoped.query("select to_regclass('migrate_test.half_done') as t")).rows[0].t, null);
});

test('a misnamed migration file stops the run before anything is applied', async () => {
  const dir = migrationsDir({ '0001_create.sql': 'select 1;', 'add-users.sql': 'select 1;' });
  await assert.rejects(migrate(scoped, dir), /add-users\.sql/);
});

test('the real migrations apply to an empty schema', async () => {
  await admin.query('drop schema migrate_test cascade');
  await admin.query('create schema migrate_test');
  const applied = await migrate(scoped, MIGRATIONS_DIR);
  assert.ok(applied.includes('0001_baseline.sql'), String(applied));
});
