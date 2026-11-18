// Ticket 07 in a real browser: Browse by difficulty tier and the item player shell (reading time, map, questions,
// first listen). Written after the behaviour worked (CS 5.4). Needs a test instance with test support; see
// playwright.config.ts. Each test seeds its own published item through /__test__/items.
import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';

const BASE = process.env.SECURITY_BASE_URL;
const TOKEN = process.env.SECURITY_TEST_SUPPORT_TOKEN;
test.skip(!BASE || !TOKEN, 'SECURITY_BASE_URL and SECURITY_TEST_SUPPORT_TOKEN are not set: NOT VERIFIED');

// The validator's fixture map, played with the first challenge's recording (the only audio in the content folder).
const FIXTURE_ITEM = new URL('../../tools/fixtures/map-001.valid.json', import.meta.url);
const FORBIDDEN = ['answerLabel', 'route', 'transcript', 'explanation', 'hint', 'events', 'cues'];

// A published tier 2 practice item. With `audioFile` missing from the content folder, the audio fails.
async function seedTier2(audioFile = 'audio/first-challenge-001.m4a') {
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
  return { itemId: itemId as string, questions: item.questions as { prompt: string }[] };
}

// Onboarding in Arabic (the default), then Browse.
async function openBrowse(page: Page) {
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
async function onlyItem(page: Page, itemId: string) {
  await page.route('**/items', async (route) => {
    const res = await route.fetch();
    const { items } = await res.json();
    await route.fulfill({
      response: res,
      json: { items: items.filter((i: { itemId: string }) => i.itemId === itemId) },
    });
  });
}
const openSeeded = (page: Page) =>
  page.getByRole('region', { name: 'فئة الصعوبة 2' }).getByRole('button', { name: /خريطة/ }).click();

test('Browse shows the three tiers; a tier with no maps says so', async ({ page }) => {
  await page.route('**/items', async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    await route.fulfill({ response: res, json: { items: body.items.filter((i: { tier: number }) => i.tier !== 3) } });
  });
  await openBrowse(page);
  for (const tier of [1, 2, 3]) await expect(page.getByRole('heading', { name: `فئة الصعوبة ${tier}` })).toBeVisible();
  const tier3 = page.getByRole('region', { name: 'فئة الصعوبة 3' });
  await expect(tier3.getByText('لا توجد خرائط في فئة الصعوبة هذه بعد.')).toBeVisible();
  await expect(tier3.getByRole('button')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
});

test('reading time counts down, can be skipped, and the first listen cannot be paused or sought', async ({ page }) => {
  const item = await seedTier2();
  await onlyItem(page, item.itemId);
  await openBrowse(page);
  const delivered: unknown[] = [];
  page.on('response', async (r) => {
    if (/\/(items|attempts)\//.test(r.url()) && r.headers()['content-type']?.includes('json'))
      delivered.push(await r.json());
  });
  await openSeeded(page);

  // Reading time: counting down, the questions and the map are there, English content is left to right.
  const countdown = page.getByText(/يبدأ الصوت بعد \d+ ث/);
  await expect(countdown).toBeVisible();
  const first = Number((await countdown.innerText()).match(/\d+/)?.[0]);
  await expect.poll(async () => Number((await countdown.innerText()).match(/\d+/)?.[0])).toBeLessThan(first);
  await expect(page.getByRole('img', { name: /خريطة/ })).toBeVisible();
  const prompt = page.getByText(item.questions[0].prompt, { exact: true });
  await expect(prompt).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText('تدريب غير رسمي بأسلوب IELTS')).toBeVisible();

  // Skip by keyboard.
  await page.getByRole('button', { name: 'ابدأ الآن' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/قيد التشغيل · \d:\d\d من \d:\d\d/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('status')).toHaveText('بدأ الاستماع الأول.');

  // No controls, and a pause or a seek (what a media key or devtools could do) is undone.
  const audio = page.locator('audio');
  await expect(audio).not.toHaveAttribute('controls');
  await page.waitForTimeout(2000);
  await audio.evaluate((a: HTMLAudioElement) => {
    a.pause();
    a.currentTime = 60;
  });
  await page.waitForTimeout(1500);
  const after = await audio.evaluate((a: HTMLAudioElement) => ({ paused: a.paused, t: a.currentTime }));
  expect(after.paused).toBe(false);
  expect(after.t).toBeLessThan(10);

  // Nothing the browser received names an answer, the route, the transcript or explanations.
  const text = JSON.stringify(delivered);
  expect(delivered.length).toBeGreaterThan(0);
  for (const key of FORBIDDEN) expect(text).not.toContain(`"${key}"`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
});

test('switching language during the first listen keeps the audio playing', async ({ page }) => {
  await onlyItem(page, (await seedTier2()).itemId);
  await openBrowse(page);
  await openSeeded(page);
  await page.getByRole('button', { name: 'ابدأ الآن' }).click();
  await expect(page.getByText(/قيد التشغيل/)).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);
  const before = await page.locator('audio').evaluate((a: HTMLAudioElement) => a.currentTime);
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByText(/Playing · \d:\d\d of \d:\d\d/)).toBeVisible();
  await page.waitForTimeout(1500);
  const after = await page.locator('audio').evaluate((a: HTMLAudioElement) => ({ paused: a.paused, t: a.currentTime }));
  expect(after.paused).toBe(false);
  expect(after.t).toBeGreaterThan(before);
});

test('audio that cannot load shows a message and a retry', async ({ page }) => {
  await onlyItem(page, (await seedTier2('audio/does-not-exist.m4a')).itemId);
  await openBrowse(page);
  await openSeeded(page);
  await page.getByRole('button', { name: 'ابدأ الآن' }).click();
  await expect(page.getByRole('alert')).toHaveText(/تعذّر تحميل الصوت/);
  await expect(page.getByRole('button', { name: 'حاول مرة أخرى' })).toBeVisible();
});

test('a map that is no longer published says so and leads back to Browse', async ({ page }) => {
  await onlyItem(page, (await seedTier2()).itemId);
  await openBrowse(page);
  await page.route(/\/items\/[^/]+$/, (route) => route.fulfill({ status: 404, json: { error: 'not_found' } }));
  await openSeeded(page);
  await expect(page.getByRole('alert')).toHaveText('هذه الخريطة لم تعد متاحة.');
  await page.getByRole('button', { name: 'العودة إلى الخرائط' }).click();
  await expect(page.getByRole('heading', { name: 'فئة الصعوبة 1' })).toBeVisible();
});
