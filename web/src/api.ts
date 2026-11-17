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
  | 'offline'
  | 'error';
export type Result<T> = { ok: true; value: T } | { ok: false; failure: Failure };

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
