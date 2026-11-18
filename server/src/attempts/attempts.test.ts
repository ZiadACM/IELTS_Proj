// HTTP seam (spec, Testing Decisions, seam 1) for ticket 07: starting a guided attempt, reading it, and its audio.
// Expected values come from the harness contract (attempt shape, ids), the authorization matrix (ATT-01, ATT-03,
// ATT-06; admin deny on attempt reads), D10 (one open attempt per user per item) and the owner's ticket 07 decisions
// (07 starts guided attempts only; the independent check is ticket 13; audio comes from the content folder).
import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import { createTestApps, FIXTURE_AUDIO_BYTES } from '../test-app.ts';
import { call, newItem, seedItem, signedIn } from '../test-callers.ts';

const apps = createTestApps();
after(() => apps.close());

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const start = (app: Parameters<typeof call>[0], cookie: string | undefined, itemId: string, mode = 'guided') =>
  call(app, 'POST', '/attempts', { payload: { itemId, mode }, cookie });

describe('ATT-01 POST /attempts (start guided practice)', () => {
  test('anonymous is refused', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    assert.equal((await start(app, undefined, itemId)).statusCode, 401);
  });

  test('a guest starts a guided attempt; the attempt follows the harness contract and has a random id', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    const res = await start(app, await signedIn(app, apps.db, 'guest'), itemId);
    assert.equal(res.statusCode, 201, res.body);
    const attempt = res.json();
    assert.match(attempt.id, UUID_V4);
    assert.deepEqual(attempt, {
      id: attempt.id,
      itemId,
      mode: 'guided',
      status: 'open',
      answers: {},
      supportUsage: { replayCount: 0, hintCount: 0 },
      deadline: null,
      seenBefore: false,
      countsTowardIndependentReadiness: false,
      late: false,
    });
  });

  test('starting again while the attempt is open resumes it (D10: one open attempt per user per item)', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    const cookie = await signedIn(app, apps.db, 'learner');
    const first = await start(app, cookie, itemId);
    const again = await start(app, cookie, itemId);
    assert.equal(first.statusCode, 201);
    assert.equal(again.statusCode, 200, again.body);
    assert.equal(again.json().id, first.json().id);
    const other = await start(app, await signedIn(app, apps.db, 'learner'), itemId);
    assert.notEqual(other.json().id, first.json().id);
  });

  test('a draft or unknown item is not found', async () => {
    const app = await apps.app();
    const draft = await seedItem(app, 'draft');
    const cookie = await signedIn(app, apps.db, 'learner');
    for (const itemId of [draft.itemId, '7b0c1a52-8f2e-4c4b-9d35-2f8a7c1e0b11', 'not-an-item'])
      assert.equal((await start(app, cookie, itemId)).statusCode, 404, itemId);
  });

  test('an independent check cannot start yet (ticket 13); unknown fields and modes are refused', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    const cookie = await signedIn(app, apps.db, 'learner');
    assert.equal((await start(app, cookie, itemId, 'exam')).statusCode, 501);
    assert.equal((await start(app, cookie, itemId, 'easy')).statusCode, 400);
    const extra = await call(app, 'POST', '/attempts', {
      payload: { itemId, mode: 'guided', status: 'submitted', score: 3 },
      cookie,
    });
    assert.equal(extra.statusCode, 400);
  });
});

describe('ATT-03 GET /attempts/{attemptId}', () => {
  test('the owner reads it; another learner gets 404; anonymous 401; an admin is denied', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    const owner = await signedIn(app, apps.db, 'guest');
    const started = (await start(app, owner, itemId)).json();
    const url = `/attempts/${started.id}`;

    const own = await call(app, 'GET', url, { cookie: owner });
    assert.equal(own.statusCode, 200, own.body);
    assert.deepEqual(own.json(), started);

    assert.equal((await call(app, 'GET', url)).statusCode, 401);
    assert.equal((await call(app, 'GET', url, { cookie: await signedIn(app, apps.db, 'learner') })).statusCode, 404);
    const admin = await signedIn(app, apps.db, 'admin');
    assert.equal((await call(app, 'GET', url, { cookie: admin })).statusCode, 403);
    for (const id of ['not-an-attempt', '7b0c1a52-8f2e-4c4b-9d35-2f8a7c1e0b11'])
      assert.equal((await call(app, 'GET', `/attempts/${id}`, { cookie: owner })).statusCode, 404);
  });

  test('guided practice on a pilot transfer item gives 404 and stores nothing (owner decision, ticket 07)', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(
      app,
      'published',
      newItem((i) => {
        i.purpose = 'pilot-transfer';
        i.tier = 2;
      }),
    );
    const res = await start(app, await signedIn(app, apps.db, 'learner'), itemId);
    assert.equal(res.statusCode, 404, res.body);
    const { rows } = await apps.db.query('select 1 from attempts where item_id = $1', [itemId]);
    assert.equal(rows.length, 0);
  });

  test('an admin cannot start an attempt (ATT-01 deny, D20) and nothing is stored', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    const admin = await signedIn(app, apps.db, 'admin');
    const res = await start(app, admin, itemId);
    assert.equal(res.statusCode, 403, res.body);
    const { rows } = await apps.db.query('select 1 from attempts where item_id = $1', [itemId]);
    assert.equal(rows.length, 0);
  });
});

describe('ATT-06 GET /attempts/{attemptId}/audio (guided practice)', () => {
  test('the owner gets the item audio, whole or by byte range', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    const owner = await signedIn(app, apps.db, 'learner');
    const { id } = (await start(app, owner, itemId)).json();
    const url = `/attempts/${id}/audio`;

    const whole = await call(app, 'GET', url, { cookie: owner });
    assert.equal(whole.statusCode, 200);
    assert.equal(whole.headers['content-type'], 'audio/mpeg');
    assert.equal(whole.headers['x-content-type-options'], 'nosniff');
    assert.deepEqual(whole.rawPayload, FIXTURE_AUDIO_BYTES);

    const part = await call(app, 'GET', url, { cookie: owner, headers: { range: 'bytes=100-199' } });
    assert.equal(part.statusCode, 206);
    assert.deepEqual(part.rawPayload, FIXTURE_AUDIO_BYTES.subarray(100, 200));
  });

  test('anonymous 401; another learner 404', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    const { id } = (await start(app, await signedIn(app, apps.db, 'guest'), itemId)).json();
    assert.equal((await call(app, 'GET', `/attempts/${id}/audio`)).statusCode, 401);
    const other = await signedIn(app, apps.db, 'guest');
    assert.equal((await call(app, 'GET', `/attempts/${id}/audio`, { cookie: other })).statusCode, 404);
  });

  test('an item whose audio file is missing gives 404, not a server error', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(
      app,
      'published',
      newItem((i) => (i.audio.file = 'audio/missing.mp3')),
    );
    const owner = await signedIn(app, apps.db, 'learner');
    const { id } = (await start(app, owner, itemId)).json();
    const res = await call(app, 'GET', `/attempts/${id}/audio`, { cookie: owner });
    assert.equal(res.statusCode, 404, res.body);
  });
});

// Ticket 08: answers and submit. Expected scores come from the validator fixture's answer key (q1 C, q2 E, q3 B), not
// from the code under test. Saving replaces the whole answer set (PUT), so a learner can change or clear an answer.
type App = Parameters<typeof call>[0];
const save = (app: App, cookie: string | undefined, id: string, payload: object) =>
  call(app, 'PUT', `/attempts/${id}/answers`, { payload, cookie });
const submit = (app: App, cookie: string | undefined, id: string, payload: object = {}) =>
  call(app, 'POST', `/attempts/${id}/submit`, { payload, cookie });
const read = async (app: App, cookie: string | undefined, id: string) =>
  (await call(app, 'GET', `/attempts/${id}`, { cookie })).json();

async function openAttempt(who: 'guest' | 'learner' = 'learner') {
  const app = await apps.app();
  const { itemId } = await seedItem(app, 'published');
  const cookie = await signedIn(app, apps.db, who);
  const attempt = (await start(app, cookie, itemId)).json();
  return { app, cookie, id: attempt.id as string, itemId };
}

describe('ATT-04 PUT /attempts/{attemptId}/answers', () => {
  test('the owner saves answers, changes one and clears another; the attempt shows the saved set', async () => {
    const { app, cookie, id } = await openAttempt('guest');
    const first = await save(app, cookie, id, { answers: { q1: 'A', q2: 'D' } });
    assert.equal(first.statusCode, 200, first.body);
    assert.deepEqual(first.json().answers, { q1: 'A', q2: 'D' });
    const changed = await save(app, cookie, id, { answers: { q1: 'C' } });
    assert.equal(changed.statusCode, 200, changed.body);
    const state = await read(app, cookie, id);
    assert.deepEqual(state.answers, { q1: 'C' });
    assert.equal(state.status, 'open');
    assert.equal('score' in state, false, 'an open attempt has no score (harness contract: score after submit)');
  });

  test('malformed answers are refused and change nothing', async () => {
    const { app, cookie, id } = await openAttempt();
    await save(app, cookie, id, { answers: { q1: 'A' } });
    const bad = [
      { answers: { q1: 'Z' } },
      { answers: { q1: 12345 } },
      { answers: { q1: ['A'] } },
      { answers: { q1: '' } },
      { answers: 'C' },
      { answers: { 'no-such-question': 'A' } },
      { answers: { q1: 'B' }, score: 3, status: 'submitted', mode: 'exam' },
      {},
    ];
    for (const payload of bad) {
      const res = await save(app, cookie, id, payload);
      assert.equal(res.statusCode, 400, JSON.stringify(payload));
    }
    const state = await read(app, cookie, id);
    assert.deepEqual(state.answers, { q1: 'A' });
    assert.equal(state.mode, 'guided');
    assert.equal(state.status, 'open');
  });

  test('anonymous 401; another learner 404 and nothing stored; an admin is denied', async () => {
    const { app, cookie, id } = await openAttempt();
    assert.equal((await save(app, undefined, id, { answers: { q1: 'A' } })).statusCode, 401);
    const other = await signedIn(app, apps.db, 'learner');
    assert.equal((await save(app, other, id, { answers: { q1: 'A' } })).statusCode, 404);
    const admin = await signedIn(app, apps.db, 'admin');
    assert.equal((await save(app, admin, id, { answers: { q1: 'A' } })).statusCode, 403);
    assert.equal((await save(app, cookie, 'not-an-attempt', { answers: { q1: 'A' } })).statusCode, 404);
    assert.deepEqual((await read(app, cookie, id)).answers, {});
  });

  test('a submitted attempt refuses new answers (409) and keeps the submitted ones', async () => {
    const { app, cookie, id } = await openAttempt();
    await save(app, cookie, id, { answers: { q1: 'C' } });
    assert.equal((await submit(app, cookie, id)).statusCode, 200);
    assert.equal((await save(app, cookie, id, { answers: { q1: 'A' } })).statusCode, 409);
    assert.deepEqual((await read(app, cookie, id)).answers, { q1: 'C' });
  });
});

describe('ATT-05 POST /attempts/{attemptId}/submit', () => {
  test('the server scores the saved answers: one right of three (q1 C right, q2 A wrong, q3 unanswered)', async () => {
    const { app, cookie, id } = await openAttempt('guest');
    await save(app, cookie, id, { answers: { q1: 'C', q2: 'A' } });
    const res = await submit(app, cookie, id);
    assert.equal(res.statusCode, 200, res.body);
    const attempt = res.json();
    assert.equal(attempt.status, 'submitted');
    assert.equal(attempt.score, 1);
    assert.deepEqual(await read(app, cookie, id), attempt);
  });

  test('all right scores 3; nothing answered scores 0', async () => {
    const all = await openAttempt();
    await save(all.app, all.cookie, all.id, { answers: { q1: 'C', q2: 'E', q3: 'B' } });
    assert.equal((await submit(all.app, all.cookie, all.id)).json().score, 3);
    const none = await openAttempt();
    assert.equal((await submit(none.app, none.cookie, none.id)).json().score, 0);
  });

  test('a score or answers sent by the client are refused; the stored attempt stays open', async () => {
    const { app, cookie, id } = await openAttempt();
    await save(app, cookie, id, { answers: { q1: 'A', q2: 'D' } });
    for (const payload of [{ score: 3 }, { answers: { q1: 'C', q2: 'E', q3: 'B' } }, { status: 'submitted' }])
      assert.equal((await submit(app, cookie, id, payload)).statusCode, 400, JSON.stringify(payload));
    assert.equal((await read(app, cookie, id)).status, 'open');
    assert.equal((await submit(app, cookie, id)).json().score, 0);
  });

  test('submitting twice gives 409 and keeps the first result', async () => {
    const { app, cookie, id } = await openAttempt();
    await save(app, cookie, id, { answers: { q1: 'C' } });
    await submit(app, cookie, id);
    const again = await submit(app, cookie, id);
    assert.equal(again.statusCode, 409, again.body);
    assert.equal((await read(app, cookie, id)).score, 1);
  });

  test('anonymous 401; another learner 404 and the attempt stays open; an admin is denied', async () => {
    const { app, cookie, id } = await openAttempt();
    assert.equal((await submit(app, undefined, id)).statusCode, 401);
    assert.equal((await submit(app, await signedIn(app, apps.db, 'learner'), id)).statusCode, 404);
    assert.equal((await submit(app, await signedIn(app, apps.db, 'admin'), id)).statusCode, 403);
    assert.equal((await read(app, cookie, id)).status, 'open');
  });

  test('after submit the audio is closed and practising again opens a new attempt marked seen before', async () => {
    const { app, cookie, id, itemId } = await openAttempt();
    await submit(app, cookie, id);
    assert.equal((await call(app, 'GET', `/attempts/${id}/audio`, { cookie })).statusCode, 409);
    const next = await start(app, cookie, itemId);
    assert.equal(next.statusCode, 201, next.body);
    assert.notEqual(next.json().id, id);
    assert.equal(next.json().seenBefore, true);
  });
});
