// HTTP seam (spec, Testing Decisions, seam 1) for ticket 10: staff preview (ADM-04) and staff item audio (ADM-08,
// owner decision 2026-11-22). Expected values: the learner's own delivery of the same item (GET /items/{id}, so the
// preview "matches the learner view"), and the validator fixture the test item is made from
// (tools/fixtures/map-001.valid.json: answer key q1 C, q2 E, q3 B named in cues c5, c6, c7; its events, transcript and
// explanations). Matrix: content_author and content_reviewer allowed; anonymous 401; guest, learner and admin denied.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, describe, test } from 'node:test';
import { createTestApps, FIXTURE_AUDIO_BYTES } from '../test-app.ts';
import { type Caller, call, newItem, seedItem, signedIn } from '../test-callers.ts';

const apps = createTestApps();
after(() => apps.close());

const fixture = JSON.parse(
  readFileSync(new URL('../../../tools/fixtures/map-001.valid.json', import.meta.url), 'utf8'),
);
const explanation = (q: string) => fixture.questions.find((x: { id: string }) => x.id === q).explanation;

describe('ADM-04 GET /admin/items/{itemId}/preview', () => {
  test('staff see the learner delivery unchanged, plus answers, explanations, route and transcript', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    const learnerView = (
      await call(app, 'GET', `/items/${itemId}`, { cookie: await signedIn(app, apps.db, 'learner') })
    ).json();
    for (const role of ['content_author', 'content_reviewer'] as const) {
      const res = await call(app, 'GET', `/admin/items/${itemId}/preview`, {
        cookie: await signedIn(app, apps.db, role),
      });
      assert.equal(res.statusCode, 200, `${role}: ${res.body}`);
      assert.equal(res.headers['cache-control'], 'private, no-store');
      assert.deepEqual(res.json(), {
        status: 'published',
        item: learnerView,
        questions: [
          { id: 'q1', cueId: 'c5', prompt: 'Reading room', correctAnswer: 'C', explanation: explanation('q1') },
          { id: 'q2', cueId: 'c6', prompt: 'Sports hall', correctAnswer: 'E', explanation: explanation('q2') },
          { id: 'q3', cueId: 'c7', prompt: 'Gift shop', correctAnswer: 'B', explanation: explanation('q3') },
        ],
        route: fixture.events,
        transcript: fixture.transcript,
      });
    }
  });

  test('a draft can be previewed before it is published', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'draft');
    const res = await call(app, 'GET', `/admin/items/${itemId}/preview`, {
      cookie: await signedIn(app, apps.db, 'content_author'),
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().status, 'draft');
    assert.equal(res.json().questions[0].correctAnswer, 'C');
  });

  test('non-staff are refused and get no answer data; unknown ids 404', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    const url = `/admin/items/${itemId}/preview`;
    assert.equal((await call(app, 'GET', url)).statusCode, 401);
    for (const who of ['guest', 'learner', 'admin'] as Caller[]) {
      const res = await call(app, 'GET', url, { cookie: await signedIn(app, apps.db, who) });
      assert.equal(res.statusCode, 403, who);
      assert.ok(!res.body.includes('Reading room'), `${who}: preview content in a refused reply`);
    }
    const staff = await signedIn(app, apps.db, 'content_reviewer');
    for (const bad of ['not-an-item', '7b0c1a52-8f2e-4c4b-9d35-2f8a7c1e0b11'])
      assert.equal((await call(app, 'GET', `/admin/items/${bad}/preview`, { cookie: staff })).statusCode, 404, bad);
  });
});

describe('ADM-08 GET /admin/items/{itemId}/audio', () => {
  test('staff get the audio of a draft or published item, whole or by byte range', async () => {
    const app = await apps.app();
    const author = await signedIn(app, apps.db, 'content_author');
    for (const status of ['draft', 'published'] as const) {
      const { itemId } = await seedItem(app, status);
      const whole = await call(app, 'GET', `/admin/items/${itemId}/audio`, { cookie: author });
      assert.equal(whole.statusCode, 200, `${status}: ${whole.body}`);
      assert.equal(whole.headers['content-type'], 'audio/mpeg');
      assert.equal(whole.headers['cache-control'], 'private, no-cache');
      assert.deepEqual(whole.rawPayload, FIXTURE_AUDIO_BYTES);
      const part = await call(app, 'GET', `/admin/items/${itemId}/audio`, {
        cookie: author,
        headers: { range: 'bytes=10-19' },
      });
      assert.equal(part.statusCode, 206);
      assert.deepEqual(part.rawPayload, FIXTURE_AUDIO_BYTES.subarray(10, 20));
    }
  });

  test('non-staff are refused; unknown ids and a missing file 404', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    assert.equal((await call(app, 'GET', `/admin/items/${itemId}/audio`)).statusCode, 401);
    for (const who of ['guest', 'learner', 'admin'] as Caller[])
      assert.equal(
        (await call(app, 'GET', `/admin/items/${itemId}/audio`, { cookie: await signedIn(app, apps.db, who) }))
          .statusCode,
        403,
        who,
      );
    const staff = await signedIn(app, apps.db, 'content_reviewer');
    assert.equal((await call(app, 'GET', '/admin/items/not-an-item/audio', { cookie: staff })).statusCode, 404);
    const missing = await seedItem(
      app,
      'draft',
      newItem((i) => (i.audio.file = 'audio/missing.mp3')),
    );
    assert.equal((await call(app, 'GET', `/admin/items/${missing.itemId}/audio`, { cookie: staff })).statusCode, 404);
  });
});
