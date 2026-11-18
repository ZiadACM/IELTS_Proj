// Answers are saved to the server as they change (spec story 29). A change that cannot be sent is kept on this device
// and re-sent: every few seconds, when the browser is back online, and before submit. Each save sends the whole set,
// one request at a time, so a late reply can never overwrite a newer answer.
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Answers, saveAnswers } from './api.ts';

export type SaveState = 'saved' | 'saving' | 'offline' | 'failed';

const RETRY_MS = 5_000;
const storageKey = (attemptId: string) => `masar.unsaved-answers.${attemptId}`;

// Local storage can be missing or refuse (private windows); the answers then live only in memory until sent.
function readLocal(attemptId: string): Answers | null {
  try {
    const raw = localStorage.getItem(storageKey(attemptId));
    return raw ? (JSON.parse(raw) as Answers) : null;
  } catch {
    return null;
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
  const sending = useRef<Promise<boolean> | null>(null);
  const retryTimer = useRef<number | undefined>(undefined);
  const gone = useRef(onSessionGone);
  gone.current = onSessionGone;

  // Sends until the server holds the newest answers. Resolves true when everything is saved.
  const flush = useCallback((): Promise<boolean> => {
    if (sending.current) return sending.current;
    window.clearTimeout(retryTimer.current);
    sending.current = (async () => {
      while (savedVersion.current < version.current) {
        const sent = version.current;
        setSaveState('saving');
        const res = await saveAnswers(attemptId, latest.current);
        if (!res.ok) {
          if (res.failure === 'unauthenticated') gone.current();
          const retryable = res.failure === 'offline' || res.failure === 'error';
          setSaveState(res.failure === 'offline' ? 'offline' : 'failed');
          if (retryable) retryTimer.current = window.setTimeout(() => flush(), RETRY_MS);
          return false;
        }
        savedVersion.current = sent;
      }
      writeLocal(attemptId, null);
      setSaveState('saved');
      return true;
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
      writeLocal(attemptId, next);
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
