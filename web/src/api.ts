// The only place the web app talks to the API. Every call is same-origin and sends the session cookie.

export const TARGET_BANDS = ['5.5', '6.0', '6.5', '7.0+'] as const;
export type TargetBand = (typeof TARGET_BANDS)[number];
export type InterfaceLanguage = 'ar' | 'en';
export type Settings = { interfaceLanguage: InterfaceLanguage; targetBand: TargetBand | null };

// What the screens need to tell apart; anything else is shown as a general error.
export type Failure =
  | 'unauthenticated'
  | 'not_valid'
  | 'age_required'
  | 'rate_limited'
  | 'invalid_credentials'
  | 'email_taken'
  | 'reset_not_valid'
  | 'already_signed_in'
  | 'forbidden'
  | 'item_invalid'
  | 'item_published'
  | 'not_found'
  | 'attempt_submitted'
  | 'offline'
  | 'rejected' // any other 4xx: the request itself is wrong, so sending it again cannot help
  | 'error'; // 5xx or an unreadable reply: worth trying again
// A content-checker finding (code and English message from tools/validate-content.mjs), shown to staff as is.
export type ItemProblem = { code: string; msg: string };
export type Result<T> = { ok: true; value: T } | { ok: false; failure: Failure; problems?: ItemProblem[] };

async function call<T>(method: string, url: string, body?: object): Promise<Result<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, failure: 'offline' };
  }
  const json = await res.json().catch(() => null);
  if (res.ok) return { ok: true, value: json as T };
  if (json?.error === 'invalid_credentials') return { ok: false, failure: 'invalid_credentials' };
  if (res.status === 401) return { ok: false, failure: 'unauthenticated' };
  if (res.status === 429) return { ok: false, failure: 'rate_limited' };
  if (json?.error === 'invite_code_not_valid') return { ok: false, failure: 'not_valid' };
  if (json?.error === 'age_confirmation_required') return { ok: false, failure: 'age_required' };
  if (json?.error === 'email_taken') return { ok: false, failure: 'email_taken' };
  if (json?.error === 'reset_token_not_valid') return { ok: false, failure: 'reset_not_valid' };
  if (json?.error === 'already_signed_in') return { ok: false, failure: 'already_signed_in' };
  if (json?.error === 'item_invalid') return { ok: false, failure: 'item_invalid', problems: json.problems ?? [] };
  if (json?.error === 'item_published') return { ok: false, failure: 'item_published' };
  if (json?.error === 'attempt_submitted') return { ok: false, failure: 'attempt_submitted' };
  if (res.status === 403) return { ok: false, failure: 'forbidden' };
  if (res.status === 404) return { ok: false, failure: 'not_found' };
  if (res.status >= 400 && res.status < 500) return { ok: false, failure: 'rejected' };
  return { ok: false, failure: 'error' };
}

export const getSettings = () => call<Settings>('GET', '/me/settings');
export const updateSettings = (change: Partial<Settings>) => call<Settings>('PATCH', '/me/settings', change);
export const startGuestSession = (inviteCode: string) =>
  call<{ userId: string }>('POST', '/auth/guest-sessions', { inviteCode, ageConfirmed: true });

// Accounts (ticket 05). Without a session, creating an account needs an invite code; with a guest session it upgrades
// that guest and keeps its data.
export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;
export const createAccount = (email: string, password: string, inviteCode?: string) =>
  call<{ userId: string }>(
    'POST',
    '/accounts',
    inviteCode === undefined ? { email, password } : { email, password, inviteCode, ageConfirmed: true },
  );
export const signIn = (email: string, password: string) =>
  call<{ userId: string }>('POST', '/auth/sessions', { email, password });
export const signOut = () => call<object>('DELETE', '/auth/sessions/current');
export const requestPasswordReset = (email: string) => call<object>('POST', '/auth/password-resets', { email });
export const completePasswordReset = (token: string, newPassword: string) =>
  call<object>('POST', '/auth/password-resets/complete', { token, newPassword });

// Staff (ticket 06). The server decides who may do what; canPublish only decides whether the button is offered.
export type ItemStatus = 'draft' | 'published';
export type StaffItem = {
  itemId: string;
  contentId: string;
  purpose: string;
  tier: number;
  questionCount: number;
  status: ItemStatus;
  importedAt: string;
  publishedAt: string | null;
};
// A little under the server's request body limit (Fastify default, 1 MiB), leaving room for the request around the item.
export const ITEM_FILE_MAX_BYTES = 1_000_000;
export const listStaffItems = () => call<{ canPublish: boolean; items: StaffItem[] }>('GET', '/admin/items');
export const importItem = (item: object) =>
  call<{ itemId: string; status: ItemStatus }>('POST', '/admin/items', { item });
export const publishItem = (itemId: string) =>
  call<{ itemId: string; status: ItemStatus }>('POST', `/admin/items/${encodeURIComponent(itemId)}/publish`, {});

// Learner catalogue and practice (ticket 07). The server sends no answers, route, transcript, hints or explanations
// before submit; these types hold only what it does send.
export const MICRO_SKILLS = [
  'spatial-language',
  'following-sequence',
  'landmark-vs-answer',
  'corrections-distractors',
  'orientation',
] as const;
export type MicroSkill = (typeof MICRO_SKILLS)[number];
export type Tier = 1 | 2 | 3;
export type CatalogueItem = {
  itemId: string;
  tier: Tier;
  purpose: string;
  focusSkill: MicroSkill | null;
  questionCount: number;
};
export type Point = { x: number; y: number };
// Map format v2 drawing (docs/content/map-format-v2.md); absent on a v1 map.
export type MapArea = {
  id: string;
  kind: string;
  rect?: [number, number, number, number];
  polygon?: [number, number][];
  label?: string;
  door?: { side: 'n' | 'e' | 's' | 'w'; at?: number };
};
export type MapData = {
  format?: 2;
  width: number;
  height: number;
  title?: string;
  compass?: Point & { north: number };
  areas?: MapArea[];
  paths?: { id: string; kind: string; points: [number, number][]; width?: number; label?: string }[];
  entrances?: (Point & { id: string; kind: string; side?: string; youAreHere?: boolean })[];
  symbols?: (Point & { kind: string })[];
  landmarks: (Point & {
    id: string;
    label: string;
    area?: string;
    symbol?: string;
    entrance?: string;
    path?: string;
  })[];
  targets: (Point & { label: string; area?: string })[];
};
export type DeliveredItem = {
  itemId: string;
  tier: Tier;
  purpose: string;
  focusSkill: MicroSkill | null;
  readingTimeSec: number;
  audio: { durationSec: number };
  map: MapData;
  questions: { id: string; prompt: string }[];
};
// A question id and the map letter chosen for it.
export type Answers = Record<string, string>;
export type Attempt = {
  id: string;
  itemId: string;
  mode: 'guided' | 'exam';
  status: 'open' | 'submitted';
  answers: Answers;
  score?: number; // only once submitted; the server computes it
};

export const listItems = () => call<{ items: CatalogueItem[] }>('GET', '/items');
export const getItem = (itemId: string) => call<DeliveredItem>('GET', `/items/${encodeURIComponent(itemId)}`);
export const startGuidedPractice = (itemId: string) => call<Attempt>('POST', '/attempts', { itemId, mode: 'guided' });
export const attemptAudioUrl = (attemptId: string) => `/attempts/${encodeURIComponent(attemptId)}/audio`;
// Ticket 08: the whole answer set replaces the saved one; submit sends nothing and the server scores.
export const saveAnswers = (attemptId: string, answers: Answers) =>
  call<Attempt>('PUT', `/attempts/${encodeURIComponent(attemptId)}/answers`, { answers });
export const submitAttempt = (attemptId: string) =>
  call<Attempt>('POST', `/attempts/${encodeURIComponent(attemptId)}/submit`, {});
