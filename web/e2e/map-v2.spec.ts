// map-v2-app ticket 01 in a real browser: the player draws a content format v2 map (docs/content/map-format-v2.md)
// as the owner-approved prototype does. Written after the behaviour worked (CS 5.4). Needs a test instance with test
// support; see playwright.config.ts. Seeds the reviewed v2 first challenge as a published tier 2 practice item.
import { readFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';

const BASE = process.env.SECURITY_BASE_URL;
const TOKEN = process.env.SECURITY_TEST_SUPPORT_TOKEN;
test.skip(!BASE || !TOKEN, 'SECURITY_BASE_URL and SECURITY_TEST_SUPPORT_TOKEN are not set: NOT VERIFIED');

const V2_ITEM = new URL('../../.scratch/map-format-v2/first-challenge-001.anchored.json', import.meta.url);
const EVIDENCE = 'docs/testing/evidence/map-v2-app/2026-11-19';
const anchored = JSON.parse(readFileSync(V2_ITEM, 'utf8'));
const ROOM_NAMES: string[] = [
  ...anchored.map.areas.filter((a: { label?: string }) => a.label).map((a: { label: string }) => a.label),
  ...anchored.map.landmarks.filter((l: { area?: string }) => l.area).map((l: { label: string }) => l.label),
];

async function seedV2() {
  const item = structuredClone(anchored);
  item.id = `e2e-v2-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  item.purpose = 'standard'; // the first challenge is hidden from Browse; as practice it is listed
  item.tier = 2;
  item.audio = { ...item.audio, file: 'audio/first-challenge-001.m4a', source: 'human' }; // audio in the content folder
  item.validation = { status: 'published', reviewer: 'synthetic-reviewer', reviewedOn: '2026-11-19' };
  const res = await fetch(`${BASE}/__test__/items`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-test-support-token': TOKEN as string },
    body: JSON.stringify({ item, status: 'published' }),
  });
  expect(res.status, await res.clone().text()).toBe(201);
  return (await res.json()).itemId as string;
}

// Onboarding in Arabic (the default), Browse narrowed to the seeded item, then its player.
async function openPlayer(page: Page, itemId: string) {
  await fetch(`${BASE}/__test__/rate-limits/reset`, {
    method: 'POST',
    headers: { 'x-test-support-token': TOKEN as string },
  });
  const { code } = await (
    await fetch(`${BASE}/__test__/invite-codes`, {
      method: 'POST',
      headers: { 'x-test-support-token': TOKEN as string },
    })
  ).json();
  await page.route('**/items', async (route) => {
    const res = await route.fetch();
    const { items } = await res.json();
    await route.fulfill({
      response: res,
      json: { items: items.filter((i: { itemId: string }) => i.itemId === itemId) },
    });
  });
  await page.goto('/');
  await page.getByLabel('رمز الدعوة').fill(code);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'ابدأ', exact: true }).click();
  await page.getByRole('button', { name: 'تخطَّ الآن' }).click();
  await page.getByRole('button', { name: 'تصفّح الخرائط' }).click();
  await page.getByRole('region', { name: 'فئة الصعوبة 2' }).getByRole('button', { name: /خريطة/ }).click();
  await expect(page.getByRole('img', { name: /خريطة/ })).toBeVisible();
}

test('a v2 map is drawn as a floor plan, left to right inside the Arabic frame, with no sideways scroll', async ({
  page,
}, info) => {
  await openPlayer(page, await seedV2());
  const map = page.locator('svg.item-map');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(map).toHaveAttribute('direction', 'ltr');
  await expect(page.getByText(anchored.map.title, { exact: true })).toBeVisible();
  await expect(page.getByText(anchored.map.title, { exact: true })).toHaveAttribute('dir', 'ltr');

  // Every answer letter as a square box; every named room; the start mark and the north arrow.
  const letters = anchored.map.targets.map((t: { label: string }) => t.label);
  await expect(map.locator('.letter-box rect')).toHaveCount(letters.length);
  expect(await map.locator('.letter-box text').allTextContents()).toEqual(letters);
  // A long name is drawn on two lines (two text elements), so names are matched against the labels' joined text.
  const labelText = (await map.locator('.label').allTextContents()).join(' ');
  for (const name of ROOM_NAMES) expect(labelText).toContain(name);
  await expect(map.getByText('You are here')).toBeVisible();
  await expect(map.getByText('N', { exact: true })).toBeVisible();
  await expect(map.locator('.room')).toHaveCount(
    anchored.map.areas.filter((a: { kind: string }) => a.kind === 'room').length,
  );

  // Room names sit inside their rooms (D22: they must fit; a name spilling over a wall reads as the next room's).
  const outside = await map.evaluate((svg) => {
    const rooms = [...svg.querySelectorAll('.room')].map((r) => r.getBoundingClientRect());
    return [...svg.querySelectorAll('.label')]
      .map((t) => ({ text: t.textContent, box: t.getBoundingClientRect() }))
      .filter(({ text }) => text !== 'You are here' && text !== 'N')
      .filter(({ box }) => {
        const inRoom = rooms.some(
          (r) => box.left >= r.left && box.right <= r.right && box.top >= r.top && box.bottom <= r.bottom,
        );
        return !inRoom && box.width > 0;
      })
      .map(({ text }) => text);
  });
  // Labels outside rooms are those not linked to a room: the noticeboard and the main entrance.
  expect(outside.sort()).toEqual(['Main entrance', 'Noticeboard']);

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
  await page.screenshot({ path: `${EVIDENCE}/player-v2-${info.project.name}.png`, fullPage: true });
});

test('at 360 px the v2 map is 326 px wide (D22) and its letters stay readable', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone-chromium', 'one phone width is enough for this measurement');
  await page.setViewportSize({ width: 360, height: 780 });
  await openPlayer(page, await seedV2());
  const map = page.locator('svg.item-map');
  expect(Math.round((await map.boundingBox())?.width ?? 0)).toBe(326);
  // The box's drawn side in screen pixels (the browser's bounding box would add half the outline on each side).
  const side = await map.evaluate((svg) => {
    const rect = svg.querySelector('.letter-box rect') as SVGRectElement;
    return (rect.width.baseVal.value * svg.getBoundingClientRect().width) / svg.viewBox.baseVal.width;
  });
  expect(Math.round(side)).toBe(26);
  await map.screenshot({ path: `${EVIDENCE}/map-v2-360.png` });
});
