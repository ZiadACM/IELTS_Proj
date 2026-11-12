// XSS-01, XSS-02, XSS-03 (docs/security/test-plan.md, CODING_STANDARDS 2.5, owner decision D4).
// API level: payloads are rejected at import, or stored and served back only as JSON data with nosniff.
// Browser rendering (no script runs on the Answer Replay transcript, staff report and settings screens) needs a
// browser runner and a UI: NOT VERIFIED until the first UI ticket (reported as a diagnostic, never as a pass).
// Live suite: needs SECURITY_BASE_URL. Endpoints come from the `acceptsUserText` / `rendersUserText` flags.
import assert from 'node:assert/strict';
import { liveTest, matrix, has, fillPath, ok2xx, buildItem } from './lib/live.mjs';

const byId = Object.fromEntries(matrix.endpoints.map((e) => [e.id, e]));
export const PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '"><iframe src=javascript:alert(1)>',
  'javascript:alert(1)',
  '<a href="javascript:alert(1)">x</a>',
  '‮evil.exe‬',
  '{{constructor.constructor("alert(1)")()}}',
];
const FIELDS = {
  'transcript cue': (i, p) => { i.transcript.cues[0].text = p; },
  'landmark label': (i, p) => { i.map.landmarks[0].label = p; },
  prompt: (i, p) => { i.questions[0].prompt = p; },
  'distractor note': (i, p) => { i.events.find((e) => e.kind === 'distractor').note = p; },
  explanation: (i, p) => { i.questions[0].explanation = p; },
};
const isJson = (r) => /^application\/(problem\+)?json\b/i.test(r.headers.get('content-type') ?? '');
const nosniff = (r) => (r.headers.get('x-content-type-options') ?? '').toLowerCase() === 'nosniff';

function servedAsData(r, payload, where, problems) {
  if (!isJson(r)) problems.push(`${where}: served as ${r.headers.get('content-type')} (must be JSON)`);
  if (!nosniff(r)) problems.push(`${where}: missing X-Content-Type-Options: nosniff`);
  if (isJson(r) && !JSON.stringify(r.json ?? null).includes(JSON.stringify(payload).slice(1, -1))) problems.push(`${where}: payload not returned verbatim as JSON string data`);
}

liveTest('XSS-01: markup in item text fields is rejected at import, or served back only as JSON data', async (t, env) => {
  const importer = matrix.endpoints.find((e) => e.id === 'ADM-02');
  assert.ok(importer && has(importer, 'acceptsUserText'), 'ADM-02 (import) must exist and be flagged acceptsUserText');
  const author = await env.user('content_author', 'author-1');
  const problems = [];
  let accepted = 0;
  for (const [field, put] of Object.entries(FIELDS)) for (const p of PAYLOADS) {
    const item = buildItem(env.runId, { suffix: `-xss${env.uniq('x')}`, status: 'draft', mutate: (i) => put(i, p) });
    const r = await author.req(importer.method, importer.path, { body: { item } });
    if (r.status >= 400 && r.status < 500) continue; // rejected at the boundary (D4)
    if (!ok2xx(r.status)) { problems.push(`${field} ${JSON.stringify(p)}: unexpected ${r.status}`); continue; }
    accepted++;
    const preview = await author.req('GET', fillPath(byId['ADM-04'].path, { itemId: r.json?.itemId }));
    servedAsData(preview, p, `${field} ${JSON.stringify(p)} preview`, problems);
  }
  if (accepted) t.diagnostic(`NOT VERIFIED: ${accepted} payload(s) were accepted; browser rendering of the Answer Replay transcript is not tested yet (no UI).`);
  assert.deepEqual(problems, []);
});

liveTest('XSS-02: learner text (item report, settings) is stored as data and served back only as JSON', async (t, env) => {
  const text = matrix.endpoints.filter((e) => has(e, 'acceptsUserText') && ['REP-01', 'ME-02'].includes(e.id));
  assert.equal(text.length, 2, 'REP-01 and ME-02 must be flagged acceptsUserText');
  const learner = await env.user('learner', 'learner-a');
  const author = await env.user('content_author', 'author-1');
  const problems = [];
  let accepted = 0;
  for (const p of PAYLOADS) {
    const marked = `${p} ${env.uniq('R')}`;
    const rep = await learner.req('POST', fillPath(byId['REP-01'].path, { itemId: env.items.p1 }), { body: { text: marked } });
    if (ok2xx(rep.status)) {
      accepted++;
      const view = matrix.endpoints.filter((e) => has(e, 'rendersUserText'));
      for (const e of view) servedAsData(await author.req(e.method, e.path), marked, `${e.id} report ${JSON.stringify(p)}`, problems);
    } else if (rep.status >= 500) problems.push(`REP-01 ${JSON.stringify(p)}: ${rep.status}`);
    const set = await learner.req('PATCH', byId['ME-02'].path, { body: { displayName: p } });
    if (ok2xx(set.status)) { accepted++; servedAsData(await learner.req('GET', byId['ME-01'].path), p, `ME-01 settings ${JSON.stringify(p)}`, problems); }
    else if (set.status >= 500) problems.push(`ME-02 ${JSON.stringify(p)}: ${set.status}`);
  }
  if (accepted) t.diagnostic(`NOT VERIFIED: ${accepted} payload(s) stored as data; browser rendering on the staff report and settings screens is not tested yet (no UI).`);
  assert.deepEqual(problems, []);
});

liveTest('XSS-03: every API response is JSON (or audio) with nosniff; the page has a strict CSP', async (t, env) => {
  const problems = [];
  const learner = await env.user('learner', 'learner-a');
  const author = await env.user('content_author', 'author-1');
  const att = await env.startAttempt(learner, 'p1', 'guided');
  for (const e of matrix.endpoints) {
    if (e.method !== 'GET') continue;
    for (const [who, a] of [['anonymous', env.anonymous()], ['learner', learner], ['author', author]]) {
      const r = await a.req('GET', fillPath(e.path, { attemptId: att.id, itemId: env.items.p1, userId: learner.userId }));
      const type = r.headers.get('content-type') ?? '';
      if (r.bytes.length && !isJson(r) && !(has(e, 'examSingleUse') && /^audio\//.test(type))) problems.push(`${e.id} as ${who}: content-type ${type || '(none)'}`);
      if (!nosniff(r)) problems.push(`${e.id} as ${who} (${r.status}): no nosniff`);
    }
  }
  const notFound = await learner.req('GET', `/no-such-endpoint-${env.runId}`);
  if (notFound.bytes.length && /html/i.test(notFound.headers.get('content-type') ?? '') && notFound.text.includes(env.runId)) problems.push('404 page reflects the request path as HTML');
  const page = await env.anonymous().req('GET', '/');
  const csp = page.headers.get('content-security-policy');
  if (!csp) problems.push('GET / has no Content-Security-Policy header');
  else {
    const directive = (name) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(name + ' '));
    const script = directive('script-src') ?? directive('default-src');
    if (!script) problems.push('CSP has neither script-src nor default-src');
    else if (/'unsafe-inline'|'unsafe-eval'|(^|\s)\*(\s|$)|(^|\s)(https?:|data:)(\s|$)/.test(script)) problems.push(`CSP script policy too loose: ${script}`);
    if (!directive('object-src') && !/'none'/.test(directive('default-src') ?? '')) problems.push("CSP should set object-src 'none'");
  }
  assert.deepEqual(problems, []);
});
