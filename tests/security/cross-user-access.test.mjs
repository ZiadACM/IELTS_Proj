// AUTHZ-03, AUTHZ-04, AUTHZ-05, AUTHZ-07, AUTHZ-08 (docs/security/test-plan.md, CODING_STANDARDS 2.1, owner decision D5).
// Covers learner vs learner, guest vs guest, guest vs learner and back, anonymous access and mass assignment.
// Live suite: needs SECURITY_BASE_URL. Matrix-driven by `ownerScoped`, `massAssignmentRisk` and the anonymous column.
import assert from 'node:assert/strict';
import { liveTest, matrix, has, fillPath, ok2xx, DENIED_WITH_SESSION } from './lib/live.mjs';

const byId = Object.fromEntries(matrix.endpoints.map((e) => [e.id, e]));
const attemptScoped = matrix.endpoints.filter((e) => has(e, 'ownerScoped') && e.path.includes('{attemptId}'));
const meScoped = matrix.endpoints.filter((e) => has(e, 'ownerScoped') && /^\/me(\/|$)/.test(e.path));
const massAssign = matrix.endpoints.filter((e) => has(e, 'massAssignmentRisk'));
const anonDenied = matrix.endpoints.filter((e) => e.access.anonymous === 'deny');

// A body the endpoint would accept from its owner. Unknown endpoints fail closed so new rows get a recipe.
function ownerBody(env, e) {
  if (e.method === 'GET' || e.method === 'DELETE') return undefined;
  const recipes = {
    'AUTH-01': { email: env.email('signup'), password: env.newPassword() },
    'AUTH-02': { email: env.email('nobody'), password: env.newPassword() },
    'AUTH-04': { email: env.email('nobody') },
    'AUTH-05': {},
    'ME-02': { displayName: 'synthetic' },
    'REP-01': { text: 'synthetic report' },
    'ATT-01': { itemId: env.items.p3, mode: 'guided' },
    'ATT-04': { answers: { [env.questionIds[0]]: 'D' } },
    'ATT-05': {},
    'ATT-07': {},
    'ATT-08': { questionId: env.questionIds[0] },
    'ADM-02': { item: { id: env.uniq('import') } },
    'ADM-03': { item: { id: env.uniq('edit') } },
    'ADM-05': {},
    'ADM-07': { roles: ['content_author'] },
  };
  assert.ok(e.id in recipes, `no request recipe for ${e.id} in cross-user-access.test.mjs; add one (fail closed)`);
  return recipes[e.id];
}

async function victimWithData(env, role, name) {
  const v = await env.actor(role, name);
  const marker = env.uniq(`OWNER-${name}`);
  const s = await v.req('PATCH', byId['ME-02'].path, { body: { displayName: marker } });
  assert.ok(ok2xx(s.status), `${name} could not set settings: ${s.status}`);
  const open = await env.startAttempt(v, 'p1', 'guided');
  await env.saveWrongAnswers(v, open.id);
  const done = await env.startAttempt(v, 'p2', 'guided');
  await env.saveWrongAnswers(v, done.id);
  await env.submit(v, done.id);
  return { actor: v, marker, open: open.id, submitted: done.id };
}
const snapshot = async (env, v) => {
  const s = {};
  for (const id of [v.open, v.submitted]) { const a = await env.readAttempt(v.actor, id); s[id] = { status: a.status, answers: a.answers, supportUsage: a.supportUsage, mode: a.mode }; }
  return JSON.stringify(s);
};

liveTest('AUTHZ-03: another user\'s attempt ids are refused on every ownerScoped endpoint (learner, guest and mixed pairs)', async (t, env) => {
  assert.ok(attemptScoped.length > 0, 'matrix has no ownerScoped {attemptId} endpoints');
  const pairs = [['learner', 'learner'], ['guest', 'guest'], ['guest', 'learner'], ['learner', 'guest']];
  const problems = [];
  for (const [attRole, vicRole] of pairs) {
    const label = `${attRole}-b -> ${vicRole}-a`;
    const victim = await victimWithData(env, vicRole, `${vicRole}-a`);
    const attacker = await env.actor(attRole, `${attRole}-b`);
    const before = await snapshot(env, victim);
    for (const e of attemptScoped) {
      for (const attemptId of [victim.open, victim.submitted]) {
        const r = await attacker.req(e.method, fillPath(e.path, { attemptId }), { body: ownerBody(env, e) });
        if (!DENIED_WITH_SESSION.includes(r.status)) problems.push(`${label} ${e.id} ${r.method} ${r.path}: expected 404/403, got ${r.status}`);
        if (env.canaryRe.test(r.text) || r.text.includes(victim.marker) || (ok2xx(r.status) && r.text.includes(attemptId))) problems.push(`${label} ${e.id}: victim data in the body`);
      }
    }
    if ((await snapshot(env, victim)) !== before) problems.push(`${label}: victim's attempts changed`);
  }
  assert.deepEqual(problems, []);
});

liveTest('AUTHZ-04: /me endpoints ignore a userId override in the query, a header or the body', async (t, env) => {
  assert.ok(meScoped.length > 0, 'matrix has no ownerScoped /me endpoints');
  const problems = [];
  for (const role of ['learner', 'guest']) {
    const victim = await victimWithData(env, role, `${role}-a`);
    const attacker = await victimWithData(env, role, `${role}-b`);
    const vid = victim.actor.userId;
    assert.ok(vid, `${role}-a has no userId (guest-sessions and test-support must return userId)`);
    const variants = [
      { name: 'query', path: (p) => `${p}?userId=${encodeURIComponent(vid)}`, headers: {}, body: {} },
      { name: 'header', path: (p) => p, headers: { 'x-user-id': vid }, body: {} },
      { name: 'body', path: (p) => p, headers: {}, body: { userId: vid } },
    ];
    const order = [...meScoped.filter((e) => e.method !== 'DELETE'), ...meScoped.filter((e) => e.method === 'DELETE')];
    for (const e of order) {
      for (const v of variants) {
        if (e.method === 'DELETE' && v.name !== 'query') continue; // the attacker deletes itself only once
        const base = e.method === 'PATCH' ? { displayName: `HIJACK-${env.runId}` } : ownerBody(env, e);
        const body = e.method === 'GET' || e.method === 'DELETE' ? undefined : { ...base, ...v.body };
        const r = await attacker.actor.req(e.method, v.path(e.path), { body, headers: v.headers });
        if (r.text.includes(victim.marker) || r.text.includes(victim.open) || r.text.includes(victim.submitted)) problems.push(`${role} ${e.id} via ${v.name}: victim data returned`);
      }
    }
    const vs = await victim.actor.req('GET', byId['ME-01'].path);
    if (vs.status !== 200) problems.push(`${role}: victim lost access to own settings (${vs.status}): the override acted on the victim`);
    else if (!vs.text.includes(victim.marker) || vs.text.includes(`HIJACK-${env.runId}`)) problems.push(`${role}: victim settings were changed through an override`);
  }
  assert.deepEqual(problems, []);
});

liveTest('AUTHZ-05: with no session every anonymous-denied endpoint returns 401 and no data', async (t, env) => {
  const victim = await victimWithData(env, 'learner', 'learner-a');
  const anon = env.anonymous();
  const problems = [];
  for (const e of anonDenied) {
    const attemptId = e.id === 'ATT-09' ? victim.submitted : victim.open;
    const r = await anon.req(e.method, fillPath(e.path, { attemptId, itemId: env.items.p1, userId: victim.actor.userId }), { body: ownerBody(env, e) });
    if (r.status !== 401) problems.push(`${e.id} ${r.method} ${r.path}: expected 401, got ${r.status}`);
    if (env.canaryRe.test(r.text) || r.text.includes(victim.marker) || r.text.includes(attemptId)) problems.push(`${e.id}: data in the body`);
  }
  assert.deepEqual(problems, []);
});

liveTest('AUTHZ-07: extra fields on massAssignmentRisk endpoints are ignored or rejected; stored state unchanged', async (t, env) => {
  assert.ok(massAssign.length > 0, 'matrix has no massAssignmentRisk endpoints');
  const problems = [];
  const victim = await victimWithData(env, 'learner', 'victim');
  const extras = (o) => ({ ...o, userId: victim.actor.userId, score: 3, isCorrect: true, role: 'admin', roles: ['admin'], status: 'submitted', validation: { status: 'published' } });
  const checks = {
    'ME-02': async () => {
      const a = await env.user('learner', 'learner-a');
      await a.req('PATCH', byId['ME-02'].path, { body: extras({ displayName: 'x' }) });
      const stored = await env.supportOk('GET', `/users/${encodeURIComponent(a.userId)}`);
      if (stored.role !== 'learner') problems.push(`ME-02: stored role changed to ${stored.role} through settings`);
      const adm = await a.req('GET', byId['ADM-01'].path);
      if (ok2xx(adm.status)) problems.push('ME-02: learner gained a staff role through settings');
    },
    'ATT-01': async () => {
      const a = await env.user('learner', 'learner-a');
      const r = await a.req('POST', byId['ATT-01'].path, { body: { ...extras({ itemId: env.items.p1, mode: 'exam' }), deadline: '2100-01-01T00:00:00.000Z', seenBefore: false } });
      if (!ok2xx(r.status)) return;
      const s = await env.readAttempt(a, r.json.id);
      if (s.status !== 'open' || s.score !== undefined) problems.push(`ATT-01: client set status/score (${s.status}/${s.score})`);
      if (s.deadline && Date.parse(s.deadline) > (await env.serverNow()) + 24 * 3600_000) problems.push('ATT-01: client set the exam deadline');
      const vl = await victim.actor.req('GET', byId['ATT-02'].path);
      if (vl.text.includes(r.json.id)) problems.push('ATT-01: attempt created for another user');
    },
    'ATT-04': async () => {
      const a = await env.user('learner', 'learner-a');
      const att = await env.startAttempt(a, 'p1', 'exam');
      await a.req('PUT', fillPath(byId['ATT-04'].path, { attemptId: att.id }), { body: { ...extras({ answers: { [env.questionIds[0]]: 'A' } }), mode: 'guided' } });
      const s = await env.readAttempt(a, att.id);
      if (s.status !== 'open' || s.mode !== 'exam' || s.score !== undefined) problems.push(`ATT-04: stored state changed (status ${s.status}, mode ${s.mode}, score ${s.score})`);
    },
    'ATT-05': async () => {
      const a = await env.user('learner', 'learner-a');
      const att = await env.startAttempt(a, 'p1', 'guided');
      await env.saveWrongAnswers(a, att.id);
      let r = await a.req('POST', fillPath(byId['ATT-05'].path, { attemptId: att.id }), { body: extras({}) });
      if (!ok2xx(r.status)) r = await a.req('POST', fillPath(byId['ATT-05'].path, { attemptId: att.id }), { body: {} });
      const s = await env.readAttempt(a, att.id);
      if (s.score !== 0) problems.push(`ATT-05: score ${s.score} for all-wrong answers (client score accepted)`);
    },
    'ADM-07': async () => {
      const admin = await env.user('admin', 'admin-1');
      const target = await env.user('learner', 'target');
      await admin.req('PUT', fillPath(byId['ADM-07'].path, { userId: target.userId }), { body: { roles: ['content_author'], email: env.email('hijack'), password: env.newPassword(), userId: admin.userId } });
      const again = env.anonymous('target-again'); again.email = target.email; again.password = target.password;
      const r = await again.req('POST', byId['AUTH-02'].path, { body: { email: target.email, password: target.password } });
      if (!ok2xx(r.status)) problems.push(`ADM-07: extra fields changed the target's credentials (sign-in ${r.status})`);
    },
  };
  for (const e of massAssign) {
    if (!checks[e.id]) { problems.push(`${e.id}: no mass-assignment check in cross-user-access.test.mjs (fail closed)`); continue; }
    await checks[e.id]();
  }
  const vs = await victim.actor.req('GET', byId['ME-01'].path);
  if (!vs.text.includes(victim.marker)) problems.push('victim settings changed');
  assert.deepEqual(problems, []);
});

liveTest('AUTHZ-08: progress and recommendations cannot be written by the client; the server computes the score', async (t, env) => {
  const a = await env.user('learner', 'learner-a');
  const problems = [];
  const readOnly = matrix.endpoints.filter((e) => ['progress', 'recommendation'].includes(e.resource));
  for (const e of readOnly) if (e.method !== 'GET') problems.push(`matrix lists a write endpoint for ${e.resource}: ${e.id}`);
  const before = (await a.req('GET', byId['PROG-01'].path)).text;
  for (const e of readOnly) for (const m of ['PUT', 'PATCH', 'POST']) {
    const r = await a.req(m, e.path, { body: { independentReadiness: { examAttemptsCounted: 99 }, attemptsSubmitted: 99, next: 'x' } });
    if (![403, 404, 405].includes(r.status)) problems.push(`${m} ${e.path}: expected 404/405, got ${r.status}`);
  }
  if ((await a.req('GET', byId['PROG-01'].path)).text !== before) problems.push('progress changed after client writes');
  const att = await env.startAttempt(a, 'p1', 'guided');
  await env.saveWrongAnswers(a, att.id);
  let r = await a.req('POST', fillPath(byId['ATT-05'].path, { attemptId: att.id }), { body: { score: 3 } });
  if (!ok2xx(r.status)) r = await a.req('POST', fillPath(byId['ATT-05'].path, { attemptId: att.id }), { body: {} });
  if ((await env.readAttempt(a, att.id)).score !== 0) problems.push('client-computed score accepted on submit');
  assert.deepEqual(problems, []);
});
