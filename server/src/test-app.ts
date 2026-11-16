// The real app for inject() tests, on the test database with migrations applied.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { buildApp } from './app.ts';
import { createClock } from './clock.ts';
import { migrate } from './db/migrate.ts';
import { databaseUrlForTests } from './test-database.ts';

export const TEST_SUPPORT_TOKEN = 'synthetic-test-support-token-0123456789';
const AUTH_SECRET = 'synthetic-auth-secret-0123456789abcdef';

export function createTestApps() {
  const webRoot = mkdtempSync(path.join(tmpdir(), 'web-root-'));
  writeFileSync(path.join(webRoot, 'index.html'), '<!doctype html><html lang="ar" dir="rtl"><body></body></html>');
  const db = new pg.Pool({ connectionString: databaseUrlForTests() });
  const apps: FastifyInstance[] = [];
  let migrated: Promise<unknown> | null = null;

  return {
    db,
    async app(testSupportToken: string | null = TEST_SUPPORT_TOKEN) {
      migrated ??= migrate(db);
      await migrated;
      const config = {
        testSupportToken,
        authSecret: AUTH_SECRET,
        publicOrigin: 'http://localhost:3000',
        production: false,
      };
      const app = await buildApp({ config, db, clock: createClock(), webRoot });
      apps.push(app);
      return app;
    },
    async close() {
      await Promise.all(apps.map((a) => a.close()));
      await db.end();
      rmSync(webRoot, { recursive: true, force: true });
    },
  };
}
