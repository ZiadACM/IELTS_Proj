// HTTP seam (spec, Testing Decisions, seam 1) for ticket 06: staff item list, import and publish. Expected values come
// from the ticket, the spec (Staff; Content Validation), the authorization matrix (ADM-01, ADM-02, ADM-05; D8) and the
// owner's decisions recorded in the ticket (re-import replaces a draft only; audio-file check deferred to 07).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, describe, test } from 'node:test';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { createInviteCode } from '../access/invite-codes.ts';
import { createTestApps, TEST_SUPPORT_TOKEN } from '../test-app.ts';
import { grantStaffRole, type StaffRole } from './roles.ts';

const apps = createTestApps();
after(() => apps.close());

// A valid item from the validator's own fixtures (read only). Its audio is synthetic, so it cannot be published.
const FIXTURE = new URL('../../../tools/fixtures/map-001.valid.json', import.meta.url);
// Only the fields the tests change; the rest of the fixture passes through untouched.
type TestItem = {
  id: string;
  audio: { source: string; file: string };
  transcript: { cues: { text: string }[] };
  questions: { prompt: string; answerLabel: string; explanation: { en: string } }[];
  validation?: object;
};
let itemNumber = 0;
function newItem(change: (item: TestItem) => void = () => {}) {
  const item: TestItem & { _comment?: string } = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  delete item._comment;
  item.id = `staff-test-${process.pid}-${Date.now()}-${++itemNumber}`;
  change(item);
  return item;
}
const humanAudio = (item: TestItem) => {
  item.audio.source = 'human';
};

let clientNumber = 0;
const newClient = () => `198.51.100.${(++clientNumber % 250) + 1}`;
let emailNumber = 0;
const newEmail = () => `staff-${process.pid}-${Date.now()}-${++emailNumber}@example.test`;
const PASSWORD = 'synthetic-password-1';

function call(app: FastifyInstance, method: 'GET' | 'POST', url: string, payload?: object, cookie?: string) {
  return app.inject({ method, url, payload, remoteAddress: newClient(), headers: cookie ? { cookie } : {} });
}

const sessionCookie = (res: LightMyRequestResponse) => {
  const cookie = res.cookies.find((c) => c.name.endsWith('session_token') && c.value);
  assert.ok(cookie, `no session cookie in ${JSON.stringify(res.headers['set-cookie'])}`);
  return `${cookie.name}=${cookie.value}`;
};

type Caller = 'anonymous' | 'guest' | 'learner' | StaffRole;

// A signed-in caller. Staff are accounts with a role granted the way the owner script grants it.
async function signedIn(app: FastifyInstance, who: Caller): Promise<string | undefined> {
  if (who === 'anonymous') return undefined;
  const redemption = { inviteCode: (await createInviteCode(apps.db)).code, ageConfirmed: true };
  if (who === 'guest') return sessionCookie(await call(app, 'POST', '/auth/guest-sessions', redemption));
  const email = newEmail();
  const res = await call(app, 'POST', '/accounts', { email, password: PASSWORD, ...redemption });
  assert.equal(res.statusCode, 201, res.body);
  if (who !== 'learner') await grantStaffRole(apps.db, email, who);
  return sessionCookie(res);
}

const importItem = (app: FastifyInstance, cookie: string | undefined, item: object) =>
  call(app, 'POST', '/admin/items', { item }, cookie);
const publish = (app: FastifyInstance, cookie: string | undefined, itemId: string) =>
  call(app, 'POST', `/admin/items/${itemId}/publish`, {}, cookie);
type Listed = { itemId: string; contentId: string; status: string };
async function listed(app: FastifyInstance, cookie: string | undefined, contentId: string) {
  const res = await call(app, 'GET', '/admin/items', undefined, cookie);
  assert.equal(res.statusCode, 200, res.body);
  return (res.json().items as Listed[]).find((i) => i.contentId === contentId);
}
const storedContent = async (contentId: string) =>
  (await apps.db.query('select content from items where content_id = $1', [contentId])).rows[0]?.content;

// Matrix: anonymous 401; every other non-staff role 403 or 404 (deny with a session).
async function assertDenied(
  app: FastifyInstance,
  who: Caller,
  send: (cookie?: string) => Promise<LightMyRequestResponse>,
) {
  const res = await send(await signedIn(app, who));
  if (who === 'anonymous') assert.equal(res.statusCode, 401, `${who}: ${res.body}`);
  else assert.ok([403, 404].includes(res.statusCode), `${who}: expected 403/404, got ${res.statusCode} ${res.body}`);
}

describe('ADM-01 GET /admin/items (staff item list)', () => {
  test('anonymous, guest, learner and admin are denied', async () => {
    const app = await apps.app();
    for (const who of ['anonymous', 'guest', 'learner', 'admin'] as const)
      await assertDenied(app, who, (cookie) => call(app, 'GET', '/admin/items', undefined, cookie));
  });

  test('staff see draft and published items with their status; only a reviewer is told it can publish', async () => {
    const app = await apps.app();
    const reviewer = await signedIn(app, 'content_reviewer');
    const author = await signedIn(app, 'content_author');
    const draft = newItem();
    const toPublish = newItem(humanAudio);
    assert.equal((await importItem(app, author, draft)).statusCode, 201);
    const imported = await importItem(app, author, toPublish);
    assert.equal((await publish(app, reviewer, imported.json().itemId)).statusCode, 200);

    for (const [cookie, canPublish] of [
      [author, false],
      [reviewer, true],
    ] as const) {
      const res = await call(app, 'GET', '/admin/items', undefined, cookie);
      assert.equal(res.statusCode, 200, res.body);
      assert.equal(res.json().canPublish, canPublish);
      assert.equal((await listed(app, cookie, draft.id))?.status, 'draft');
      assert.equal((await listed(app, cookie, toPublish.id))?.status, 'published');
    }
  });

  test('the list carries no answer data (answers, route, transcript, hints, explanations)', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    const item = newItem((i) => {
      i.questions[0].explanation.en = 'CANARY-EXPLANATION-list';
      i.transcript.cues[0].text = 'CANARY-TRANSCRIPT-list';
    });
    assert.equal((await importItem(app, author, item)).statusCode, 201);
    const res = await call(app, 'GET', '/admin/items', undefined, author);
    assert.doesNotMatch(res.body, /CANARY-/);
    assert.doesNotMatch(res.body, /"answerLabel"|"events"|"hints"/);
  });
});

describe('ADM-02 POST /admin/items (import)', () => {
  test('a valid item is imported as a draft by an author or a reviewer', async () => {
    const app = await apps.app();
    for (const who of ['content_author', 'content_reviewer'] as const) {
      const cookie = await signedIn(app, who);
      const item = newItem();
      const res = await importItem(app, cookie, item);
      assert.equal(res.statusCode, 201, res.body);
      assert.match(res.json().itemId, /^[0-9a-f-]{36}$/);
      assert.equal((await listed(app, cookie, item.id))?.status, 'draft');
    }
  });

  test('a file that says it is published still arrives as a draft (only a reviewer publishes, in the app)', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    const item = newItem((i) => {
      humanAudio(i);
      i.validation = { status: 'published', reviewer: 'someone', reviewedOn: '2026-11-17' };
    });
    assert.equal((await importItem(app, author, item)).statusCode, 201);
    assert.equal((await listed(app, author, item.id))?.status, 'draft');
    assert.deepEqual((await storedContent(item.id)).validation, { status: 'draft' });
  });

  test('a rejected import lists the validator codes and stores nothing', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    const item = newItem((i) => {
      i.questions[0].answerLabel = 'Z'; // not a map target: validator code answer-label
      i.transcript.cues[1].text = 'Walk <b>straight</b> ahead.'; // markup (D4)
    });
    const res = await importItem(app, author, item);
    assert.equal(res.statusCode, 400, res.body);
    assert.equal(res.json().error, 'item_invalid');
    const codes = res.json().problems.map((p: { code: string }) => p.code);
    assert.ok(codes.includes('answer-label'), codes.join());
    assert.ok(codes.includes('markup'), codes.join());
    assert.equal(await storedContent(item.id), undefined);
  });

  test('a v2 map breaking a v2 rule is rejected with its validator code (map-v2-app ticket 03)', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    const item = JSON.parse(
      readFileSync(new URL('../../../tools/fixtures/map-002-v2.valid.json', import.meta.url), 'utf8'),
    );
    item.id = `v2-${Date.now()}`;
    delete item.events.find((e: { kind: string }) => e.kind === 'correction').wrongPath;
    const res = await importItem(app, author, item);
    assert.equal(res.statusCode, 400, res.body);
    const codes = res.json().problems.map((p: { code: string }) => p.code);
    assert.ok(codes.includes('v2-wrong-path'), codes.join());
    assert.equal(await storedContent(item.id), undefined);
  });

  test('an item whose audio file is not in the content folder is rejected without revealing server paths', async () => {
    // Owner decision, ticket 07: audio lives in the configured content folder, checked at import and publish.
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    for (const file of ['audio/missing.mp3', '../outside.mp3']) {
      const item = newItem((i) => {
        i.audio.file = file;
      });
      const res = await importItem(app, author, item);
      assert.equal(res.statusCode, 400, res.body);
      const codes = res.json().problems.map((p: { code: string }) => p.code);
      assert.ok(codes.includes('audio-missing') || codes.includes('audio-path'), `${file}: ${codes.join()}`);
      assert.doesNotMatch(res.body, /content-[A-Za-z0-9]+|\/(tmp|var|private|Users|home)\//, res.body);
      assert.equal(await storedContent(item.id), undefined);
    }
  });

  test('a body that is not {item: object}, or has extra fields, is rejected', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    for (const body of [{}, { item: 'text' }, { item: newItem(), status: 'published' }]) {
      const res = await call(app, 'POST', '/admin/items', body, author);
      assert.equal(res.statusCode, 400, JSON.stringify(body));
    }
  });

  test('importing an id that is still a draft replaces it; once published it is refused and unchanged', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    const reviewer = await signedIn(app, 'content_reviewer');
    const first = newItem(humanAudio);
    const created = await importItem(app, author, first);
    assert.equal(created.statusCode, 201);

    const fixed = { ...first, questions: first.questions.map((q) => ({ ...q })) };
    fixed.questions[0].prompt = 'Reading room (fixed)';
    const replaced = await importItem(app, author, fixed);
    assert.equal(replaced.statusCode, 200, replaced.body);
    assert.equal(replaced.json().itemId, created.json().itemId);
    assert.equal((await storedContent(first.id)).questions[0].prompt, 'Reading room (fixed)');

    assert.equal((await publish(app, reviewer, created.json().itemId)).statusCode, 200);
    fixed.questions[0].prompt = 'Changed after publishing';
    const refused = await importItem(app, author, fixed);
    assert.equal(refused.statusCode, 409, refused.body);
    assert.equal(refused.json().error, 'item_published');
    assert.equal((await storedContent(first.id)).questions[0].prompt, 'Reading room (fixed)');
  });

  test('anonymous, guest, learner and admin are denied and nothing is stored', async () => {
    const app = await apps.app();
    for (const who of ['anonymous', 'guest', 'learner', 'admin'] as const) {
      const item = newItem();
      await assertDenied(app, who, (cookie) => importItem(app, cookie, item));
      assert.equal(await storedContent(item.id), undefined, who);
    }
  });
});

describe('ADM-05 POST /admin/items/{itemId}/publish (D8: content_reviewer only)', () => {
  test('a reviewer publishes a draft; the item records the reviewer and the date', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    const reviewer = await signedIn(app, 'content_reviewer');
    const item = newItem(humanAudio);
    const { itemId } = (await importItem(app, author, item)).json();
    const res = await publish(app, reviewer, itemId);
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().status, 'published');
    const validation = (await storedContent(item.id)).validation;
    assert.equal(validation.status, 'published');
    assert.ok(validation.reviewer, 'reviewer recorded');
    assert.match(validation.reviewedOn, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('an author is refused and the item stays a draft', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    const item = newItem(humanAudio);
    const { itemId } = (await importItem(app, author, item)).json();
    const res = await publish(app, author, itemId);
    assert.ok([403, 404].includes(res.statusCode), `${res.statusCode} ${res.body}`);
    assert.equal((await listed(app, author, item.id))?.status, 'draft');
  });

  test('anonymous, guest, learner and admin are denied', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    const { itemId } = (await importItem(app, author, newItem(humanAudio))).json();
    for (const who of ['anonymous', 'guest', 'learner', 'admin'] as const)
      await assertDenied(app, who, (cookie) => publish(app, cookie, itemId));
    assert.equal((await apps.db.query('select status from items where id = $1', [itemId])).rows[0].status, 'draft');
  });

  test('a draft with synthetic audio and no D24 record is refused with the validator code', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    const reviewer = await signedIn(app, 'content_reviewer');
    const item = newItem(); // audio.source "synthetic"
    const { itemId } = (await importItem(app, author, item)).json();
    const res = await publish(app, reviewer, itemId);
    assert.equal(res.statusCode, 400, res.body);
    assert.equal(res.json().error, 'item_invalid');
    assert.ok(
      res.json().problems.some((p: { code: string }) => p.code === 'audio-source'),
      res.body,
    );
    assert.equal((await listed(app, reviewer, item.id))?.status, 'draft');
  });

  test('publishing twice is refused; an unknown or malformed id is not found', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    const reviewer = await signedIn(app, 'content_reviewer');
    const { itemId } = (await importItem(app, author, newItem(humanAudio))).json();
    assert.equal((await publish(app, reviewer, itemId)).statusCode, 200);
    assert.equal((await publish(app, reviewer, itemId)).statusCode, 409);
    assert.equal((await publish(app, reviewer, '00000000-0000-4000-8000-000000000000')).statusCode, 404);
    assert.equal((await publish(app, reviewer, 'not-a-uuid')).statusCode, 404);
  });
});

describe('test support (docs/security/test-harness-contract.md)', () => {
  const support = (app: FastifyInstance, url: string, payload: object) =>
    app.inject({ method: 'POST', url, payload, headers: { 'x-test-support-token': TEST_SUPPORT_TOKEN } });

  test('POST /__test__/users creates staff that sign in through AUTH-02 with their role', async () => {
    const app = await apps.app();
    for (const [role, listStatus] of [
      ['content_author', 200],
      ['content_reviewer', 200],
      ['admin', 403],
    ] as const) {
      const email = newEmail();
      const created = await support(app, '/__test__/users', { role, email, password: PASSWORD });
      assert.equal(created.statusCode, 201, created.body);
      const signIn = await call(app, 'POST', '/auth/sessions', { email, password: PASSWORD });
      assert.equal(signIn.statusCode, 200, signIn.body);
      const list = await call(app, 'GET', '/admin/items', undefined, sessionCookie(signIn));
      assert.equal(list.statusCode, listStatus, `${role}: ${list.body}`);
    }
  });

  test('POST /__test__/items refuses a status the file contradicts, and a repeated id, with the import error shapes', async () => {
    const app = await apps.app();
    const draftFile = newItem(humanAudio); // the fixture says "draft"
    const mismatch = await support(app, '/__test__/items', { item: draftFile, status: 'published' });
    assert.equal(mismatch.statusCode, 400, mismatch.body);
    assert.equal(mismatch.json().error, 'item_invalid');
    assert.ok(Array.isArray(mismatch.json().problems), mismatch.body);
    assert.equal(await storedContent(draftFile.id), undefined);

    const item = newItem(humanAudio);
    assert.equal((await support(app, '/__test__/items', { item, status: 'draft' })).statusCode, 201);
    const again = await support(app, '/__test__/items', { item, status: 'draft' });
    assert.equal(again.statusCode, 409, again.body);
  });

  test('POST /__test__/items stores an item with the given status', async () => {
    const app = await apps.app();
    const author = await signedIn(app, 'content_author');
    for (const status of ['draft', 'published'] as const) {
      const item = newItem((i) => {
        humanAudio(i);
        if (status === 'published') i.validation = { status, reviewer: 'synthetic-reviewer', reviewedOn: '2026-11-17' };
      });
      const res = await support(app, '/__test__/items', { item, status });
      assert.equal(res.statusCode, 201, res.body);
      assert.equal((await listed(app, author, item.id))?.itemId, res.json().itemId);
      assert.equal((await listed(app, author, item.id))?.status, status);
    }
  });
});
