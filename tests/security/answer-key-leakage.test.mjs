// LEAK-02..LEAK-08 (docs/security/test-plan.md, CODING_STANDARDS 2.2, owner decision D6).
// Live suite: needs SECURITY_BASE_URL; otherwise every case is skipped as NOT VERIFIED.
// Matrix-driven: delivery endpoints come from the `deliveryPayload` flag, review endpoints from `returnsAnswerData`.
import assert from 'node:assert/strict';
import { liveTest, matrix, has, fillPath, ok2xx } from './lib/live.mjs';

const delivery = matrix.endpoints.filter((e) => has(e, 'deliveryPayload') && e.method === 'GET');
const learnerReview = matrix.endpoints.filter((e) => has(e, 'returnsAnswerData') && !e.path.startsWith('/admin/'));

async function scanDelivery(env, actor, attemptId, problems, label) {
  for (const e of delivery) {
    const r = await actor.req('GET', fillPath(e.path, { itemId: env.items.p1, attemptId }));
    if (!ok2xx(r.status)) problems.push(`${label} ${e.id} ${r.method} ${r.path}: expected 2xx for the owner, got ${r.status}`);
    problems.push(...env.findLeaks(r).map((x) => `${label} ${e.id} ${x}`));
  }
}

liveTest('LEAK-02: guided attempt, every deliveryPayload endpoint before submit carries no answer data', async (t, env) => {
  assert.ok(delivery.length > 0, 'matrix has no deliveryPayload endpoints');
  const a = await env.user('learner', 'learner-a');
  const att = await env.startAttempt(a, 'p1', 'guided');
  const problems = [];
  await scanDelivery(env, a, att.id, problems, 'fresh');
  await env.saveWrongAnswers(a, att.id);
  await scanDelivery(env, a, att.id, problems, 'after-save');
  assert.deepEqual(problems, []);
});

liveTest('LEAK-03: exam attempt, no answer data or transcript before submit, including after answers are saved and after the deadline', async (t, env) => {
  const a = await env.user('learner', 'learner-a');
  const att = await env.startAttempt(a, 'p1', 'exam');
  const problems = [];
  await scanDelivery(env, a, att.id, problems, 'fresh');
  await env.saveWrongAnswers(a, att.id);
  await scanDelivery(env, a, att.id, problems, 'after-save');
  const state = await env.readAttempt(a, att.id);
  assert.ok(state.deadline, 'an exam attempt must expose its server-side deadline');
  await env.advanceClock(Math.ceil((Date.parse(state.deadline) - (await env.serverNow())) / 1000) + 1);
  await scanDelivery(env, a, att.id, problems, 'after-deadline');
  assert.deepEqual(problems, []);
});

liveTest('LEAK-04: review endpoints before submit are refused in both modes and carry no canary', async (t, env) => {
  assert.ok(learnerReview.length > 0, 'matrix has no learner-facing returnsAnswerData endpoint');
  const problems = [];
  for (const mode of ['guided', 'exam']) {
    const a = await env.user('learner', `learner-${mode}`);
    const att = await env.startAttempt(a, 'p1', mode);
    await env.saveWrongAnswers(a, att.id);
    for (const e of learnerReview) {
      const r = await a.req(e.method, fillPath(e.path, { attemptId: att.id, itemId: env.items.p1 }));
      if (![403, 404, 409].includes(r.status)) problems.push(`${mode} ${e.id}: expected 403/404/409 before submit, got ${r.status}`);
      if (env.canaryRe.test(r.text)) problems.push(`${mode} ${e.id}: canary in refused response`);
    }
  }
  assert.deepEqual(problems, []);
});

liveTest('LEAK-05: page assets carry no canary and no source map is served', async (t, env) => {
  const anon = env.anonymous();
  const page = await anon.req('GET', '/');
  assert.equal(page.status, 200, 'GET / must serve the app page');
  const assets = [...page.text.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="(\/[^"#?]+)/gi)].map((m) => m[1]);
  const problems = [];
  if (env.canaryRe.test(page.text)) problems.push('canary in /');
  for (const p of assets) {
    const r = await anon.req('GET', p);
    if (env.canaryRe.test(r.text)) problems.push(`canary in ${p}`);
    if (/sourceMappingURL=/.test(r.text)) problems.push(`${p} references a source map`);
    const map = await anon.req('GET', `${p}.map`);
    if (map.status === 200) problems.push(`source map served at ${p}.map`);
  }
  t.diagnostic(`scanned ${assets.length} asset(s) linked from /. A canary only appears in a bundle built with the content bank: for the real app, also run this after a build that includes seeded items (otherwise this part is NOT VERIFIED).`);
  assert.deepEqual(problems, []);
});

liveTest('LEAK-06: attempt ids are random (>=122 bits) and guessed review URLs return 404', async (t, env) => {
  const a = await env.user('learner', 'learner-a');
  const b = await env.user('learner', 'learner-b');
  const ids = [(await env.startAttempt(a, 'p1', 'guided')).id, (await env.startAttempt(b, 'p1', 'guided')).id];
  const problems = [];
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const longRandom = /^[A-Za-z0-9_-]{21,}$/; // >= 126 bits if base64url
  for (const id of ids) if (!uuidV4.test(id) && !(longRandom.test(id) && !/^\d+$/.test(id))) problems.push(`attempt id ${JSON.stringify(id)} is not a UUIDv4 or >=21-char random token`);
  await env.submit(a, ids[0]);
  const guesses = [env.items.p1, 'review', '1', '0'];
  if (/^\d+$/.test(ids[0])) guesses.push(String(Number(ids[0]) + 1), String(Number(ids[0]) - 1));
  for (const e of learnerReview) for (const g of guesses) {
    const r = await b.req(e.method, fillPath(e.path, { attemptId: g }));
    if (r.status !== 404 && r.status !== 403) problems.push(`${e.id} with guessed id ${g}: expected 404, got ${r.status}`);
    if (env.canaryRe.test(r.text)) problems.push(`${e.id} with guessed id ${g}: canary in body`);
  }
  // learner-b guessing learner-a's submitted attempt (sequential ids make this trivial)
  const guessed = await b.req('GET', `/attempts/${ids[0]}/review`);
  if (env.canaryRe.test(guessed.text)) problems.push("learner-b read learner-a's review");
  assert.deepEqual(problems, []);
});

liveTest('LEAK-07: error responses (bad answer format, wrong mode, unknown question) carry no answer data', async (t, env) => {
  const a = await env.user('learner', 'learner-a');
  const exam = await env.startAttempt(a, 'p1', 'exam');
  const q = env.questionIds[0];
  const bad = [
    ['PUT', `/attempts/${exam.id}/answers`, { answers: { [q]: 'Z' } }],
    ['PUT', `/attempts/${exam.id}/answers`, { answers: { [q]: 12345 } }],
    ['PUT', `/attempts/${exam.id}/answers`, { answers: { [q]: ['A'] } }],
    ['PUT', `/attempts/${exam.id}/answers`, { answers: 'C' }],
    ['PUT', `/attempts/${exam.id}/answers`, { answers: { 'no-such-question': 'A' } }],
    ['PUT', `/attempts/${exam.id}/answers`, undefined, '{not json'],
    ['POST', `/attempts/${exam.id}/hints`, { questionId: q }],
    ['POST', `/attempts/${exam.id}/replays`, {}],
    ['GET', `/attempts/${exam.id}/review`],
    ['GET', `/items/not-an-item`],
  ];
  const problems = [];
  let errors = 0;
  for (const [m, p, body, rawBody] of bad) {
    const r = await a.req(m, p, rawBody ? { rawBody, headers: { 'content-type': 'application/json' } } : { body });
    if (r.status >= 400) errors++;
    problems.push(...env.findLeaks(r));
  }
  assert.ok(errors >= bad.length - 1, `expected the malformed requests to be refused; only ${errors}/${bad.length} returned 4xx`);
  assert.deepEqual(problems, []);
});

liveTest('LEAK-08 (positive control): after submit, review carries the authored route and transcript', async (t, env) => {
  const problems = [];
  for (const mode of ['guided', 'exam']) {
    const a = await env.user('learner', `learner-${mode}`);
    const att = await env.startAttempt(a, 'p1', mode);
    await env.saveWrongAnswers(a, att.id);
    await env.submit(a, att.id);
    for (const e of learnerReview) {
      const r = await a.req(e.method, fillPath(e.path, { attemptId: att.id }));
      if (r.status !== 200) { problems.push(`${mode} ${e.id}: expected 200 after submit, got ${r.status}`); continue; }
      if (!new RegExp(`CANARY-TRANSCRIPT-${env.runId}`).test(r.text)) problems.push(`${mode} ${e.id}: transcript missing from review`);
      if (!/"(route|events)"/.test(r.text)) problems.push(`${mode} ${e.id}: authored route missing from review`);
      for (const [qid, label] of Object.entries(env.answers)) if (!r.text.includes(`"${label}"`)) problems.push(`${mode} ${e.id}: correct answer for ${qid} missing`);
    }
  }
  assert.deepEqual(problems, []);
});
