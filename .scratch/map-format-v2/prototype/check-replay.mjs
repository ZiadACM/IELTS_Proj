// PROTOTYPE check (ticket 06, version 9 behaviour): headless Chromium at 360 px against a built page, variant D,
// driven by window.__seek. The line jumps to each point at its time, never before; the place just named is the only
// one highlighted; the correction's wrong path appears, holds and pulls back; the summary comes at the end.
// Usage (repo root): node .scratch/map-format-v2/prototype/check-replay.mjs <built page.html> <folder for screenshots>
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { chromium } = require('playwright');
const [, , file, out] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 360, height: 780 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/mp4|media|Failed to load resource/i.test(m.text())) errors.push('console ' + m.text()); });
await page.goto('file://' + file + '#d');
await page.waitForTimeout(300);
const res = [];
const ok = (cond, msg) => res.push((cond ? 'PASS ' : 'FAIL ') + msg);
const snap = (t) => page.evaluate((t) => {
  window.__seek(t);
  const layer = document.querySelectorAll('svg.map > g')[1];
  const cur = [...layer.querySelectorAll(':scope > g')].find((g) => g.getAttribute('opacity') === '1');
  const pts = (el) => el.getAttribute('points').trim().split(' ').map((s) => s.split(',').map(Number));
  return {
    route: cur?.querySelector('polyline.m-route') ? pts(cur.querySelector('polyline.m-route')) : [],
    wrong: cur ? [...cur.querySelectorAll('polyline.m-wrong')].map(pts) : [],
    wrongDash: cur ? [...cur.querySelectorAll('polyline.m-wrong')].map((p) => p.hasAttribute('stroke-dasharray')) : [],
    frames: cur ? cur.querySelectorAll('rect[stroke="var(--wrong)"]').length : 0,
    hl: [...layer.querySelectorAll('.m-hl')].map((r) => ['x', 'y', 'width', 'height'].map((k) => +r.getAttribute(k))),
    sum: document.querySelectorAll('.m-sum').length,
  };
}, t);
const item = await page.evaluate(() => VARIANTS[3].item);
const plans = await page.evaluate(() => plansOf(VARIANTS[3].item));
const same = (p, q) => Math.hypot(p[0] - q.x, p[1] - q.y) < 0.01;
const covers = (r, p) => p.x >= r[0] && p.x <= r[0] + r[2] && p.y >= r[1] && p.y <= r[1] + r[3];

async function jumps(label) {
  let early = 0, late = 0, partials = 0, n = 0;
  for (const plan of plans) for (const [k, w] of plan.walk.entries()) {
    const prev = k ? plan.walk[k - 1].to : plan.start.at;
    if (Math.hypot(prev.x - w.to.x, prev.y - w.to.y) < 0.5) continue; n++;
    const b = await snap(w.T - 0.05), a = await snap(w.T + 0.01);
    if (b.route.some((p) => same(p, w.to)) && !plan.walk.slice(0, k).some((x) => x.to.x === w.to.x && x.to.y === w.to.y)) early++;
    if (!a.route.some((p) => same(p, w.to))) late++;
    const allowed = [plan.start.at, ...plan.walk.map((x) => x.to)];
    if (b.route.some((p) => !allowed.some((q) => same(p, q)))) partials++;
  }
  ok(early === 0 && late === 0, `${label}: the line reaches each of ${n} points at its time, not before (${early} early, ${late} late)`);
  ok(partials === 0, `${label}: no half-drawn pieces (the line jumps)`);
}
await jumps('normal');

// Highlights: the place just named, and only that one.
let hlBad = [], hlChecked = 0;
for (const plan of plans) for (const m of plan.marks) {
  const at = await snap(m.T + 0.01);
  if (m.none) { if (at.hl.length) hlBad.push(`nothing should be lit at ${m.T}`); continue; }
  hlChecked++;
  const p = m.letter ?? item.map.landmarks.find((l) => l.id === m.landmarkId);
  if (at.hl.length !== 1 || !covers(at.hl[0], p)) hlBad.push(`${m.landmarkId ?? 'letter'} at ${m.T}: ${at.hl.length} lit`);
  const before = await snap(m.T - 0.05);
  if (before.hl.some((r) => covers(r, p)) && !m.letter) hlBad.push(`${m.landmarkId} lit before it is named`);
}
ok(hlBad.length === 0, `highlight: each of ${hlChecked} named places (and answers) lit from its time until the next, one at a time` + (hlBad.length ? ': ' + hlBad.join('; ') : ''));

// Correction e18 (demo wrong path)
const c = item.events.find((e) => e.kind === 'correction'), wp = plans.flatMap((p) => p.wrong)[0];
const w0 = await snap(wp.t - 0.05), w1 = await snap(wp.t + 0.2), w2 = await snap(wp.back0 + 0.2), w3 = await snap(wp.back1 + 0.05);
ok(w0.wrong.length === 0 && w1.wrong.length === 1 && same(w1.wrong[0].at(-1), c.at), 'correction: wrong path appears in full at its time, not before');
ok(w2.wrong.length === 1 && !same(w2.wrong[0].at(-1), c.at), 'correction: wrong path pulling back after the hold');
ok(w3.wrong.length === 0 && w3.frames === 1, 'correction: wrong path gone; the wrong letter stays framed');
const sumT = Math.max(...plans.flatMap((p) => p.dests.map((d) => d.T))) + 0.8;
const s1 = await snap(sumT - 0.05), s2 = await snap(sumT + 0.05);
ok(s1.sum === 0 && s2.sum === 3 && s2.hl.length === 0, `summary: 3 answers lit together from ${sumT.toFixed(2)} s; the single highlight is gone`);
const ans = await page.evaluate(() => [...document.querySelectorAll('.qs .ans')].map((x) => x.textContent).join(''));
ok(ans === 'CFH', `summary: question list shows ${ans}`);
for (const [n, t] of [['hl-landmark', plans[2].marks.find((m) => m.landmarkId)?.T + 0.1], ['wrong-hold', wp.t + 0.3], ['dest', plans[0].dests[0].T + 0.1], ['summary', sumT + 1]]) {
  await snap(t); await page.waitForTimeout(600);
  const box = await page.locator('#frame').boundingBox();
  await page.screenshot({ path: `${out}/${n}.png`, clip: box });
}

await page.click('#motion'); await page.waitForTimeout(50);
await jumps('reduced');
const r1 = await snap(wp.t + 0.2), r2 = await snap(wp.back1 + 1);
ok(r1.wrong.length === 1 && r1.wrongDash[0] && r2.wrong.length === 1, 'reduced: wrong path dashed at its time and stays');
const anim = await page.evaluate(() => { window.__seek(1e6); return getComputedStyle(document.querySelector('.m-sum')).animationName; });
ok(anim === 'none', `reduced: summary not animated (${anim})`);
const sw = await page.evaluate(() => document.documentElement.scrollWidth);
ok(sw <= 360, `no sideways scroll at 360 px (${sw})`);
for (const h of ['a', 'b', 'c']) { await page.goto('file://' + file + '#' + h); await page.waitForTimeout(150); for (const t of [20, 40, 70, 1e6]) await page.evaluate((t) => window.__seek(t), t); }
ok(errors.length === 0, 'no script errors in variants A to D' + (errors.length ? ': ' + errors.join(' | ') : ''));
console.log(res.join('\n'));
await browser.close();
