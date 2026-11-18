// Shared steps for the browser tests: seeding a published item through test support, onboarding, and narrowing
// Browse to the seeded item. See playwright.config.ts for the test instance they need.
import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

export const BASE = process.env.SECURITY_BASE_URL;
export const TOKEN = process.env.SECURITY_TEST_SUPPORT_TOKEN;

// The validator's fixture map, played with the first challenge's recording (the only audio in the content folder).
const FIXTURE_ITEM = new URL('../../tools/fixtures/map-001.valid.json', import.meta.url);
export const FORBIDDEN = ['answerLabel', 'route', 'transcript', 'explanation', 'hint', 'events', 'cues'];

// A published tier 2 practice item. With `audioFile` missing from the content folder, the audio fails.
export async function seedTier2(audioFile = 'audio/first-challenge-001.m4a') {
  const item = JSON.parse(readFileSync(FIXTURE_ITEM, 'utf8'));
  delete item._comment;
  item.tier = 2;
  item.id = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  item.purpose = 'standard';
  item.audio = { file: audioFile, durationSec: 82.81, source: 'human' }; // stands in for a human recording here
  item.validation = { status: 'published', reviewer: 'synthetic-reviewer', reviewedOn: '2026-11-18' };
  const res = await fetch(`${BASE}/__test__/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-support-token': TOKEN as string },
    body: JSON.stringify({ item, status: 'published' }),
  });
  expect(res.status, await res.clone().text()).toBe(201);
  const { itemId } = await res.json();
  return { itemId: itemId as string, questions: item.questions as { id: string; prompt: string }[] };
}

// Onboarding in Arabic (the default), then Browse.
export async function openBrowse(page: Page) {
  // Guest starts are rate-limited per client (SESS-08); every test here comes from one client.
  await fetch(`${BASE}/__test__/rate-limits/reset`, {
    method: 'POST',
    headers: { 'x-test-support-token': TOKEN as string },
  });
  const res = await fetch(`${BASE}/__test__/invite-codes`, {
    method: 'POST',
    headers: { 'x-test-support-token': TOKEN as string },
  });
  const { code } = await res.json();
  await page.goto('/');
  await page.getByLabel('رمز الدعوة').fill(code);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'ابدأ', exact: true }).click();
  await page.getByRole('button', { name: 'تخطَّ الآن' }).click();
  await page.getByRole('button', { name: 'تصفّح الخرائط' }).click();
  await expect(page.getByRole('heading', { name: 'فئة الصعوبة 1' })).toBeVisible();
}

// The dev database holds many published items, so Browse is narrowed to the one this test seeded, which is then the
// only card in tier 2. Everything else about Browse and the player is the real app.
export async function onlyItem(page: Page, itemId: string) {
  await page.route('**/items', async (route) => {
    const res = await route.fetch();
    const { items } = await res.json();
    await route.fulfill({
      response: res,
      json: { items: items.filter((i: { itemId: string }) => i.itemId === itemId) },
    });
  });
}
export const openSeeded = (page: Page) =>
  page.getByRole('region', { name: 'فئة الصعوبة 2' }).getByRole('button', { name: /خريطة/ }).click();
