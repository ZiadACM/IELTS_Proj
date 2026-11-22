// Ticket 10 in a real browser: Answer Replay in review and the staff preview. Written after the behaviour worked
// (CS 5.4). The item is the v2 first challenge (tools/fixtures/map-002-v2.valid.json); its authored times are the
// independent source for the expected values (first point 16.42 s, noticeboard 20.42 s, answer C 28.64 s, the
// correction 68.89 s, q2's part from cue c5 at 29.64 s; D27). Headless Chromium cannot decode AAC, so the recording's
// bytes are swapped for a silent WAV of the same length (81.3 s); the request still goes to the real route, which is
// checked separately, and everything else is the real app. Real playback on a phone is an owner check.
import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';
import { BASE, onlyItem, openBrowse, openSeeded, TOKEN } from './helpers.ts';

test.skip(!BASE || !TOKEN, 'SECURITY_BASE_URL and SECURITY_TEST_SUPPORT_TOKEN are not set: NOT VERIFIED');
// Each test walks up to 22 steps through an 81 s recording after onboarding and submitting.
test.describe.configure({ timeout: 90_000 });

const EVIDENCE = new URL('../../docs/testing/evidence/answer-replay/2026-11-22/', import.meta.url).pathname;
const V2_ITEM = new URL('../../tools/fixtures/map-002-v2.valid.json', import.meta.url);
const support = { 'x-test-support-token': TOKEN as string };

// 81.3 s of silence, 8 kHz 8-bit mono.
function silentWav(seconds: number) {
  const n = Math.round(seconds * 8000);
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + n, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24);
  b.writeUInt32LE(8000, 28);
  b.writeUInt16LE(1, 32);
  b.writeUInt16LE(8, 34);
  b.write('data', 36);
  b.writeUInt32LE(n, 40);
  return b;
}
const WAV = silentWav(81.3);
// With byte ranges, like the real route: Chromium cannot seek a recording served without them.
const serveWav = (page: Page, pattern: string) =>
  page.route(pattern, (route) => {
    const m = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? '');
    if (!m)
      return route.fulfill({ status: 200, contentType: 'audio/wav', body: WAV, headers: { 'accept-ranges': 'bytes' } });
    const start = Number(m[1]);
    const end = m[2] ? Math.min(Number(m[2]), WAV.length - 1) : WAV.length - 1;
    return route.fulfill({
      status: 206,
      contentType: 'audio/wav',
      body: WAV.subarray(start, end + 1),
      headers: { 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${WAV.length}` },
    });
  });

async function seedV2(status: 'published' | 'draft') {
  const item = JSON.parse(readFileSync(V2_ITEM, 'utf8'));
  delete item._comment;
  item.id = `e2e-replay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  item.tier = 2;
  item.purpose = 'standard';
  item.audio = { file: 'audio/first-challenge-001.m4a', durationSec: 81.3, source: 'human' };
  item.validation =
    status === 'published'
      ? { status: 'published', reviewer: 'synthetic-reviewer', reviewedOn: '2026-11-22' }
      : { status: 'draft' };
  const res = await fetch(`${BASE}/__test__/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...support },
    body: JSON.stringify({ item, status }),
  });
  expect(res.status, await res.clone().text()).toBe(201);
  return { itemId: (await res.json()).itemId as string, contentId: item.id as string };
}

// Answers q1 C (right) and q2 E (wrong), ends the first listen, submits and opens the review.
async function review(page: Page) {
  const { itemId } = await seedV2('published');
  await onlyItem(page, itemId);
  await serveWav(page, '**/review/audio');
  await openBrowse(page);
  await openSeeded(page);
  await page.getByRole('combobox', { name: 'إجابة السؤال 1' }).selectOption('C');
  await page.getByRole('combobox', { name: 'إجابة السؤال 2' }).selectOption('E');
  await expect(page.getByText('حُفظت كل الإجابات.')).toBeVisible();
  await page.getByRole('button', { name: 'ابدأ الآن' }).click();
  await page.locator('.player > audio').evaluate((audio: HTMLAudioElement) => {
    audio.dispatchEvent(new Event('ended'));
    audio.pause();
  });
  await page.getByRole('button', { name: 'أرسل الإجابات' }).click();
  await page.getByRole('button', { name: 'اعرض المراجعة' }).click();
  await expect(page.getByRole('heading', { name: 'المراجعة' })).toBeVisible();
  await expect(page.getByText('1:21', { exact: false })).toBeVisible(); // the recording's length is known
}

const clock = (page: Page) => page.locator('.replay-strip audio').evaluate((a: HTMLAudioElement) => a.currentTime);
const next = (page: Page) => page.getByRole('button', { name: 'الخطوة التالية' });
const back = (page: Page) => page.getByRole('button', { name: 'الخطوة السابقة' });
async function stepTo(page: Page, sec: number) {
  for (let i = 0; i < 40 && (await clock(page)) < sec - 0.05; i++) {
    const before = await clock(page);
    await next(page).click();
    await expect.poll(() => clock(page)).toBeGreaterThan(before);
  }
  await expect.poll(() => clock(page)).toBeCloseTo(sec + 0.01, 1);
}

test('Answer Replay plays, steps point by point, lights the place named, jumps to a question and changes speed, all by keyboard', async ({
  page,
}) => {
  await review(page);
  // The real route serves the submitted attempt's recording (ATT-10); only its bytes are swapped above.
  const audioPath = (await page.locator('.replay-strip audio').getAttribute('src')) as string;
  expect(audioPath).toMatch(/^\/attempts\/[0-9a-f-]+\/review\/audio$/);
  // page.request shares the page's session but not its routes, so this reaches the server.
  const real = await page.request.get(`${BASE}${audioPath}`, { headers: { range: 'bytes=0-1' } });
  expect(real.status()).toBe(206);

  // Before Play: the question's review marks.
  await expect(page.locator('svg.item-map .review-marks')).toBeVisible();
  await expect(page.locator('svg.item-map .replay-line')).toHaveCount(0);

  // Keyboard only: Tab to Next step and press Enter.
  await next(page).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => clock(page)).toBeCloseTo(16.43, 1); // e1, the entrance ring
  await expect(page.locator('svg.item-map .review-marks')).toHaveCount(0);
  await expect(page.locator('.replay-start')).toHaveCount(1);
  await expect(page.locator('.replay-lit')).toHaveCount(0); // a new leg starts unlit
  await page.keyboard.press('Enter');
  await expect.poll(() => clock(page)).toBeCloseTo(20.43, 1); // e2 "turn right" at the noticeboard
  await expect(page.locator('.replay-lit')).toHaveCount(1);
  await expect(page.locator('.replay-sentence')).toHaveText(/turn right\.$/);
  // Paused after a step, the sentence is read out once (a polite live region), not every frame.
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: 'turn right.' })).toHaveCount(1);
  await expect(page.locator('.transcript li[aria-current="true"]')).toHaveText(/^First, the Quiet Lounge/);
  // Stepping pauses: the clock stays put.
  await page.waitForTimeout(400);
  await expect.poll(() => clock(page)).toBeCloseTo(20.43, 1);
  await back(page).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => clock(page)).toBeCloseTo(16.43, 1);

  await stepTo(page, 28.64); // e6, the answer place C
  await expect(page.locator('.replay-lit')).toHaveCount(1);
  await page.locator('.map-frame').screenshot({ path: `${EVIDENCE}answer-lit-${test.info().project.name}.png` });

  // Jump to question 2: the start of cue c5 (29.64 s), playing.
  await page.getByRole('button', { name: 'شغّل من بداية السؤال 2' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'إيقاف مؤقت' })).toBeVisible();
  const t = await clock(page);
  expect(t).toBeGreaterThanOrEqual(29.6);
  expect(t).toBeLessThan(31);

  // Speed: 0.75x, pressed, and the recording follows.
  await page.getByRole('button', { name: '0.75×' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '0.75×' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('.replay-strip audio').evaluate((a: HTMLAudioElement) => a.playbackRate)).toBe(0.75);

  // Pause, then Show the marks: back to the review marks at the start.
  await page.getByRole('button', { name: 'إيقاف مؤقت' }).click();
  await page.getByRole('button', { name: 'اعرض العلامات' }).click();
  await expect(page.getByRole('button', { name: 'شغّل إعادة المسار' })).toBeFocused(); // not dropped to the page
  await expect(page.locator('svg.item-map .review-marks')).toBeVisible();
  await expect(page.locator('svg.item-map .replay-line')).toHaveCount(0);
  await expect.poll(() => clock(page)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
});

test('the correction: its wrong path and note appear at 68.89 s, the wrong place stays framed, and the summary frames every answer', async ({
  page,
}) => {
  await review(page);
  await stepTo(page, 68.89);
  await expect(page.locator('.replay-wrong')).toHaveCount(1);
  await expect(page.locator('.replay-wrong')).not.toHaveAttribute('stroke-dasharray');
  await expect(page.locator('.replay-mistaken')).toHaveCount(1);
  await expect(page.locator('.replay-note')).toContainText('تصحيح');
  await expect(page.locator('.replay-note')).toContainText('She first suggests the door on her left');
  await page.locator('.map-frame').screenshot({ path: `${EVIDENCE}correction-${test.info().project.name}.png` });
  await next(page).click(); // 72.95 s: the walk carries on to the right
  await expect(page.locator('.replay-wrong')).toHaveCount(0);
  await expect(page.locator('.replay-mistaken')).toHaveCount(1);
  await expect(page.locator('.replay-note')).toHaveCount(0);
  await stepTo(page, 76.88); // 0.8 s after the last answer
  await expect(page.locator('.replay-summary')).toHaveCount(3);
  await expect(page.locator('.replay-start')).toHaveCount(0); // legs share the entrance: no overprinted numbers
  await expect(page.locator('.replay-lit')).toHaveCount(0);
  await expect(next(page)).toBeDisabled();
  await page.waitForTimeout(800);
  await page.locator('.map-frame').screenshot({ path: `${EVIDENCE}summary-${test.info().project.name}.png` });
});

test('reduced motion: the wrong path appears dashed and stays; the summary is not animated', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await review(page);
  await stepTo(page, 68.89);
  await expect(page.locator('.replay-wrong')).toHaveAttribute('stroke-dasharray', /\d/);
  await next(page).click();
  await expect(page.locator('.replay-wrong')).toHaveCount(1); // stays
  await stepTo(page, 76.88);
  await expect(page.locator('.replay-wrong')).toHaveCount(1);
  const animation = await page
    .locator('.replay-summary')
    .first()
    .evaluate((g) => getComputedStyle(g).animationName);
  expect(animation).toBe('none');
});

test('the transcript marks the spoken line without scrolling the page; a recording that cannot load says so and retries', async ({
  page,
}) => {
  await review(page);
  await next(page).scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => window.scrollY);
  await stepTo(page, 45.15); // e10 "staff office", in cue c7
  await expect(page.locator('.transcript li[aria-current="true"]')).toHaveText(/^The first door on your left/);
  expect(await page.evaluate(() => window.scrollY)).toBe(y);

  await page.unroute('**/review/audio');
  await page.route('**/review/audio', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'اعرض العلامات' }).click();
  await page.locator('.replay-strip audio').evaluate((a: HTMLAudioElement) => a.load());
  await expect(page.getByRole('alert')).toHaveText('تعذّر تحميل التسجيل. حاول مرة أخرى.');
  await page.unroute('**/review/audio');
  await serveWav(page, '**/review/audio');
  await page.getByRole('button', { name: 'حاول مرة أخرى' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await next(page).click();
  await expect.poll(() => clock(page)).toBeCloseTo(16.43, 1);
});

test('staff preview: a draft shown as learners see it (picks not saved), then the review with the correct letters and Answer Replay', async ({
  page,
}) => {
  const { itemId, contentId } = await seedV2('draft');
  const email = `e2e-author-${Date.now()}@example.test`;
  const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const made = await fetch(`${BASE}/__test__/users`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...support },
    body: JSON.stringify({ role: 'content_author', email, password }),
  });
  expect(made.status, await made.clone().text()).toBeLessThan(300);
  await serveWav(page, `**/admin/items/${itemId}/audio`);
  const saves: string[] = [];
  page.on('request', (r) => r.method() !== 'GET' && saves.push(`${r.method()} ${r.url()}`));

  await page.goto('/');
  await page.getByRole('button', { name: 'لديّ حساب بالفعل' }).click();
  await page.getByLabel('البريد الإلكتروني').fill(email);
  await page.getByLabel('كلمة المرور').fill(password);
  await page.getByRole('button', { name: 'سجّل الدخول' }).click();
  const skip = page.getByRole('button', { name: 'تخطَّ الآن' });
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) await skip.click();
  await page.getByRole('button', { name: 'عناصر المحتوى (للموظفين)' }).click();
  saves.length = 0;
  await page.getByRole('button', { name: `معاينة ${contentId}` }).click();

  await expect(page.locator('.preview-band')).toContainText(contentId);
  await expect(page.locator('.stub')).toBeVisible();
  await expect(page.getByText('تدريب غير رسمي', { exact: false })).toBeVisible();
  await page.getByRole('combobox', { name: 'إجابة السؤال 1' }).selectOption('D');
  await expect(page.getByRole('combobox', { name: 'إجابة السؤال 1' })).toHaveValue('D');

  // The review half: correct letters only, no score, no "Yours".
  await expect(page.locator('.review-score')).toHaveCount(0);
  await expect(page.locator('.review-questions li').first()).toContainText('C');
  await expect(page.locator('.review-questions')).not.toContainText('إجابتك');
  await next(page).click();
  await next(page).click();
  await expect(page.locator('.replay-lit')).toHaveCount(1);
  await page.screenshot({ path: `${EVIDENCE}staff-preview-${test.info().project.name}.png`, fullPage: true });
  expect(saves).toEqual([]); // nothing saved, no attempt started

  await page.getByRole('button', { name: 'العودة إلى العناصر' }).click();
  await expect(page.getByRole('heading', { name: 'عناصر المحتوى' })).toBeVisible();
});
