import { type FormEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { AccountSection, ResetComplete, ResetRequest, SignIn, SignUp } from './Account.tsx';
import {
  type Failure,
  getSettings,
  type InterfaceLanguage,
  type Settings,
  startGuestSession,
  TARGET_BANDS,
  type TargetBand,
  updateSettings,
} from './api.ts';
import { STRINGS, type Strings } from './strings.ts';

type Screen =
  | 'loading'
  | 'load-failed'
  | 'onboarding'
  | 'sign-in'
  | 'sign-up'
  | 'reset-request'
  | 'reset-complete'
  | 'target-band'
  | 'home'
  | 'settings';
type SessionKind = 'guest' | 'account';

// Per-browser hint of what the last session here was, so an ended session gets the right message (spec: Failure &
// Empty States: an account returns to sign-in, a guest is told its session ended) and Settings offers the right
// account action. Every session starts in this app, which sets it; a stale value only changes which form shows, and
// the server refuses anything the session may not do.
const SESSION_KIND_KEY = 'masar.sessionKind';
function storedSessionKind(): SessionKind | null {
  try {
    const value = localStorage.getItem(SESSION_KIND_KEY);
    return value === 'guest' || value === 'account' ? value : null;
  } catch {
    return null;
  }
}
function storeSessionKind(kind: SessionKind | null) {
  try {
    if (kind) localStorage.setItem(SESSION_KIND_KEY, kind);
    else localStorage.removeItem(SESSION_KIND_KEY);
  } catch {
    // storage blocked: the hint is a convenience, the app works without it
  }
}

// A reset link carries its token in the URL fragment, which never reaches the server or a Referer (SESS-06).
const RESET_FRAGMENT = /^#reset-password=([^&]+)$/;
function takeResetToken(): string | null {
  const match = RESET_FRAGMENT.exec(window.location.hash);
  if (!match) return null;
  // Drop it from the address bar and history straight away.
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return decodeURIComponent(match[1]);
}

const otherLanguage = (language: InterfaceLanguage): InterfaceLanguage => (language === 'ar' ? 'en' : 'ar');

function failureMessage(t: Strings, failure: Failure) {
  if (failure === 'not_valid') return t.codeNotValid;
  if (failure === 'age_required') return t.adultMissing;
  if (failure === 'rate_limited') return t.rateLimited;
  if (failure === 'offline') return t.offline;
  return t.failed;
}

export function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  // Before a session exists the language lives here only; with a session the server's settings are the source.
  const [settings, setSettings] = useState<Settings>({ interfaceLanguage: 'ar', targetBand: null });
  const [sessionEnded, setSessionEnded] = useState<SessionKind | null>(null);
  const [sessionKind, setSessionKind] = useState<SessionKind | null>(storedSessionKind);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [signInNotice, setSignInNotice] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<Failure | null>(null);
  const language = settings.interfaceLanguage;
  const t = STRINGS[language];
  const signedIn = screen === 'target-band' || screen === 'home' || screen === 'settings';

  const startedSession = (kind: SessionKind) => {
    setSessionEnded(null);
    setSignInNotice(null);
    setSessionKind(kind);
    storeSessionKind(kind);
  };

  // The session is gone (expired, signed out elsewhere, or deleted): an account goes to sign-in, a guest to the start.
  const sessionGone = useCallback(() => {
    const kind = storedSessionKind();
    setSessionEnded(kind);
    setSessionKind(null);
    storeSessionKind(null);
    setScreen(kind === 'account' ? 'sign-in' : 'onboarding');
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.title = t.appName;
  }, [language, t]);

  const load = useCallback(async () => {
    setScreen('loading');
    const res = await getSettings();
    if (res.ok) {
      setSettings(res.value);
      setScreen('home');
    } else if (res.failure === 'unauthenticated') sessionGone();
    else setScreen('load-failed');
  }, [sessionGone]);

  useEffect(() => {
    const token = takeResetToken();
    if (token) {
      setResetToken(token);
      setScreen('reset-complete');
    } else load();
  }, [load]);

  // Saves a settings change for a signed-in guest. Returns whether it was saved.
  const save = async (change: Partial<Settings>) => {
    setSettingsError(null);
    const res = await updateSettings(change);
    if (res.ok) {
      setSettings(res.value);
      return true;
    }
    if (res.failure === 'unauthenticated') sessionGone();
    else setSettingsError(res.failure);
    return false;
  };

  const switchLanguage = async (next: InterfaceLanguage) => {
    if (!signedIn) return setSettings((s) => ({ ...s, interfaceLanguage: next }));
    await save({ interfaceLanguage: next });
  };

  const onSessionStarted = async (kind: SessionKind) => {
    startedSession(kind);
    setScreen('target-band');
    // Keep a language chosen before the session existed; a failure shows on the next screen.
    if (language !== 'ar') await save({ interfaceLanguage: language });
  };

  return (
    <>
      <header className="app-header">
        <span className="app-name">{t.appName}</span>
        <button type="button" lang={otherLanguage(language)} onClick={() => switchLanguage(otherLanguage(language))}>
          {t.switchLabel}
        </button>
      </header>
      <main className="app-main">
        {screen === 'loading' && <p role="status">{t.loading}</p>}
        {screen === 'load-failed' && (
          <section className="panel">
            <p role="alert">{t.loadFailed}</p>
            <button type="button" className="primary" onClick={load}>
              {t.retry}
            </button>
          </section>
        )}
        {screen === 'onboarding' && (
          <Onboarding
            t={t}
            sessionEnded={sessionEnded === 'guest'}
            onStarted={() => onSessionStarted('guest')}
            onSignIn={() => setScreen('sign-in')}
            onSignUp={() => setScreen('sign-up')}
          />
        )}
        {screen === 'sign-in' && (
          <SignIn
            t={t}
            notice={signInNotice ?? (sessionEnded === 'account' ? t.sessionEndedAccount : null)}
            onSignedIn={() => {
              startedSession('account');
              load();
            }}
            onForgot={() => setScreen('reset-request')}
            onBack={() => setScreen('onboarding')}
          />
        )}
        {screen === 'sign-up' && (
          <SignUp t={t} onCreated={() => onSessionStarted('account')} onBack={() => setScreen('onboarding')} />
        )}
        {screen === 'reset-request' && <ResetRequest t={t} onBack={() => setScreen('sign-in')} />}
        {screen === 'reset-complete' && resetToken && (
          <ResetComplete
            t={t}
            token={resetToken}
            onDone={(done) => {
              setResetToken(null);
              // A reset ends every session of the account, so the next step is always sign-in.
              setSignInNotice(done ? t.resetDone : null);
              if (done) {
                storeSessionKind(null);
                setScreen('sign-in');
              } else load();
            }}
          />
        )}
        {screen === 'target-band' && (
          <TargetBandStep
            t={t}
            error={settingsError}
            onChoose={async (targetBand) => {
              if (await save({ targetBand })) setScreen('home');
            }}
            onSkip={() => setScreen('home')}
          />
        )}
        {screen === 'home' && (
          <section className="panel">
            <h1>{t.homeTitle}</h1>
            <p>{t.homeEmpty}</p>
            <button type="button" onClick={() => setScreen('settings')}>
              {t.settings}
            </button>
          </section>
        )}
        {screen === 'settings' && (
          <SettingsScreen
            t={t}
            settings={settings}
            error={settingsError}
            save={save}
            onBack={() => setScreen('home')}
            account={
              <AccountSection
                t={t}
                isGuest={sessionKind !== 'account'}
                onUpgraded={() => startedSession('account')}
                onSignedOut={() => {
                  setSessionKind(null);
                  storeSessionKind(null);
                  setSessionEnded(null);
                  setSettings((s) => ({ ...s, targetBand: null }));
                  setScreen('sign-in');
                }}
              />
            }
          />
        )}
      </main>
    </>
  );
}

function Onboarding({
  t,
  sessionEnded,
  onStarted,
  onSignIn,
  onSignUp,
}: {
  t: Strings;
  sessionEnded: boolean;
  onStarted: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}) {
  const [code, setCode] = useState('');
  const [adult, setAdult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeId = useId();
  const hintId = useId();
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return setError(t.codeMissing);
    if (!adult) return setError(t.adultMissing);
    setError(null);
    setBusy(true);
    const res = await startGuestSession(code);
    setBusy(false);
    if (res.ok) onStarted();
    else setError(failureMessage(t, res.failure));
  };

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h1>{t.welcomeTitle}</h1>
      {sessionEnded && <p className="notice">{t.sessionEnded}</p>}
      <p>{t.welcomeIntro}</p>
      <div className="field">
        <label htmlFor={codeId}>{t.inviteCodeLabel}</label>
        <input
          id={codeId}
          dir="ltr"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={64}
          aria-describedby={hintId}
          aria-invalid={error === t.codeMissing || error === t.codeNotValid}
        />
        <p id={hintId} className="hint">
          {t.inviteCodeHint}
        </p>
      </div>
      <label className="check">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
        <span>{t.adultConfirm}</span>
      </label>
      {error && (
        <p className="error" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </p>
      )}
      <button type="submit" className="primary" disabled={busy}>
        {busy ? t.starting : t.start}
      </button>
      <button type="button" className="link" onClick={onSignIn}>
        {t.haveAccount}
      </button>
      <button type="button" className="link" onClick={onSignUp}>
        {t.signUpWithCode}
      </button>
    </form>
  );
}

function TargetBandStep({
  t,
  error,
  onChoose,
  onSkip,
}: {
  t: Strings;
  error: Failure | null;
  onChoose: (band: TargetBand) => void;
  onSkip: () => void;
}) {
  const titleId = useId();
  return (
    <section className="panel" aria-labelledby={titleId}>
      <h1 id={titleId}>{t.targetBandTitle}</h1>
      <p>{t.targetBandIntro}</p>
      <fieldset className="band-choices" aria-labelledby={titleId}>
        {TARGET_BANDS.map((band) => (
          <button key={band} type="button" dir="ltr" onClick={() => onChoose(band)}>
            {band}
          </button>
        ))}
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {failureMessage(t, error)}
        </p>
      )}
      <button type="button" className="link" onClick={onSkip}>
        {t.skip}
      </button>
    </section>
  );
}

function SettingsScreen({
  t,
  settings,
  error,
  save,
  onBack,
  account,
}: {
  t: Strings;
  settings: Settings;
  error: Failure | null;
  save: (change: Partial<Settings>) => Promise<boolean>;
  onBack: () => void;
  account: ReactNode;
}) {
  const [saved, setSaved] = useState(false);
  const bandId = useId();
  const change = async (update: Partial<Settings>) => {
    setSaved(false);
    setSaved(await save(update));
  };

  return (
    <section className="panel">
      <h1>{t.settings}</h1>
      <fieldset className="field">
        <legend>{t.languageLabel}</legend>
        {(['ar', 'en'] as const).map((value) => (
          <label key={value} className="check" lang={value}>
            <input
              type="radio"
              name="interface-language"
              checked={settings.interfaceLanguage === value}
              onChange={() => change({ interfaceLanguage: value })}
            />
            <span>{value === 'ar' ? t.arabic : t.english}</span>
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor={bandId}>{t.targetBandLabel}</label>
        <select
          id={bandId}
          value={settings.targetBand ?? ''}
          onChange={(e) => change({ targetBand: (e.target.value || null) as TargetBand | null })}
        >
          <option value="">{t.targetBandNone}</option>
          {TARGET_BANDS.map((band) => (
            <option key={band} value={band}>
              {band}
            </option>
          ))}
        </select>
      </div>
      <p role="status" className={error ? 'error' : 'hint'}>
        {error ? failureMessage(t, error) : saved ? t.saved : ''}
      </p>
      {account}
      <button type="button" onClick={onBack}>
        {t.backHome}
      </button>
    </section>
  );
}
