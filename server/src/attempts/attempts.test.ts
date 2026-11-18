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
      score: null,
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

  test('an admin may start an attempt but not read it or play its audio (ATT-01 allow; ATT-03, ATT-06 deny)', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    const admin = await signedIn(app, apps.db, 'admin');
    // ATT-01 allows admin; the attempt it creates is still unreadable to it (ATT-03, ATT-06 deny).
    const res = await start(app, admin, itemId);
    assert.equal(res.statusCode, 201, res.body);
    assert.equal((await call(app, 'GET', `/attempts/${res.json().id}/audio`, { cookie: admin })).statusCode, 403);
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
