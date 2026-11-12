// EXAM-02..EXAM-07 (docs/security/test-plan.md, CODING_STANDARDS 2.3, owner decisions D9 and D10).
// Requests are sent straight to the API, bypassing any UI. Live suite: needs SECURITY_BASE_URL.
// Matrix-driven: exam-forbidden actions come from the `examForbidden` flag, exam audio from `examSingleUse`.
import assert from 'node:assert/strict';
import { liveTest, matrix, has, fillPath, ok2xx } from './lib/live.mjs';

const byId = Object.fromEntries(matrix.endpoints.map((e) => [e.id, e]));
const examForbidden = matrix.endpoints.filter((e) => has(e, 'examForbidden'));
const examAudio = matrix.endpoints.filter((e) => has(e, 'examSingleUse'));
const REFUSED = [403, 409, 410, 416, 422];
const isAudio = (r) => /^audio\//.test(r.headers.get('content-type') ?? '');
const bodyFor = (env, e) => (/hints$/.test(e.path) ? { questionId: env.questionIds[0] } : {});
const call = (env, actor, e, attemptId, opts = {}) => actor.req(e.method, fillPath(e.path, { attemptId }), { body: e.method === 'GET' ? undefined : bodyFor(env, e), ...opts });

async function examForbiddenCase(env, kind) {
  const targets = examForbidden.filter((e) => e.path.endsWith(kind));
  assert.ok(targets.length > 0, `no examForbidden endpoint for ${kind} in the matrix`);
  const problems = [];
  for (const e of targets) {
    // positive control: allowed in guided practice (otherwise a server that refuses everything would pass)
    const g = await env.user('learner', 'guided-control');
    const ga = await env.startAttempt(g, 'p1', 'guided');
    const gr = await call(env, g, e, ga.id);
    if (!ok2xx(gr.status)) problems.push(`${e.id} guided control: expected 2xx, got ${gr.status}`);
    // abuse: the same request in an exam attempt
    const a = await env.user('learner', 'learner-a');
    const att = await env.startAttempt(a, 'p1', 'exam');
    const before = (await env.readAttempt(a, att.id)).supportUsage;
    const r = await call(env, a, e, att.id);
    if (!REFUSED.includes(r.status)) problems.push(`${e.id} in exam: expected 403/409, got ${r.status}`);
    if (env.canaryRe.test(r.text)) problems.push(`${e.id} in exam: support content (canary) in the body`);
    if (isAudio(r)) problems.push(`${e.id} in exam: audio served`);
    const after = (await env.readAttempt(a, att.id)).supportUsage;
    if (JSON.stringify(after) !== JSON.stringify(before)) problems.push(`${e.id} in exam: support usage changed ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  }
  return problems;
}

liveTest('EXAM-02: replay requested directly in an exam attempt is refused; support usage unchanged; no audio', async (t, env) => {
  assert.deepEqual(await examForbiddenCase(env, '/replays'), []);
});

liveTest('EXAM-03: hint requested directly in an exam attempt is refused; no hint content returned', async (t, env) => {
  assert.deepEqual(await examForbiddenCase(env, '/hints'), []);
});

liveTest('EXAM-04: exam audio is one forward-only stream per attempt (D9)', async (t, env) => {
  assert.ok(examAudio.length > 0, 'matrix has no examSingleUse endpoint');
  const problems = [];
  const expectRefused = (r, what) => { if (!REFUSED.includes(r.status) || isAudio(r)) problems.push(`${what}: expected refusal without audio, got ${r.status} ${r.headers.get('content-type')}`); };
  for (const e of examAudio) {
    // guided control: audio can be fetched more than once
    const g = await env.user('learner', 'guided-control');
    const ga = await env.startAttempt(g, 'p1', 'guided');
    for (const n of [1, 2]) { const r = await call(env, g, e, ga.id); if (!ok2xx(r.status) || !isAudio(r)) problems.push(`${e.id} guided fetch ${n}: expected audio, got ${r.status}`); }

    // 1) forward resume allowed; second full request and rewind refused
    const a = await env.user('learner', 'learner-a');
    const att = await env.startAttempt(a, 'p1', 'exam');
    const first = await call(env, a, e, att.id, { headers: { range: 'bytes=0-99' } });
    if (!ok2xx(first.status) || first.bytes.length !== 100) problems.push(`${e.id} first chunk: expected 206 with 100 bytes, got ${first.status}/${first.bytes.length}`);
    const resume = await call(env, a, e, att.id, { headers: { range: 'bytes=100-' } });
    if (!ok2xx(resume.status) || !isAudio(resume)) problems.push(`${e.id} forward resume from byte 100: expected 206, got ${resume.status}`);
    expectRefused(await call(env, a, e, att.id), `${e.id} second full request`);
    expectRefused(await call(env, a, e, att.id, { headers: { range: 'bytes=0-' } }), `${e.id} rewind to byte 0`);
    expectRefused(await call(env, a, e, att.id, { headers: { range: 'bytes=50-60' } }), `${e.id} rewind to byte 50`);

    // 2) a new session for the same user cannot start a second stream
    const b = await env.user('learner', 'learner-b');
    const bt = await env.startAttempt(b, 'p1', 'exam');
    await call(env, b, e, bt.id, { headers: { range: 'bytes=0-99' } });
    const b2 = env.anonymous('learner-b-second-session'); b2.email = b.email; b2.password = b.password;
    await env.signIn(b2);
    expectRefused(await call(env, b2, e, bt.id, { headers: { range: 'bytes=100-' } }), `${e.id} from a new session`);

    // 3) after the grant ends (audio duration + 10 s), even a forward resume is refused
    const c = await env.user('learner', 'learner-c');
    const ct = await env.startAttempt(c, 'p1', 'exam');
    await call(env, c, e, ct.id, { headers: { range: 'bytes=0-9' } });
    await env.advanceClock(env.durationSec + 11);
    expectRefused(await call(env, c, e, ct.id, { headers: { range: 'bytes=10-' } }), `${e.id} after the grant ended`);
  }
  t.diagnostic('Recording the audio on the learner device cannot be prevented by any server (accepted risk, D9).');
  assert.deepEqual(problems, []);
});

liveTest('EXAM-05: late writes are refused (or marked late) and client time fields are ignored', async (t, env) => {
  const a = await env.user('learner', 'learner-a');
  const att = await env.startAttempt(a, 'p1', 'exam');
  const problems = [];
  const original = (await env.readAttempt(a, att.id)).deadline;
  assert.ok(original, 'exam attempt must have a server-side deadline');
  const q = env.questionIds;
  // positive control: a normal save before the deadline works
  const save = await a.req('PUT', fillPath(byId['ATT-04'].path, { attemptId: att.id }), { body: { answers: { [q[0]]: 'A' } } });
  if (!ok2xx(save.status)) problems.push(`save before deadline: expected 2xx, got ${save.status}`);
  // client time fields
  const far = new Date(Date.parse(original) + 365 * 24 * 3600_000).toISOString();
  await a.req('PUT', fillPath(byId['ATT-04'].path, { attemptId: att.id }), { body: { answers: { [q[0]]: 'A' }, deadline: far, timeRemaining: 999999, clientTime: far } });
  const afterFields = await env.readAttempt(a, att.id);
  if (afterFields.deadline !== original) problems.push(`client deadline honoured: ${original} -> ${afterFields.deadline}`);
  // late write and late submit
  await env.advanceClock(Math.ceil((Date.parse(original) - (await env.serverNow())) / 1000) + 1);
  const late = await a.req('PUT', fillPath(byId['ATT-04'].path, { attemptId: att.id }), { body: { answers: { [q[1]]: 'D' }, clientTime: original } });
  const sub = await a.req('POST', fillPath(byId['ATT-05'].path, { attemptId: att.id }), { body: {} });
  const state = await env.readAttempt(a, att.id);
  const lateMarked = state.late === true;
  if (ok2xx(late.status) && !lateMarked) problems.push(`answer saved after the deadline (${late.status}) and attempt not marked late`);
  if (!ok2xx(late.status) && state.answers?.[q[1]] === 'D') problems.push('late answer refused but stored anyway');
  if (ok2xx(sub.status) && !lateMarked) problems.push(`submit after the deadline accepted (${sub.status}) and attempt not marked late`);
  assert.deepEqual(problems, []);
});

liveTest('EXAM-06: attempt mode is immutable and no guided attempt can be opened beside an open exam (D10)', async (t, env) => {
  const a = await env.user('learner', 'learner-a');
  const att = await env.startAttempt(a, 'p1', 'exam');
  const problems = [];
  const patch = await a.req('PATCH', `/attempts/${att.id}`, { body: { mode: 'guided' } });
  if (ok2xx(patch.status)) problems.push(`PATCH mode returned ${patch.status}`);
  await a.req('PUT', fillPath(byId['ATT-04'].path, { attemptId: att.id }), { body: { answers: {}, mode: 'guided' } });
  if ((await env.readAttempt(a, att.id)).mode !== 'exam') problems.push('exam attempt mode changed');
  const second = await a.req('POST', byId['ATT-01'].path, { body: { itemId: env.items.p1, mode: 'guided' } });
  if (ok2xx(second.status)) {
    problems.push(`guided attempt opened beside an open exam (${second.status})`);
    const rev = await a.req('GET', fillPath(byId['ATT-09'].path, { attemptId: second.json?.id }));
    if (env.canaryRe.test(rev.text)) problems.push('review readable through the second attempt');
  } else if (second.status !== 409 && second.status !== 403) problems.push(`second open attempt: expected 409, got ${second.status}`);
  const rev = await a.req('GET', fillPath(byId['ATT-09'].path, { attemptId: att.id }));
  if (env.canaryRe.test(rev.text)) problems.push('review of the open exam readable');
  assert.deepEqual(problems, []);
});

liveTest('EXAM-07: no parallel exam attempts; an exam after a seen item is flagged seenBefore and not counted (D10)', async (t, env) => {
  const problems = [];
  // parallel
  const a = await env.user('learner', 'learner-a');
  const both = await Promise.all([0, 1].map(() => a.req('POST', byId['ATT-01'].path, { body: { itemId: env.items.p2, mode: 'exam' } })));
  const created = both.filter((r) => ok2xx(r.status)).length;
  if (created !== 1) problems.push(`parallel exam attempts on one item: ${created} created (expected exactly 1)`);
  // fresh item: counts (positive control)
  const c = await env.user('learner', 'learner-c');
  const fresh = await env.startAttempt(c, 'p2', 'exam');
  if (fresh.seenBefore !== false || fresh.countsTowardIndependentReadiness !== true) problems.push(`unseen exam: expected seenBefore=false and counted, got ${fresh.seenBefore}/${fresh.countsTowardIndependentReadiness}`);
  // guided -> review -> exam on the same item
  const b = await env.user('learner', 'learner-b');
  const g = await env.startAttempt(b, 'p2', 'guided');
  await env.saveWrongAnswers(b, g.id);
  await env.submit(b, g.id);
  const rev = await b.req('GET', fillPath(byId['ATT-09'].path, { attemptId: g.id }));
  if (rev.status !== 200) problems.push(`review after guided submit: expected 200, got ${rev.status}`);
  const exam = await env.startAttempt(b, 'p2', 'exam');
  const state = await env.readAttempt(b, exam.id);
  if (state.seenBefore !== true) problems.push(`exam after review: seenBefore is ${state.seenBefore}`);
  if (state.countsTowardIndependentReadiness !== false) problems.push(`exam after review counts toward independent readiness (${state.countsTowardIndependentReadiness})`);
  assert.deepEqual(problems, []);
});
