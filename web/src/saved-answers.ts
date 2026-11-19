// Answers are saved to the server as they change (spec story 29). A change that cannot be sent is kept on this device
// and re-sent: every few seconds, when the browser is back online, and before submit. Each save sends the whole set,
// one request at a time, so a late reply can never overwrite a newer answer. Only a failure that can pass (no
// connection, a server error, too many requests) is re-sent; a refusal stops saving and says why.
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Answers, type Failure, saveAnswers } from './api.ts';

// 'retrying': not saved, sent again shortly. 'closed': the attempt is submitted or gone. 'rejected': the server refused
// these answers. 'closed' and 'rejected' are final: nothing more is sent.
export type SaveState = 'saved' | 'saving' | 'offline' | 'retrying' | 'closed' | 'rejected';
type Stopped = 'closed' | 'rejected';

export function stateAfter(failure: Failure): Exclude<SaveState, 'saved' | 'saving'> {
  if (failure === 'offline') return 'offline';
  if (failure === 'error' || failure === 'rate_limited') return 'retrying';
  if (failure === 'attempt_submitted' || failure === 'not_found' || failure === 'forbidden') return 'closed';
  return 'rejected';
}

const RETRY_MS = 5_000;
const STORAGE_PREFIX = 'masar.unsaved-answers.';
const storageKey = (attemptId: string) => `${STORAGE_PREFIX}${attemptId}`;

// Local storage can be missing or refuse (private windows); the answers then live only in memory until sent.
function readLocal(attemptId: string): Answers | null {
  try {
    const raw = localStorage.getItem(storageKey(attemptId));
    return raw ? (JSON.parse(raw) as Answers) : null;
  } catch {
    return null;
  }
}
// Signing out leaves nothing of this learner's answers on a shared device (CS 2.6).
export function forgetUnsavedAnswers() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(STORAGE_PREFIX)) localStorage.removeItem(key);
  } catch {
    // no storage, nothing kept
  }
}
function writeLocal(attemptId: string, answers: Answers | null) {
  try {
    if (answers) localStorage.setItem(storageKey(attemptId), JSON.stringify(answers));
    else localStorage.removeItem(storageKey(attemptId));
  } catch {
    // shortcut: without storage, unsaved answers survive only while the page is open; the save line still says so
  }
}

export function useSavedAnswers(attemptId: string, serverAnswers: Answers, onSessionGone: () => void) {
  // Answers this device could not send last time win over the server's copy: they are newer.
  const [initial] = useState(() => readLocal(attemptId));
  const [answers, setAnswers] = useState<Answers>(initial ?? serverAnswers);
  const [saveState, setSaveState] = useState<SaveState>(initial ? 'saving' : 'saved');
  const latest = useRef(answers);
  const version = useRef(initial ? 1 : 0);
  const savedVersion = useRef(0);
  const sending = useRef<Promise<SaveState> | null>(null);
  const stopped = useRef<Stopped | null>(null);
  const retryTimer = useRef<number | undefined>(undefined);
  const gone = useRef(onSessionGone);
  gone.current = onSessionGone;

  // Sends until the server holds the newest answers. Resolves to the save state it ends in ('saved' when all is saved).
  const flush = useCallback((): Promise<SaveState> => {
    if (stopped.current) return Promise.resolve(stopped.current);
    if (sending.current) return sending.current;
    window.clearTimeout(retryTimer.current);
    sending.current = (async (): Promise<SaveState> => {
      while (savedVersion.current < version.current) {
        const sent = version.current;
        setSaveState('saving');
        const res = await saveAnswers(attemptId, latest.current);
        if (!res.ok) {
          if (res.failure === 'unauthenticated') {
            gone.current(); // the answers stay on this device for the next sign-in
            return 'retrying';
          }
          const state = stateAfter(res.failure);
          setSaveState(state);
          if (state === 'closed' || state === 'rejected') {
            // The server will never take this copy, so keeping it on the device would only re-send it on every visit.
            stopped.current = state;
            writeLocal(attemptId, null);
          } else retryTimer.current = window.setTimeout(() => flush(), RETRY_MS);
          return state;
        }
        savedVersion.current = sent;
      }
      writeLocal(attemptId, null);
      setSaveState('saved');
      return 'saved';
    })().finally(() => {
      sending.current = null;
    });
    return sending.current;
  }, [attemptId]);

  const setAnswer = useCallback(
    (questionId: string, letter: string | null) => {
      const next = { ...latest.current };
      if (letter) next[questionId] = letter;
      else delete next[questionId];
      latest.current = next;
      version.current += 1;
      setAnswers(next);
      if (!stopped.current) writeLocal(attemptId, next);
      flush();
    },
    [attemptId, flush],
  );

  useEffect(() => {
    if (version.current > savedVersion.current) flush();
    const online = () => flush();
    window.addEventListener('online', online);
    return () => {
      window.removeEventListener('online', online);
      window.clearTimeout(retryTimer.current);
    };
  }, [flush]);

  return { answers, saveState, setAnswer, flush };
}
