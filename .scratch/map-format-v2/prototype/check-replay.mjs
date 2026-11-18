// PROTOTYPE check (ticket 06): headless Chromium at 360 px against a built page, variant D, using window.__seek.
// Usage (repo root): node .scratch/map-format-v2/prototype/check-replay.mjs <built page.html> <folder for a screenshot>
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const page_ = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/mp4|media|Failed to load resource/i.test(m.text())) errors.push('console ' + m.text()); });
await page.goto('file://' + page_ + '#d');
await page.waitForTimeout(300);
const res = [];
const ok = (cond, msg) => res.push((cond ? 'PASS ' : 'FAIL ') + msg);
// route polylines of the current (opacity 1) leg
const snap = (t) => page.evaluate((t) => {
  window.__seek(t);
  const layer = document.querySelectorAll('svg.map > g')[1];
  const gs = [...layer.querySelectorAll(':scope > g')];
  const cur = gs.find((g) => g.getAttribute('opacity') === '1');
  const pl = (sel, g) => g ? [...g.querySelectorAll(sel)].map((p) => p.getAttribute('points').trim().split(' ').map((s) => s.split(',').map(Number))) : [];
  return { route: pl('polyline.m-route', cur)[0] ?? [], wrong: pl('polyline.m-wrong', cur), wrongDash: cur ? [...cur.querySelectorAll('polyline.m-wrong')].map((p) => p.hasAttribute('stroke-dasharray')) : [],
    frames: cur ? [...cur.querySelectorAll('rect[stroke="var(--wrong)"]')].length : 0, sum: document.querySelectorAll('.m-sum').length,
    legs: gs.length };
}, t);
const item = await page.evaluate(() => VARIANTS[3].item);
const walk = item.events.filter((e) => e.kind !== 'correction' && !e.startsLeg && e !== item.events[0]);
const UNIT = 1080 / 358; // map units per screen px at 360 px wide (1 px)
const same = (p, q) => Math.hypot(p[0] - q.x, p[1] - q.y) < 0.5;
async function neverEarly(label) {
  let early = 0, late = 0;
  for (const e of walk) {
    const before = await snap(e.atSec - 0.1), after = await snap(e.atSec + 0.01);
    const prev = item.events[item.events.indexOf(e) - 1];
    const prevPt = (prev.kind === 'correction' ? item.events[item.events.indexOf(e) - 2] : prev).at;
    const zeroLen = Math.hypot(prevPt.x - e.at.x, prevPt.y - e.at.y) < 0.5;
    if (!zeroLen && before.route.length && Math.hypot(before.route.at(-1)[0] - e.at.x, before.route.at(-1)[1] - e.at.y) < UNIT) early++;
    if (!after.route.some((p) => same(p, e.at))) late++;
  }
  ok(early === 0, `${label}: the line is still at least 1 px short of each point 0.1 s before its atSec (${walk.length} points checked, ${early} early)`);
  ok(late === 0, `${label}: every point drawn by its atSec (${late} missing)`);
}
await neverEarly('smooth');
// smoothness: main-hall growth of leg 2 (e7 -> e8), sample 40 frames in the 1.2 s before e8
const e8 = item.events.find((e) => e.id === 'e8');
let prevD = -1, mono = true, maxStep = 0, partials = 0;
for (let k = 0; k <= 40; k++) {
  const s = await snap(e8.atSec - 1.2 + k * 0.03);
  const head = s.route.at(-1); if (!head) continue;
  const d = Math.hypot(head[0] - 500, head[1] - 840);
  if (d < prevD - 0.01) mono = false;
  if (prevD >= 0) maxStep = Math.max(maxStep, d - prevD);
  if (d > 0.5 && d < 279.5) partials++;
  prevD = d;
}
ok(mono && partials >= 20 && maxStep < 40, `smooth: main hall grows continuously (${partials} in-between frames of 41, largest step ${maxStep.toFixed(1)} units of 280, monotonic ${mono})`);
// correction e18
const c = item.events.find((e) => e.kind === 'correction');
const w1 = await snap(c.atSec - 0.3), w2 = await snap(c.atSec + 0.2), w3 = await snap(c.atSec + 0.5 + 0.3), w4 = await snap(c.atSec + 1.2);
ok(w1.wrong.length === 1 && !same(w1.wrong[0].at(-1), c.at), `correction: wrong path growing before its atSec`);
ok(w2.wrong.length === 1 && same(w2.wrong[0].at(-1), c.at), `correction: wrong path reaches the wrong door (${c.at.x}, ${c.at.y}) and holds`);
ok(w3.wrong.length === 1 && !same(w3.wrong[0].at(-1), c.at), `correction: wrong path pulling back`);
ok(w4.wrong.length === 0 && w4.frames === 1, `correction: wrong path gone after pull-back; the wrong letter stays framed`);
const sumT = Math.max(...item.events.filter((e) => e.kind === 'destination').map((e) => e.atSec)) + 0.8;
const s1 = await snap(sumT - 0.05), s2 = await snap(sumT + 0.05);
ok(s1.sum === 0 && s2.sum === 3, `summary: 3 answers highlighted from ${sumT.toFixed(2)} s, none before`);
const ansShown = await page.evaluate(() => [...document.querySelectorAll('.qs .ans')].map((x) => x.textContent).join(''));
ok(ansShown === 'CFH', `summary: question list shows answers ${ansShown}`);
// reduced motion
await page.click('#motion'); await page.waitForTimeout(50);
await neverEarly('reduced');
const midE8 = await snap(e8.atSec - 0.3);
ok(!midE8.route.some((p) => Math.abs(p[0] - 500) < 0.5 && p[1] > 560.5 && p[1] < 839.5), 'reduced: no partial segment while words are spoken');
const r1 = await snap(c.atSec + 0.2), r2 = await snap(c.atSec + 2.5);
ok(r1.wrong.length === 1 && r1.wrongDash[0] && r2.wrong.length === 1, 'reduced: wrong path appears dashed at its time and stays (no pull-back)');
const sumAnim = await page.evaluate(() => { window.__seek(1e6); const g = document.querySelector('.m-sum'); return getComputedStyle(g).animationName; });
ok(sumAnim === 'none', `reduced: summary not animated (${sumAnim})`);
const sw = await page.evaluate(() => document.documentElement.scrollWidth);
ok(sw <= 360, `no sideways scroll at 360 px (scrollWidth ${sw})`);
await page.screenshot({ path: process.argv[3] + '/shot-wrong.png', clip: { x: 0, y: 0, width: 360, height: 520 } }).catch(() => {});
ok(errors.length === 0, 'no script errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
// Other variants still render
for (const h of ['a', 'b', 'c']) { await page.goto('file://' + page_ + '#' + h); await page.waitForTimeout(150); await page.evaluate(() => window.__seek(30)); }
ok(errors.length === 0, 'variants A to C render and seek without errors');
console.log(res.join('\n'));
await browser.close();
