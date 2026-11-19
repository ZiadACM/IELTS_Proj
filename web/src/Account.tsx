// Account screens (ticket 05): create an account with an invite code, upgrade a guest, sign in, sign out, reset a
// password. Design pass (Impeccable critique/audit) and browser checks are deferred to ticket 07, as for ticket 04.
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import {
  completePasswordReset,
  createAccount,
  type Failure,
  PASSWORD_MAX,
  PASSWORD_MIN,
  requestPasswordReset,
  signIn,
  signOut,
} from './api.ts';
import { forgetUnsavedAnswers } from './saved-answers.ts';
import type { Strings } from './strings.ts';

export function accountFailureMessage(t: Strings, failure: Failure) {
  if (failure === 'not_valid') return t.codeNotValid;
  if (failure === 'age_required') return t.adultMissing;
  if (failure === 'rate_limited') return t.rateLimited;
  if (failure === 'invalid_credentials') return t.invalidCredentials;
  if (failure === 'email_taken') return t.emailTaken;
  if (failure === 'reset_not_valid') return t.resetNotValid;
  if (failure === 'already_signed_in') return t.signOutFirst;
  if (failure === 'offline') return t.offline;
  return t.failed;
}

// A form's single error line: announced, and focused so keyboard and screen reader users land on it.
function useFormError() {
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  const node = error && (
    <p className="error" role="alert" tabIndex={-1} ref={ref}>
      {error}
    </p>
  );
  return { error, setError, node };
}

// Client-side checks only save a round trip; the server validates the same rules.
function credentialProblem(t: Strings, email: string, password: string) {
  if (!email.trim()) return t.emailMissing;
  if (password.length < PASSWORD_MIN) return t.passwordTooShort;
  return null;
}

function EmailField({ t, value, onChange }: { t: Strings; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{t.emailLabel}</label>
      <input
        id={id}
        type="email"
        dir="ltr"
        autoComplete="email"
        maxLength={254}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function PasswordField({
  t,
  label,
  isNew,
  value,
  onChange,
}: {
  t: Strings;
  label: string;
  isNew: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  const hintId = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="password"
        dir="ltr"
        autoComplete={isNew ? 'new-password' : 'current-password'}
        maxLength={PASSWORD_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={isNew ? hintId : undefined}
      />
      {isNew && (
        <p id={hintId} className="hint">
          {t.passwordHint}
        </p>
      )}
    </div>
  );
}

function Form({ title, children, onSubmit }: { title: string; children: ReactNode; onSubmit: (e: FormEvent) => void }) {
  return (
    <form className="panel" onSubmit={onSubmit} noValidate>
      <h1>{title}</h1>
      {children}
    </form>
  );
}

export function SignIn({
  t,
  notice,
  onSignedIn,
  onForgot,
  onBack,
}: {
  t: Strings;
  notice: string | null;
  onSignedIn: () => void;
  onForgot: () => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { setError, node } = useFormError();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return setError(t.emailMissing);
    if (!password) return setError(t.invalidCredentials);
    setError(null);
    setBusy(true);
    const res = await signIn(email.trim(), password);
    setBusy(false);
    if (res.ok) onSignedIn();
    else setError(accountFailureMessage(t, res.failure));
  };

  return (
    <Form title={t.signInTitle} onSubmit={submit}>
      {notice && <p className="notice">{notice}</p>}
      <EmailField t={t} value={email} onChange={setEmail} />
      <PasswordField t={t} label={t.passwordLabel} isNew={false} value={password} onChange={setPassword} />
      {node}
      <button type="submit" className="primary" disabled={busy}>
        {busy ? t.signingIn : t.signIn}
      </button>
      <button type="button" className="link" onClick={onForgot}>
        {t.forgotPassword}
      </button>
      <button type="button" className="link" onClick={onBack}>
        {t.backToStart}
      </button>
    </Form>
  );
}

// Without a session: an account needs an invite code and the 18+ confirmation, like a guest session.
export function SignUp({ t, onCreated, onBack }: { t: Strings; onCreated: () => void; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const { setError, node } = useFormError();
  const codeId = useId();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = credentialProblem(t, email, password);
    if (problem) return setError(problem);
    if (!code.trim()) return setError(t.codeMissing);
    if (!adult) return setError(t.adultMissing);
    setError(null);
    setBusy(true);
    const res = await createAccount(email.trim(), password, code);
    setBusy(false);
    if (res.ok) onCreated();
    else setError(accountFailureMessage(t, res.failure));
  };

  return (
    <Form title={t.signUpTitle} onSubmit={submit}>
      <p>{t.signUpIntro}</p>
      <EmailField t={t} value={email} onChange={setEmail} />
      <PasswordField t={t} label={t.passwordLabel} isNew value={password} onChange={setPassword} />
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
        />
      </div>
      <label className="check">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
        <span>{t.adultConfirm}</span>
      </label>
      {node}
      <button type="submit" className="primary" disabled={busy}>
        {busy ? t.creatingAccount : t.createAccount}
      </button>
      <button type="button" className="link" onClick={onBack}>
        {t.backToStart}
      </button>
    </Form>
  );
}

export function ResetRequest({ t, onBack }: { t: Strings; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { setError, node } = useFormError();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return setError(t.emailMissing);
    setError(null);
    setBusy(true);
    const res = await requestPasswordReset(email.trim());
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(accountFailureMessage(t, res.failure));
  };

  return (
    <Form title={t.resetRequestTitle} onSubmit={submit}>
      {sent ? (
        <p role="status">{t.resetRequested}</p>
      ) : (
        <>
          <p>{t.resetRequestIntro}</p>
          <EmailField t={t} value={email} onChange={setEmail} />
          {node}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? t.sending : t.sendResetLink}
          </button>
        </>
      )}
      <button type="button" className="link" onClick={onBack}>
        {t.backToStart}
      </button>
    </Form>
  );
}

export function ResetComplete({ t, token, onDone }: { t: Strings; token: string; onDone: (done: boolean) => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { setError, node } = useFormError();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < PASSWORD_MIN) return setError(t.passwordTooShort);
    setError(null);
    setBusy(true);
    const res = await completePasswordReset(token, password);
    setBusy(false);
    if (res.ok) onDone(true);
    else setError(accountFailureMessage(t, res.failure));
  };

  return (
    <Form title={t.resetCompleteTitle} onSubmit={submit}>
      <PasswordField t={t} label={t.newPasswordLabel} isNew value={password} onChange={setPassword} />
      {node}
      <button type="submit" className="primary" disabled={busy}>
        {busy ? t.saving : t.setPassword}
      </button>
      <button type="button" className="link" onClick={() => onDone(false)}>
        {t.backToStart}
      </button>
    </Form>
  );
}

// The Settings "Account" section. A guest may create an account (keeps its data); an account holder may sign out.
// A guest is not offered sign-out: without an account it could never come back to its data.
export function AccountSection({
  t,
  isGuest,
  onUpgraded,
  onSignedOut,
}: {
  t: Strings;
  isGuest: boolean;
  onUpgraded: () => void;
  onSignedOut: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [upgraded, setUpgraded] = useState(false);
  const { setError, node } = useFormError();
  const titleId = useId();

  const upgrade = async (event: FormEvent) => {
    event.preventDefault();
    const problem = credentialProblem(t, email, password);
    if (problem) return setError(problem);
    setError(null);
    setBusy(true);
    const res = await createAccount(email.trim(), password);
    setBusy(false);
    // already_signed_in: this browser's guest hint was stale and the session is an account already.
    if (res.ok || res.failure === 'already_signed_in') {
      setUpgraded(res.ok);
      onUpgraded();
    } else setError(accountFailureMessage(t, res.failure));
  };

  const leave = async () => {
    setError(null);
    setBusy(true);
    const res = await signOut();
    setBusy(false);
    if (res.ok || res.failure === 'unauthenticated') {
      forgetUnsavedAnswers();
      onSignedOut();
    } else setError(accountFailureMessage(t, res.failure));
  };

  return (
    <section className="field account" aria-labelledby={titleId}>
      <h2 id={titleId}>{t.accountLabel}</h2>
      {isGuest ? (
        <form onSubmit={upgrade} noValidate>
          <p>{t.guestAccountIntro}</p>
          <EmailField t={t} value={email} onChange={setEmail} />
          <PasswordField t={t} label={t.passwordLabel} isNew value={password} onChange={setPassword} />
          {node}
          <button type="submit" className="primary" disabled={busy}>
            {busy ? t.creatingAccount : t.createAccount}
          </button>
        </form>
      ) : (
        <>
          <p role="status">{upgraded ? t.accountUpgraded : t.signedInWithAccount}</p>
          {node}
          <button type="button" onClick={leave} disabled={busy}>
            {busy ? t.signingOut : t.signOut}
          </button>
        </>
      )}
    </section>
  );
}
