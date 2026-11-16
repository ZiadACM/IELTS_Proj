// The only place the web app talks to the API. Every call is same-origin and sends the session cookie.

export const TARGET_BANDS = ['5.5', '6.0', '6.5', '7.0+'] as const;
export type TargetBand = (typeof TARGET_BANDS)[number];
export type InterfaceLanguage = 'ar' | 'en';
export type Settings = { interfaceLanguage: InterfaceLanguage; targetBand: TargetBand | null };

// What the screens need to tell apart; anything else is shown as a general error.
export type Failure = 'unauthenticated' | 'not_valid' | 'age_required' | 'rate_limited' | 'offline' | 'error';
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
  if (res.status === 401) return { ok: false, failure: 'unauthenticated' };
  if (res.status === 429) return { ok: false, failure: 'rate_limited' };
  if (json?.error === 'invite_code_not_valid') return { ok: false, failure: 'not_valid' };
  if (json?.error === 'age_confirmation_required') return { ok: false, failure: 'age_required' };
  return { ok: false, failure: 'error' };
}

export const getSettings = () => call<Settings>('GET', '/me/settings');
export const updateSettings = (change: Partial<Settings>) => call<Settings>('PATCH', '/me/settings', change);
export const startGuestSession = (inviteCode: string) =>
  call<{ userId: string }>('POST', '/auth/guest-sessions', { inviteCode, ageConfirmed: true });
