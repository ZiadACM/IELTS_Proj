// Ticket 09 in a real browser: after submit, "See your review" opens the score, each question's letter against the
// correct one (marks and words, not colour alone), the selected question marked on the map, the English explanation,
// the Arabic one on request with its English runs isolated, and the transcript. Written after the behaviour worked
// (CS 5.4). The item is the reviewed first challenge (docs/content/items/first-challenge-001.json), so the Arabic
// explanations are the real q1 to q3 text the ticket names; its answer key (q1 C, q2 F, q3 H) and answer cues (c9, c12,
// c14) are the independent source for the expected values.
import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import { BASE, onlyItem, openBrowse, openSeeded, TOKEN } from './helpers.ts';

test.skip(!BASE || !TOKEN, 'SECURITY_BASE_URL and SECURITY_TEST_SUPPORT_TOKEN are not set: NOT VERIFIED');

const EVIDENCE = new URL('../../docs/testing/evidence/review-explanations/2026-11-19/', import.meta.url).pathname;
const FIRST_CHALLENGE = new URL('../../docs/content/items/first-challenge-001.json', import.meta.url);

// A published tier 2 copy of the first challenge. Test support stores what it is given; the audio is marked as a
// human recording only so the copy passes the publish rule (audio-source) on this test instance.
async function seedFirstChallenge() {
  const item = JSON.parse(readFileSync(FIRST_CHALLENGE, 'utf8'));
  item.id = `e2e-review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  item.purpose = 'standard';
  item.audio = { ...item.audio, source: 'human' };
  item.validation = { status: 'published', reviewer: 'synthetic-reviewer', reviewedOn: '2026-11-19' };
  const res = await fetch(`${BASE}/__test__/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-support-token': TOKEN as string },
    body: JSON.stringify({ item, status: 'published' }),
  });
  expect(res.status, await res.clone().text()).toBe(201);
  return (await res.json()).itemId as string;
}

// Answers q1 C (right) and q2 E (wrong), leaves q3, ends the first listen and submits.
async function submitted(page: Page) {
  const itemId = await seedFirstChallenge();
  await onlyItem(page, itemId);
  await openBrowse(page);
  await openSeeded(page);
  await page.getByRole('combobox', { name: 'إجابة السؤال 1' }).selectOption('C');
  await page.getByRole('combobox', { name: 'إجابة السؤال 2' }).selectOption('E');
  await expect(page.getByText('حُفظت كل الإجابات.')).toBeVisible();
  await page.getByRole('button', { name: 'ابدأ الآن' }).click();
  await page.locator('audio').evaluate((audio: HTMLAudioElement) => {
    audio.dispatchEvent(new Event('ended'));
    audio.pause();
  });
  await page.getByRole('button', { name: 'أرسل الإجابات' }).click();
  await expect(page.locator('.status-text', { hasText: 'أُرسلت الإجابات.' })).toBeVisible();
}

// Landmark names the review marks cover, by the boxes the browser drew.
const markOverlaps = (page: Page) =>
  page.evaluate(() => {
    const box = (e: SVGGraphicsElement) => {
      const b = e.getBBox();
      return { x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y + b.height };
    };
    const marks = [
      ...document.querySelectorAll<SVGGraphicsElement>('.review-marks .tick, .review-marks .yours-tag'),
    ].map(box);
    const tick = document.querySelector<SVGGElement>('.review-marks .tick');
    const t = tick?.transform.baseVal.consolidate()?.matrix;
    if (t && marks[0])
      marks[0] = { x1: marks[0].x1 + t.e, y1: marks[0].y1 + t.f, x2: marks[0].x2 + t.e, y2: marks[0].y2 + t.f };
    return [...document.querySelectorAll<SVGTextElement>('svg.item-map text:not(.tag)')]
      .filter((text) => {
        const l = box(text);
        return marks.some((m) => m.x1 < l.x2 && l.x1 < m.x2 && m.y1 < l.y2 && l.y1 < m.y2);
      })
      .map((text) => text.textContent);
  });

const row = (page: Page, n: number) => page.locator('.review-questions li').nth(n - 1);
const marks = (page: Page) => page.locator('svg.item-map .review-marks');

test('review shows the score, each letter against the correct one on the list and the map, explanations and the transcript', async ({
  page,
}, testInfo) => {
  await submitted(page);
  await page.getByRole('button', { name: 'اعرض المراجعة' }).click();

  // Focus lands on the review heading; the score is the server's (1 of 3: only q1 is right).
  await expect(page.getByRole('heading', { name: 'المراجعة' })).toBeFocused();
  await expect(page.locator('.review-score')).toHaveText('1 صحيحة من 3');

  // The list: words and drawn marks, not colour alone.
  await expect(row(page, 1).locator('.verdict')).toHaveText(/صحيحة.*إجابتك: C/);
  await expect(row(page, 2).locator('.verdict')).toHaveText(/خاطئة.*إجابتك: E.*الصحيح: F/);
  await expect(row(page, 3).locator('.verdict')).toHaveText(/خاطئة.*إجابتك: بلا إجابة.*الصحيح: H/);

  // Q1 is open first. Right answer: one letter (C) framed with a tick and tagged as yours; no dashed frame.
  await expect(row(page, 1).locator('.review-row')).toHaveAttribute('aria-expanded', 'true');
  await expect(marks(page).locator('.correct-frame')).toHaveCount(1);
  await expect(marks(page).locator('.yours-frame')).toHaveCount(0);
  await expect(marks(page).locator('.yours-tag')).toHaveText('إجابتك');
  await expect(page.getByRole('img', { name: 'خريطة السؤال 1: الحرف الصحيح C، وإجابتك C.' })).toBeVisible();
  await expect(row(page, 1).getByText(/at the far end of that corridor/)).toBeVisible();
  await expect(page.locator('.transcript li.named')).toHaveText(/^Q1.*The Quiet Lounge is at the far end/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  await page.screenshot({ path: `${EVIDENCE}review-q1-${testInfo.project.name}.png`, fullPage: true });

  // Q2, wrong: E framed dashed and tagged, F framed solid with a tick; its line in the transcript is marked.
  await row(page, 2).locator('.review-row').click();
  await expect(row(page, 1).locator('.review-row')).toHaveAttribute('aria-expanded', 'false');
  await expect(marks(page).locator('.yours-frame')).toHaveCount(1);
  await expect(marks(page).locator('.correct-frame')).toHaveCount(1);
  await expect(page.getByRole('img', { name: 'خريطة السؤال 2: الحرف الصحيح F، وإجابتك E.' })).toBeVisible();
  await expect(page.locator('.transcript li.named')).toHaveText(/^Q2.*staff office/);
  await expect(page.locator('.transcript ol')).toHaveAttribute('dir', 'ltr');
  // The tick and the tag cover no landmark name (critique 2026-11-19: they hid "Corridor junction" and "Noticeboard").
  expect(await markOverlaps(page)).toEqual([]);
  // On a phone the map is out of view below the open row; one tap brings it back. Desktop shows both side by side.
  const seeOnMap = row(page, 2).getByRole('button', { name: 'اعرضه على الخريطة' });
  if ((page.viewportSize()?.width ?? 0) < 896) {
    await seeOnMap.click();
    await expect(page.locator('.map-frame')).toBeInViewport({ ratio: 0.9 });
  } else await expect(seeOnMap).toBeHidden();

  // The Arabic explanation opens on request, right to left, with every English run isolated.
  const arabic = row(page, 2).locator('p.why-ar');
  await expect(arabic).toHaveCount(0);
  await row(page, 2).getByRole('button', { name: 'اقرأ الشرح بالعربية' }).click();
  await expect(arabic).toHaveAttribute('dir', 'rtl');
  await expect(arabic.locator('bdi[dir="ltr"][lang="en"]')).toHaveText(['just past', 'E', 'F']);
  expect(await arabic.evaluate((p) => p.textContent?.match(/[A-Za-z]+/g)?.length)).toBe(4); // "just", "past", E, F
  await page.screenshot({ path: `${EVIDENCE}review-q2-arabic-${testInfo.project.name}.png`, fullPage: true });

  // Q3, no answer: only the correct letter is marked; the Arabic stays open and isolates "oh, sorry, I mean".
  await row(page, 3).locator('.review-row').click();
  await expect(marks(page).locator('.yours-frame')).toHaveCount(0);
  await expect(marks(page).locator('.yours-tag')).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'خريطة السؤال 3: الحرف الصحيح H، ولم تُجب.' })).toBeVisible();
  await expect(row(page, 3).locator('p.why-ar bdi')).toHaveText(['oh, sorry, I mean', 'G', 'H']);

  // "Show in the transcript" takes the learner to the line where q3's answer is named (c14).
  await row(page, 3).getByRole('button', { name: 'اعرضه في نص التسجيل' }).click();
  const named = page.locator('.transcript li.named');
  await expect(named).toBeFocused();
  await expect(named).toHaveText(/^Q3/);
  await expect(named).toBeInViewport();

  // Keyboard: the question rows are buttons in order; Enter opens one.
  await row(page, 1).locator('.review-row').focus();
  await page.keyboard.press('Enter');
  await expect(row(page, 1).locator('.review-row')).toHaveAttribute('aria-expanded', 'true');
  await expect(row(page, 1).locator('p.why-ar bdi')).toHaveText(['at the far end', 'D', 'A', 'C']);

  // The review ends with one way on: back to the maps (the quiet back link is not repeated).
  await expect(page.getByText('انتهت المراجعة. اختر خريطة أخرى لتواصل التدرّب.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'العودة إلى الخرائط' })).toHaveCount(1);
  await page.screenshot({ path: `${EVIDENCE}review-end-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'العودة إلى الخرائط' }).click();
  await expect(page.getByRole('heading', { name: 'فئة الصعوبة 1' })).toBeVisible();
  await expect(page.locator('.review-score')).toHaveCount(0);
});

test('a review that cannot load says why and loads on retry', async ({ page }, testInfo) => {
  await submitted(page);
  let fail = true;
  await page.route('**/review', (route) => (fail ? route.abort('internetdisconnected') : route.continue()));
  await page.getByRole('button', { name: 'اعرض المراجعة' }).click();
  await expect(page.getByRole('alert')).toHaveText(/تعذّر تحميل المراجعة: لا يوجد اتصال/);
  await page.screenshot({ path: `${EVIDENCE}review-offline-${testInfo.project.name}.png`, fullPage: true });
  fail = false;
  await page.getByRole('button', { name: 'حاول مرة أخرى' }).click();
  await expect(page.locator('.review-score')).toHaveText('1 صحيحة من 3');
});

test('the review reads in English when the interface is English', async ({ page }) => {
  await submitted(page);
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('button', { name: 'See your review' }).click();
  await expect(page.locator('.review-score')).toHaveText('1 of 3 right');
  await expect(row(page, 2).locator('.verdict')).toHaveText(/Wrong.*Yours: E.*Correct: F/);
  await expect(page.getByRole('button', { name: 'Read in Arabic' })).toBeVisible();
});
