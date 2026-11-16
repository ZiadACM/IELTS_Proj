import { existsSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { buildApp } from './app.ts';
import { createClock } from './clock.ts';
import { loadConfig } from './config.ts';
import { migrate } from './db/migrate.ts';

const WEB_ROOT = path.resolve(import.meta.dirname, '../../web/dist');

const config = loadConfig(process.env);
if (!existsSync(path.join(WEB_ROOT, 'index.html')))
  throw new Error(`web app not built: ${WEB_ROOT} (run npm run build)`);

const db = new pg.Pool({ connectionString: config.databaseUrl });
const applied = await migrate(db);

const app = await buildApp({
  config,
  db,
  clock: createClock(),
  webRoot: WEB_ROOT,
  // Method and URL only: no IP address, headers or cookies in logs (CODING_STANDARDS 2.6).
  logger: { serializers: { req: (req) => ({ method: req.method, url: req.url }) } },
});
app.log.info({ applied }, 'migrations applied');
if (config.testSupportToken) app.log.warn('test-support routes enabled (/__test__/*); never in production');

await app.listen({ host: config.host, port: config.port });
