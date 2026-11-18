// Ticket 08 in a real browser: answering by a tap on the map and by the letter list, saving as the learner goes
// (including while offline), and submit scored by the server. Written after the behaviour worked (CS 5.4). The fixture
// item's answer key (q1 C, q2 E, q3 B) is the independent source for the expected score.
import { expect, type Page, test } from '@playwright/test';
import { BASE, onlyItem, openBrowse, openSeeded, seedTier2, TOKEN } from './helpers.ts';

test.skip(!BASE || !TOKEN, 'SECURITY_BASE_URL and SECURITY_TEST_SUPPORT_TOKEN are not set: NOT VERIFIED');

const EVIDENCE = new URL('../../docs/testing/evidence/answer-submit/2026-11-19/', import.meta.url).pathname;

// The attempt as the server holds it, read with the learner's own session.
const stored = (page: Page, attemptId: string) =>
  page.evaluate(async (id) => (await fetch(`/attempts/${id}`)).json(), attemptId);

// Opens the seeded item and returns its attempt id; reading time is skipped so the map is the only thing in view.
async function openPlayer(page: Page) {
  const item = await seedTier2();
  await onlyItem(page, item.itemId);
  await openBrowse(page);
  const started = page.waitForResponse((r) => r.url().endsWith('/attempts') && r.request().method() === 'POST');
  await openSeeded(page);
  const attemptId: string = (await (await started).json()).id;
  return { attemptId, questions: item.questions };
}

// The result line on screen (the same words also go to a hidden screen-reader announcement).
const resultLine = (page: Page, text: string) => page.locator('.status-text', { hasText: text });

const letterOnMap = (page: Page, letter: string) =>
  page.locator('svg.item-map g.target').filter({ has: page.locator('text', { hasText: new RegExp(`^${letter}$`) }) });

test('a tap on the map and the letter list answer, change and save; offline answers are re-sent; submit is scored on the server', async ({
  page,
  context,
}, testInfo) => {
  const { attemptId } = await openPlayer(page);
  const answer = (n: number) => page.getByRole('combobox', { name: `إجابة السؤال ${n}` });

  // Question 1 is the one a map tap answers; the tap picks C, shows it chosen and moves on to question 2.
  await expect(page.getByRole('button', { name: 'أجب عن السؤال 1 على الخريطة' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText('المس حرفًا على الخريطة لتجيب عن السؤال 1.')).toBeVisible();
  await letterOnMap(page, 'C').click();
  await expect(answer(1)).toHaveValue('C');
  await expect(page.getByRole('button', { name: 'أجب عن السؤال 2 على الخريطة' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // Going back to question 1 shows its letter chosen on the map (inverted box, not colour alone).
  await page.getByRole('button', { name: 'أجب عن السؤال 1 على الخريطة' }).click();
  await expect(letterOnMap(page, 'C')).toHaveClass(/picked/);

  // Question 2 by keyboard only: Tab to its list, choose A, then change to E.
  await answer(2).focus();
  await expect(page.getByRole('button', { name: 'أجب عن السؤال 2 على الخريطة' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await answer(2).selectOption('A');
  await answer(2).selectOption('E');
  await expect(page.getByText('حُفظت كل الإجابات.')).toBeVisible();
  await expect.poll(async () => (await stored(page, attemptId)).answers).toEqual({ q1: 'C', q2: 'E' });

  // Offline: the answer is kept, the learner is told, and it is sent when the connection is back.
  await context.setOffline(true);
  await answer(3).selectOption('D');
  await expect(page.getByRole('alert')).toHaveText(/لم تُحفظ بعد: لا يوجد اتصال/);
  await page.screenshot({ path: `${EVIDENCE}offline-${testInfo.project.name}.png`, fullPage: true });
  await context.setOffline(false);
  await expect(page.getByText('حُفظت كل الإجابات.')).toBeVisible({ timeout: 10_000 });
  expect((await stored(page, attemptId)).answers).toEqual({ q1: 'C', q2: 'E', q3: 'D' });
  await page.screenshot({ path: `${EVIDENCE}answered-${testInfo.project.name}.png`, fullPage: true });

  // Submit: q1 and q2 right, q3 wrong. The page shows the server's score; the attempt is closed.
  await page.getByRole('button', { name: 'أرسل الإجابات' }).click();
  await expect(resultLine(page, 'أُرسلت الإجابات. أجبت إجابة صحيحة عن 2 من 3.')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('أُرسلت الإجابات. أجبت إجابة صحيحة عن 2 من 3.');
  const done = await stored(page, attemptId);
  expect(done.status).toBe('submitted');
  expect(done.score).toBe(2);
  await expect(answer(1)).toBeDisabled();
  await expect(page.locator('audio')).toHaveCount(0);
  await expect(page.locator('svg.item-map .picked')).toHaveCount(0);
  const numberButton = await page.getByRole('button', { name: 'أجب عن السؤال 1 على الخريطة' }).boundingBox();
  expect(numberButton?.width).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  await page.screenshot({ path: `${EVIDENCE}submitted-${testInfo.project.name}.png`, fullPage: true });
});

test('a score the browser sends with submit is refused; the stored score is the server’s own', async ({ page }) => {
  const { attemptId } = await openPlayer(page);
  await page.getByRole('combobox', { name: 'إجابة السؤال 1' }).selectOption('A');
  await expect(page.getByText('حُفظت كل الإجابات.')).toBeVisible();
  const forged = await page.evaluate(
    async (id) =>
      (
        await fetch(`/attempts/${id}/submit`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ score: 3 }),
        })
      ).status,
    attemptId,
  );
  expect(forged).toBe(400);
  await page.getByRole('button', { name: 'أرسل الإجابات' }).click();
  await expect(resultLine(page, 'أجبت إجابة صحيحة عن 0 من 3.')).toBeVisible();
  expect((await stored(page, attemptId)).score).toBe(0);
});

test('submit while offline says so and keeps the answers; it works once back online', async ({ page, context }) => {
  await openPlayer(page);
  await page.getByRole('combobox', { name: 'إجابة السؤال 1' }).selectOption('C');
  await expect(page.getByText('حُفظت كل الإجابات.')).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'أرسل الإجابات' }).click();
  await expect(page.getByText(/لا يمكنك الإرسال دون اتصال/)).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'إجابة السؤال 1' })).toHaveValue('C');
  await context.setOffline(false);
  await page.getByRole('button', { name: 'أرسل الإجابات' }).click();
  await expect(resultLine(page, 'أجبت إجابة صحيحة عن 1 من 3.')).toBeVisible();
});
