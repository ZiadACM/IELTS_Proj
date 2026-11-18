// Callers and items for inject() tests: signed-in guests, learners and staff, and items seeded through test support.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import type { Pool } from 'pg';
import { createInviteCode } from './access/invite-codes.ts';
import { grantStaffRole, type StaffRole } from './staff/roles.ts';
import { TEST_SUPPORT_TOKEN } from './test-app.ts';

export type Caller = 'anonymous' | 'guest' | 'learner' | StaffRole;

let clientNumber = 0;
const newClient = () => `198.51.100.${(++clientNumber % 250) + 1}`;
let counter = 0;
const unique = (prefix: string) => `${prefix}-${process.pid}-${Date.now()}-${++counter}`;

export function call(
  app: FastifyInstance,
  method: 'GET' | 'POST' | 'PUT',
  url: string,
  options: { payload?: object; cookie?: string; headers?: Record<string, string> } = {},
) {
  const headers = { ...options.headers, ...(options.cookie ? { cookie: options.cookie } : {}) };
  return app.inject({ method, url, payload: options.payload, remoteAddress: newClient(), headers });
}

const sessionCookie = (res: LightMyRequestResponse) => {
  const cookie = res.cookies.find((c) => c.name.endsWith('session_token') && c.value);
  assert.ok(cookie, `no session cookie in ${JSON.stringify(res.headers['set-cookie'])}`);
  return `${cookie.name}=${cookie.value}`;
};

// A session cookie for the caller (undefined for anonymous). Staff are accounts with a role granted as the owner
// script grants it.
export async function signedIn(app: FastifyInstance, db: Pool, who: Caller): Promise<string | undefined> {
  if (who === 'anonymous') return undefined;
  const redemption = { inviteCode: (await createInviteCode(db)).code, ageConfirmed: true };
  if (who === 'guest') return sessionCookie(await call(app, 'POST', '/auth/guest-sessions', { payload: redemption }));
  const email = `${unique('caller')}@example.test`;
  const res = await call(app, 'POST', '/accounts', {
    payload: { email, password: 'synthetic-password-1', ...redemption },
  });
  assert.equal(res.statusCode, 201, res.body);
  if (who !== 'learner') assert.ok(await grantStaffRole(db, email, who));
  return sessionCookie(res);
}

// The validator's own valid fixture (read only) with a unique id. Only the fields tests change are typed.
const FIXTURE = new URL('../../tools/fixtures/map-001.valid.json', import.meta.url);
export type TestItem = {
  id: string;
  tier: number;
  purpose: string;
  focusSkill?: string;
  audio: { file: string; source: string };
  transcript: { cues: { text: string }[] };
  events: { note?: string }[];
  questions: { id: string; prompt: string; answerLabel: string; explanation: { en: string; ar: string } }[];
  validation: object;
};
export function newItem(change: (item: TestItem) => void = () => {}): TestItem {
  const item = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  delete item._comment;
  item.id = unique('item');
  change(item);
  return item;
}

// Stores an item through POST /__test__/items. A published item gets a human recording and a reviewer, as the
// validator requires.
export async function seedItem(app: FastifyInstance, status: 'draft' | 'published', item = newItem()) {
  if (status === 'published') {
    item.audio.source = 'human';
    item.validation = { status: 'published', reviewer: 'synthetic-reviewer', reviewedOn: '2026-11-18' };
  } else item.validation = { status: 'draft' };
  const res = await call(app, 'POST', '/__test__/items', {
    payload: { item, status },
    headers: { 'x-test-support-token': TEST_SUPPORT_TOKEN },
  });
  assert.equal(res.statusCode, 201, res.body);
  return { itemId: res.json().itemId as string, item };
}
