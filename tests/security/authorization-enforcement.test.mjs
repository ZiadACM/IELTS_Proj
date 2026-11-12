// AUTHZ-06 (docs/security/test-plan.md): every role calls every endpoint; the status must match the matrix cell.
// Also exercises each decision's condition (CONTENT-02 for `published`, state checks for own-open, own-open-guided,
// own-submitted and draft-only), so a server that ignores the condition fails. Each cell uses a fresh synthetic actor.
// Live suite: needs SECURITY_BASE_URL. Every matrix row needs a recipe below; a new row without one fails closed.
import assert from 'node:assert/strict';
import { liveTest, matrix, fillPath, ok2xx, buildItem, DENIED_WITH_SESSION } from './lib/live.mjs';

const roles = Object.keys(matrix.roles);

// For a caller, build the request that the cell's decision would ALLOW (the caller's own resource, in the right state).
// The deny check then proves the server refuses even the most favourable request.
async function prepare(env, e, role, actor, allowed) {
  let owner = role === 'anonymous' ? await env.user('learner', `owner-of-${e.id}`) : actor;
  // one attempt per item (D10): the main request uses p1, the negative variants use p2 (submitted) or p3 (exam)
  // A role that may not drive an attempt itself (admin cannot save or submit, D7) is denied anyway; its deny check
  // then uses a learner's attempt. For an allowed cell a setup failure is a real failure.
  const ownAttempt = async (itemKey, mode = 'guided', submitted = false) => {
    try {
      const at = await env.startAttempt(owner, itemKey, mode);
      if (submitted) { await env.saveWrongAnswers(owner, at.id); await env.submit(owner, at.id); }
      return at.id;
    } catch (err) {
      if (allowed) throw err;
      owner = await env.user('learner', `owner-of-${e.id}`);
      return ownAttempt(itemKey, mode, submitted);
    }
  };
  const freshCreds = async () => { const email = env.email('signin'); const password = env.newPassword(); await env.supportOk('POST', '/users', { role: 'learner', email, password }); return { email, password }; };
  const q = env.questionIds[0];
  const needsAttempt = e.path.includes('{attemptId}');
  // admin may start attempts (ATT-01 allow) but not read them (D7); anonymous uses a learner's attempt
  const attemptId = needsAttempt ? await ownAttempt('p1', 'guided', e.id === 'ATT-09') : undefined;
  const recipes = {
    'AUTH-01': () => ({ body: { email: env.email('signup'), password: env.newPassword() } }),
    'AUTH-02': async () => ({ body: await freshCreds() }),
    'AUTH-03': () => ({}),
    'AUTH-04': () => ({ body: { email: actor.email ?? env.email('nobody') } }),
    'AUTH-05': async () => { await env.supportOk('POST', '/rate-limits/reset'); return {}; },
    'ME-01': () => ({}), 'ME-02': () => ({ body: { displayName: 'synthetic' } }), 'ME-03': () => ({}),
    'ITEM-01': () => ({ negative: { kind: 'list-excludes-draft' } }),
    'ITEM-02': () => ({ params: { itemId: env.items.p1 }, negative: { params: { itemId: env.items.draft }, expect: [404] } }),
    'REP-01': () => ({ params: { itemId: env.items.p1 }, body: { text: 'synthetic report' }, negative: { params: { itemId: env.items.draft }, expect: [404] } }),
    'ATT-01': () => ({ body: { itemId: env.items.p1, mode: 'guided' }, negative: { body: { itemId: env.items.draft, mode: 'guided' }, expect: [404] } }),
    'ATT-02': () => ({}),
    'ATT-03': () => ({ params: { attemptId } }),
    'ATT-04': async () => ({ params: { attemptId }, body: { answers: { [q]: 'A' } }, negative: allowed && { params: { attemptId: await ownAttempt('p2', 'guided', true) }, body: { answers: { [q]: 'A' } }, expect: [403, 404, 409] } }),
    'ATT-05': async () => ({ params: { attemptId }, body: {}, negative: allowed && { params: { attemptId: await ownAttempt('p2', 'guided', true) }, body: {}, expect: [403, 404, 409] } }),
    'ATT-06': async () => ({ params: { attemptId }, negative: allowed && { params: { attemptId: await ownAttempt('p2', 'guided', true) }, expect: [403, 404, 409, 410] } }),
    'ATT-07': async () => ({ params: { attemptId }, body: {}, negative: allowed && { params: { attemptId: await ownAttempt('p3', 'exam') }, body: {}, expect: [403, 409] } }),
    'ATT-08': async () => ({ params: { attemptId }, body: { questionId: q }, negative: allowed && { params: { attemptId: await ownAttempt('p3', 'exam') }, body: { questionId: q }, expect: [403, 409] } }),
    'ATT-09': async () => ({ params: { attemptId }, negative: allowed && { params: { attemptId: await ownAttempt('p3', 'exam') }, expect: [403, 404, 409] } }),
    'PROG-01': () => ({}), 'PROG-02': () => ({}),
    'ADM-01': () => ({}),
    'ADM-02': () => ({ body: { item: buildItem(env.runId, { suffix: `-imp${env.uniq('i')}`, status: 'draft' }) } }),
    'ADM-03': async () => {
      const published = (await env.supportOk('POST', '/items', { item: buildItem(env.runId, { suffix: `-pub${env.uniq('p')}` }), status: 'published' })).itemId;
      const body = { item: buildItem(env.runId, { suffix: '-edited', status: 'draft' }) };
      return { params: { itemId: await env.seedDraft() }, body, negative: { params: { itemId: published }, body, expect: [403, 409] } };
    },
    'ADM-04': () => ({ params: { itemId: env.items.p1 } }),
    'ADM-05': async () => ({ params: { itemId: await env.seedDraft() }, body: {} }),
    'ADM-06': () => ({}),
    'ADM-07': async () => ({ params: { userId: (await env.user('learner', 'role-target')).userId }, body: { roles: ['content_author'] } }),
  };
  assert.ok(recipes[e.id], `no request recipe for ${e.id} in authorization-enforcement.test.mjs; add one (fail closed)`);
  const r = await recipes[e.id]();
  return { params: { ...(attemptId ? { attemptId } : {}), ...(r.params ?? {}) }, body: r.body, negative: r.negative };
}

liveTest('AUTHZ-06: every role x every endpoint matches its authorization-matrix cell (and the cell condition is enforced)', async (t, env) => {
  const problems = [];
  let cells = 0;
  for (const e of matrix.endpoints) {
    for (const role of roles) {
      const decision = e.access[role];
      const actor = await env.actor(role, `${role}-${e.id}`);
      const req = await prepare(env, e, role, actor, decision !== 'deny');
      const r = await actor.req(e.method, fillPath(e.path, req.params), { body: req.body });
      cells++;
      const cell = `${e.id} ${e.method} ${e.path} as ${role} (${decision})`;
      if (decision === 'deny') {
        const expect = role === 'anonymous' ? [401] : DENIED_WITH_SESSION;
        if (!expect.includes(r.status)) problems.push(`${cell}: expected ${expect.join('/')}, got ${r.status}`);
        if (env.canaryRe.test(r.text)) problems.push(`${cell}: canary in a denied response`);
        continue;
      }
      if (!ok2xx(r.status)) { problems.push(`${cell}: expected 2xx, got ${r.status} ${r.text.slice(0, 120)}`); continue; }
      const n = req.negative;
      if (!n) continue;
      if (n.kind === 'list-excludes-draft') {
        if (r.text.includes(env.items.draft)) problems.push(`${cell}: draft item listed`);
        continue;
      }
      // the same caller, with the decision's condition not met
      const nr = await actor.req(e.method, fillPath(e.path, { ...req.params, ...n.params }), { body: n.body ?? req.body });
      if (!n.expect.includes(nr.status)) problems.push(`${cell}: condition not enforced (expected ${n.expect.join('/')}, got ${nr.status})`);
      if (env.canaryRe.test(nr.text)) problems.push(`${cell}: canary in a refused response`);
    }
  }
  t.diagnostic(`checked ${cells} cells (${matrix.endpoints.length} endpoints x ${roles.length} roles)`);
  assert.deepEqual(problems, []);
});
