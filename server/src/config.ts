// Configuration comes from the environment only. Missing or unsafe configuration stops the app (CODING_STANDARDS 2.4).

export type Config = {
  databaseUrl: string;
  host: string;
  port: number;
  production: boolean;
  // Enables /__test__/* (docs/security/test-harness-contract.md). Never set in production (SECRET-04).
  testSupportToken: string | null;
  // Signs session cookies (Better Auth). Required everywhere; the committed dev value is refused in production.
  authSecret: string;
  // The address learners use, e.g. https://masar.example. Required in production.
  publicOrigin: string;
};

const MIN_SECRET_LENGTH = 32;
export const DEV_AUTH_SECRET = 'local-development-only-not-a-secret-0000';

export function loadConfig(env: Record<string, string | undefined>): Config {
  const production = env.NODE_ENV === 'production';
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');

  const port = Number(env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`PORT is not a valid port: ${env.PORT}`);

  const testSupportToken = env.SECURITY_TEST_SUPPORT_TOKEN || null;
  if (testSupportToken && production) {
    throw new Error('SECURITY_TEST_SUPPORT_TOKEN is set with NODE_ENV=production; refusing to start (SECRET-04)');
  }
  if (testSupportToken && testSupportToken.length < MIN_SECRET_LENGTH) {
    throw new Error(`SECURITY_TEST_SUPPORT_TOKEN must be at least ${MIN_SECRET_LENGTH} characters`);
  }

  const authSecret = env.AUTH_SECRET;
  if (!authSecret) throw new Error('AUTH_SECRET is not set');
  if (authSecret.length < MIN_SECRET_LENGTH)
    throw new Error(`AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
  if (production && authSecret === DEV_AUTH_SECRET)
    throw new Error('AUTH_SECRET is the development value in production');

  const publicOrigin = env.PUBLIC_ORIGIN ?? (production ? undefined : `http://localhost:${port}`);
  if (!publicOrigin) throw new Error('PUBLIC_ORIGIN is not set');

  return { databaseUrl, host: env.HOST ?? '127.0.0.1', port, production, testSupportToken, authSecret, publicOrigin };
}
