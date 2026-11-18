// Browser tests (ADR 0001; spec, Testing Decisions). They drive a running test instance with test support, the same
// contract as the live security suites (docs/security/test-harness-contract.md): SECURITY_BASE_URL and
// SECURITY_TEST_SUPPORT_TOKEN. Unset: every test is skipped and reported, never passed.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: process.env.SECURITY_BASE_URL, trace: 'retain-on-failure' },
  projects: [
    { name: 'phone-chromium', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'phone-webkit', use: { ...devices['iPhone 14'] } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
