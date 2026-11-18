// HTTP seam (spec, Testing Decisions, seam 1) for ticket 07: the item catalogue. Expected values come from the ticket,
// the spec (Item catalogue; Security & Privacy), the authorization matrix (ITEM-01, ITEM-02: published only) and the
// leak rules of tests/security/lib/live.mjs (forbidden keys and canaries).
import assert from 'node:assert/strict';
import { after, describe, test } from 'node:test';
import { createTestApps } from '../test-app.ts';
import { call, newItem, seedItem, signedIn } from '../test-callers.ts';

const apps = createTestApps();
after(() => apps.close());

type Listed = { itemId: string; tier: number; purpose: string; questionCount: number };
const listedIds = (body: { items: Listed[] }) => body.items.map((i) => i.itemId);

// Every protected text carries a canary; none may reach a delivery payload (CS 2.2).
const withCanaries = () =>
  newItem((item) => {
    for (const cue of item.transcript.cues) cue.text += ' CANARY-TRANSCRIPT';
    for (const event of item.events) if (event.note !== undefined) event.note += ' CANARY-NOTE';
    for (const q of item.questions) {
      q.explanation.en += ' CANARY-EXPLANATION';
      q.explanation.ar += ' CANARY-EXPLANATION';
    }
  });
// Same keys as the live leak suite (tests/security/lib/live.mjs, FORBIDDEN_KEYS), plus any key starting "correct".
const FORBIDDEN_KEY =
  /"(answerLabel|eventId|events|transcript|cues|note|explanation|rationale|evidence|route|isCorrect|hint|hints|correct\w*)"\s*:/i;

describe('ITEM-01 GET /items (Browse)', () => {
  test('anonymous is refused', async () => {
    const app = await apps.app();
    assert.equal((await call(app, 'GET', '/items')).statusCode, 401);
  });

  test('lists published items with their difficulty tier; drafts, the first challenge and pilot items never appear', async () => {
    const app = await apps.app();
    const published = await seedItem(
      app,
      'published',
      newItem((i) => (i.tier = 1)),
    );
    const skillChallenge = await seedItem(
      app,
      'published',
      newItem((i) => {
        i.purpose = 'skill-challenge';
        i.focusSkill = 'spatial-language';
      }),
    );
    const draft = await seedItem(app, 'draft');
    const firstChallenge = await seedItem(
      app,
      'published',
      newItem((i) => {
        i.purpose = 'first-challenge';
        i.tier = 2;
        i.questions = i.questions.slice(0, 3);
      }),
    );
    const pilot = await seedItem(
      app,
      'published',
      newItem((i) => {
        i.purpose = 'pilot-transfer';
        i.tier = 2;
      }),
    );

    for (const who of ['guest', 'learner'] as const) {
      const res = await call(app, 'GET', '/items', { cookie: await signedIn(app, apps.db, who) });
      assert.equal(res.statusCode, 200, res.body);
      const ids = listedIds(res.json());
      assert.ok(ids.includes(published.itemId));
      assert.ok(ids.includes(skillChallenge.itemId));
      for (const hidden of [draft, firstChallenge, pilot]) assert.ok(!ids.includes(hidden.itemId));
      const entry = res.json().items.find((i: Listed) => i.itemId === published.itemId);
      assert.deepEqual(entry, {
        itemId: published.itemId,
        tier: 1,
        purpose: 'standard',
        focusSkill: null,
        questionCount: published.item.questions.length,
      });
      const challenge = res.json().items.find((i: Listed) => i.itemId === skillChallenge.itemId);
      assert.equal(challenge.focusSkill, 'spatial-language');
    }
  });

  test('carries no answers, route, transcript, hints or explanations', async () => {
    const app = await apps.app();
    await seedItem(app, 'published', withCanaries());
    const res = await call(app, 'GET', '/items', { cookie: await signedIn(app, apps.db, 'guest') });
    assert.equal(res.statusCode, 200);
    assert.doesNotMatch(res.body, /CANARY-/);
    assert.doesNotMatch(res.body, FORBIDDEN_KEY);
  });
});

describe('ITEM-02 GET /items/{itemId} (the player)', () => {
  test('anonymous is refused', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(app, 'published');
    assert.equal((await call(app, 'GET', `/items/${itemId}`)).statusCode, 401);
  });

  test('a published item gives the map, lettered places, question prompts and audio length, and nothing else', async () => {
    const app = await apps.app();
    const { itemId, item } = await seedItem(app, 'published', withCanaries());
    const res = await call(app, 'GET', `/items/${itemId}`, { cookie: await signedIn(app, apps.db, 'learner') });
    assert.equal(res.statusCode, 200, res.body);
    assert.doesNotMatch(res.body, /CANARY-/);
    assert.doesNotMatch(res.body, FORBIDDEN_KEY);

    const full = item as unknown as {
      audio: { durationSec: number };
      map: { width: number; height: number; landmarks: object[]; targets: object[] };
    };
    const body = res.json();
    assert.deepEqual(body, {
      itemId,
      tier: item.tier,
      purpose: 'standard',
      focusSkill: null,
      readingTimeSec: 30,
      audio: { durationSec: full.audio.durationSec },
      map: full.map,
      questions: item.questions.map((q) => ({ id: q.id, prompt: q.prompt })),
    });
  });

  test('the first challenge is still delivered (it is only hidden from Browse)', async () => {
    const app = await apps.app();
    const { itemId } = await seedItem(
      app,
      'published',
      newItem((i) => {
        i.purpose = 'first-challenge';
        i.tier = 2;
        i.questions = i.questions.slice(0, 3);
      }),
    );
    const res = await call(app, 'GET', `/items/${itemId}`, { cookie: await signedIn(app, apps.db, 'guest') });
    assert.equal(res.statusCode, 200, res.body);
  });

  test('a draft, an unknown id and a malformed id all give 404 with no content', async () => {
    const app = await apps.app();
    const draft = await seedItem(app, 'draft', withCanaries());
    const cookie = await signedIn(app, apps.db, 'learner');
    for (const id of [draft.itemId, '7b0c1a52-8f2e-4c4b-9d35-2f8a7c1e0b11', 'not-an-item', draft.item.id]) {
      const res = await call(app, 'GET', `/items/${encodeURIComponent(id)}`, { cookie });
      assert.equal(res.statusCode, 404, `${id}: ${res.body}`);
      assert.doesNotMatch(res.body, /CANARY-/);
    }
  });
});
