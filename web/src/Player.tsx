// The item player shell (ticket 07; spec stories 14 to 16, 20, 21, 30): reading time (skippable in guided practice),
// the map and question list, and the first listen, which plays straight through with no pause or seek. The
// uninterrupted first listen is an interaction rule in the client (spec: Audio delivery). Ticket 08 adds answering
// (a tap on the map or a letter from the list, spec stories 17 to 19), saving as the learner goes, and submit. Ticket
// 09 opens the review in place after submit.
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import {
  type Attempt,
  attemptAudioUrl,
  type DeliveredItem,
  getItem,
  startGuidedPractice,
  submitAttempt,
} from './api.ts';
import { ItemMap } from './ItemMap.tsx';
import { Review } from './Review.tsx';
import { type SaveState, stateAfter, useSavedAnswers } from './saved-answers.ts';
import type { Strings } from './strings.ts';

type Loaded = { item: DeliveredItem; attempt: Attempt };
type Phase = 'reading' | 'listening' | 'finished';
type AudioState = 'waiting-to-start' | 'playing' | 'buffering' | 'blocked' | 'failed';

const STALL_LIMIT_MS = 10_000; // buffering longer than this offers a retry
const MEDIA_ACTIONS: MediaSessionAction[] = [
  'pause',
  'seekbackward',
  'seekforward',
  'seekto',
  'previoustrack',
  'nexttrack',
];

// React sets this through the CSSOM, which the page's CSP allows (it forbids inline style attributes in markup).
const lineShare = (share: number) => ({ '--share': share }) as CSSProperties;

const minutesSeconds = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Hardware keys and lock-screen controls must not pause or seek the first listen either.
function holdMediaControls(hold: boolean) {
  if (!('mediaSession' in navigator)) return;
  for (const action of MEDIA_ACTIONS) {
    try {
      navigator.mediaSession.setActionHandler(action, hold ? () => {} : null);
    } catch {
      // shortcut: a browser without this action has no key for it to hold, so there is nothing to report
    }
  }
}

type ScreenProps = {
  t: Strings;
  mapNumber: number | null;
  onBack: () => void;
  onSessionGone: () => void;
};

export function Player({ itemId, ...screen }: ScreenProps & { itemId: string }) {
  const { t, onBack, onSessionGone } = screen;
  const [loaded, setLoaded] = useState<Loaded | 'loading' | 'not-found' | 'failed'>('loading');

  const load = useCallback(async () => {
    setLoaded('loading');
    const [item, attempt] = await Promise.all([getItem(itemId), startGuidedPractice(itemId)]);
    if (!item.ok || !attempt.ok) {
      const failure = !item.ok ? item.failure : !attempt.ok ? attempt.failure : 'error';
      if (failure === 'unauthenticated') return onSessionGone();
      return setLoaded(failure === 'not_found' ? 'not-found' : 'failed');
    }
    setLoaded({ item: item.value, attempt: attempt.value });
  }, [itemId, onSessionGone]);

  useEffect(() => {
    load();
  }, [load]);

  if (loaded === 'loading') return <p role="status">{t.loading}</p>;
  if (loaded === 'not-found' || loaded === 'failed')
    return (
      <section className="panel">
        <p role="alert">{loaded === 'not-found' ? t.itemNotFound : t.loadFailed}</p>
        {loaded === 'failed' && (
          <button type="button" className="primary" onClick={load}>
            {t.retry}
          </button>
        )}
        <button type="button" onClick={onBack}>
          {t.backToMaps}
        </button>
      </section>
    );
  return <PlayerScreen key={loaded.attempt.id} {...screen} {...loaded} />;
}

function PlayerScreen({ t, mapNumber, onBack, onSessionGone, item, attempt }: ScreenProps & Loaded) {
  const [phase, setPhase] = useState<Phase>('reading');
  const [secondsLeft, setSecondsLeft] = useState(item.readingTimeSec);
  const [audioState, setAudioState] = useState<AudioState>('waiting-to-start');
  const [position, setPosition] = useState(0);
  const [announcement, setAnnouncement] = useState(() => t.readingAnnounce(item.readingTimeSec));
  const audioRef = useRef<HTMLAudioElement>(null);
  const phaseRef = useRef<Phase | 'left'>('reading');
  const strip = useRef<HTMLDivElement>(null);
  const furthest = useRef(0); // the furthest point played: a retry resumes here, never earlier
  const stallTimer = useRef<number | undefined>(undefined);
  // The strings in a ref: switching language mid-listen re-labels the screen and must not restart anything.
  const strings = useRef(t);
  strings.current = t;

  const { answers, saveState, setAnswer, flush } = useSavedAnswers(attempt.id, attempt.answers, onSessionGone);
  const [activeQuestion, setActiveQuestion] = useState(item.questions[0]?.id);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'offline' | 'failed' | 'closed' | 'rejected'>(
    'idle',
  );
  const [result, setResult] = useState<Attempt | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
    } catch (error) {
      const blocked = (error as DOMException).name === 'NotAllowedError';
      setAudioState(blocked ? 'blocked' : 'failed');
      // A screen reader must hear that the audio waits for a tap (a failure is announced by its alert).
      if (blocked) setAnnouncement(strings.current.audioBlocked);
    }
  }, []);

  const beginListening = useCallback(() => {
    if (phaseRef.current !== 'reading') return;
    phaseRef.current = 'listening';
    // "Start now" is about to disappear: keep keyboard focus on the status it leads to, not on the page.
    if (strip.current?.contains(document.activeElement)) strip.current.focus();
    setPhase('listening');
    holdMediaControls(true);
    play();
  }, [play]);

  // Reading time: counted against the clock, so a busy tab cannot stretch it.
  const readingTimeSec = item.readingTimeSec;
  useEffect(() => {
    const endsAt = Date.now() + readingTimeSec * 1000;
    const timer = window.setInterval(() => {
      const left = Math.ceil((endsAt - Date.now()) / 1000);
      setSecondsLeft(Math.max(0, left));
      if (left <= 0) {
        window.clearInterval(timer);
        beginListening();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [readingTimeSec, beginListening]);

  // Leaving the screen stops the audio and gives the media keys back.
  useEffect(
    () => () => {
      phaseRef.current = 'left';
      window.clearTimeout(stallTimer.current);
      audioRef.current?.pause();
      holdMediaControls(false);
    },
    [],
  );

  const retry = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setAudioState('buffering');
    audio.addEventListener(
      'loadedmetadata',
      () => {
        audio.currentTime = furthest.current;
      },
      { once: true },
    );
    audio.load();
    play();
  };

  const duration = item.audio.durationSec;
  const submitted = result !== null;
  // The server refused for good (attempt submitted elsewhere or gone, or answers refused): answering and submit stop.
  const ended =
    saveState === 'closed' || saveState === 'rejected'
      ? saveState
      : submitState === 'closed' || submitState === 'rejected'
        ? submitState
        : null;
  const locked = submitted || ended !== null;
  const unanswered = item.questions.filter((q) => !answers[q.id]).length;
  const activeIndex = item.questions.findIndex((q) => q.id === activeQuestion);

  // A letter picked on the map answers the active question, then moves on to the next question without an answer.
  const pickOnMap = (letter: string) => {
    if (locked || !activeQuestion) return;
    setAnswer(activeQuestion, letter);
    const after = [...item.questions.slice(activeIndex + 1), ...item.questions.slice(0, activeIndex)];
    const next = after.find((q) => !answers[q.id]);
    if (next) setActiveQuestion(next.id);
  };

  const submit = async () => {
    setSubmitState('submitting');
    // A save that stopped for good already says why on the save line; submit then has nothing to add.
    const saved = await flush();
    if (saved !== 'saved')
      return setSubmitState(saved === 'offline' ? 'offline' : saved === 'retrying' ? 'failed' : 'idle');
    const res = await submitAttempt(attempt.id);
    if (!res.ok) {
      if (res.failure === 'unauthenticated') return onSessionGone();
      const state = stateAfter(res.failure);
      return setSubmitState(state === 'offline' ? 'offline' : state === 'retrying' ? 'failed' : state);
    }
    stopListening();
    setResult(res.value);
    setSubmitState('idle');
    // The score waits for Review (spec story 31, ticket 09); submit only confirms the answers were sent (owner, 2026-11-19).
    setAnnouncement(t.submitted);
    strip.current?.focus();
  };
  // An attempt that is closed (submitted or refused for good) ends the listen: the audio stops, reading time cannot start
  // it, and the media keys are given back.
  const stopListening = useCallback(() => {
    phaseRef.current = 'finished';
    window.clearTimeout(stallTimer.current);
    audioRef.current?.pause();
    holdMediaControls(false);
  }, []);
  useEffect(() => {
    if (ended) stopListening();
  }, [ended, stopListening]);
  const share = (value: number, of: number) => Math.min(1, Math.max(0, value / of));

  return (
    <article className="player">
      <header className="stub">
        <h1>{mapNumber ? t.mapName(item.tier, mapNumber) : t.guidedPractice}</h1>
        <dl className="stub-facts">
          <div>
            <dt>{t.itemTier}</dt>
            <dd>{item.tier}</dd>
          </div>
          <div>
            <dt>{t.itemQuestions}</dt>
            <dd>{item.questions.length}</dd>
          </div>
          <div>
            <dt className="visually-hidden">{t.guidedPractice}</dt>
            <dd className="stub-mode">
              {item.focusSkill ? `${t.skillChallenge}: ${t.microSkills[item.focusSkill]}` : t.guidedPractice}
            </dd>
          </div>
        </dl>
      </header>
      <div className="perforation" aria-hidden="true" />
      <p className="unofficial">{t.unofficial}</p>

      {reviewing ? (
        <Review t={t} item={item} attemptId={attempt.id} onSessionGone={onSessionGone} />
      ) : (
        <>
          <div className="status-strip" ref={strip} tabIndex={-1}>
            {submitted && (
              <div className="status-row done">
                <svg className="done-mark" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="11" />
                  <path d="M7 12.5l3.2 3.2L17 9" />
                </svg>
                <div>
                  <p className="status-text">{t.submitted}</p>
                </div>
                <button type="button" className="primary" onClick={() => setReviewing(true)}>
                  {t.seeReview}
                </button>
              </div>
            )}
            {ended && (
              <div className="status-row">
                <p className="status-text error" role="alert">
                  {ended === 'closed' ? t.saveClosed : t.saveRejected}
                </p>
                <button type="button" className="primary" onClick={onBack}>
                  {t.backToMaps}
                </button>
              </div>
            )}
            {!locked && phase === 'reading' && (
              <>
                <div className="status-row">
                  <p className="status-text">{t.readingCountdown(secondsLeft)}</p>
                  <button type="button" className="primary" onClick={beginListening}>
                    {t.startNow}
                  </button>
                </div>
                <div className="time-line" aria-hidden="true">
                  <span style={lineShare(share(secondsLeft, item.readingTimeSec))} />
                </div>
              </>
            )}
            {!locked && phase === 'listening' && audioState === 'blocked' && (
              <div className="status-row">
                <p className="status-text">{t.audioBlocked}</p>
                <button type="button" className="primary" onClick={play}>
                  {t.startAudio}
                </button>
              </div>
            )}
            {!locked && phase === 'listening' && audioState === 'failed' && (
              <div className="status-row">
                <p className="status-text error" role="alert">
                  {furthest.current > 0 ? t.audioFailed : t.audioNotLoaded}
                </p>
                <button type="button" className="primary" onClick={retry}>
                  {t.retry}
                </button>
              </div>
            )}
            {!locked && phase === 'listening' && audioState !== 'blocked' && audioState !== 'failed' && (
              <>
                <p className="status-text">
                  {audioState === 'playing'
                    ? t.playing(minutesSeconds(position), minutesSeconds(duration))
                    : t.audioLoading}
                </p>
                <div className="time-line" aria-hidden="true">
                  <span style={lineShare(share(position, duration))} />
                </div>
                <p className="status-note">{t.firstListenRule}</p>
              </>
            )}
            {!locked && phase === 'finished' && (
              <div className="status-row done">
                <svg className="done-mark" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="11" />
                  <path d="M7 12.5l3.2 3.2L17 9" />
                </svg>
                <div>
                  <p className="status-text">{t.firstListenDone}</p>
                  <p className="status-note">{t.checkThenSubmit}</p>
                </div>
              </div>
            )}
          </div>
          <p className="visually-hidden" role="status">
            {announcement}
          </p>

          <div className="map-frame">
            {!locked && activeIndex >= 0 && (
              <p className="map-prompt" aria-hidden="true">
                {t.tapToAnswer(activeIndex + 1)}
              </p>
            )}
            <ItemMap
              map={item.map}
              label={t.mapLabel}
              picked={!locked && activeQuestion ? answers[activeQuestion] : undefined}
              onPick={locked ? undefined : pickOnMap}
            />
          </div>

          <section className="questions" aria-labelledby="questions-title">
            <h2 id="questions-title">{t.itemQuestions}</h2>
            <p>{t.questionsIntro}</p>
            <ol>
              {item.questions.map((q, index) => {
                const active = !locked && q.id === activeQuestion;
                return (
                  <li key={q.id} className={active ? 'active' : undefined}>
                    {/* Picks which question a tap on the map answers. */}
                    <button
                      type="button"
                      className="question-number"
                      aria-pressed={active}
                      aria-label={t.answerOnMap(index + 1)}
                      disabled={locked}
                      onClick={() => setActiveQuestion(q.id)}
                    >
                      {index + 1}
                    </button>
                    <span className="question-prompt" dir="ltr" lang="en" id={`prompt-${q.id}`}>
                      {q.prompt}
                    </span>
                    <select
                      className="answer-choice"
                      aria-label={t.answerFor(index + 1)}
                      aria-describedby={`prompt-${q.id}`}
                      value={answers[q.id] ?? ''}
                      disabled={locked}
                      onFocus={() => setActiveQuestion(q.id)}
                      onChange={(e) => setAnswer(q.id, e.target.value || null)}
                    >
                      <option value="">{t.noAnswer}</option>
                      {item.map.targets.map((target) => (
                        <option key={target.label} value={target.label}>
                          {target.label}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ol>
            {!locked && (
              <div className="submit-area">
                {/* Quiet while saving works (no announcement on every answer); a save that fails is announced. */}
                {saveState === 'saved' || saveState === 'saving' ? (
                  <p className="save-line">{saveLine(t, saveState)}</p>
                ) : (
                  <p className="save-line error" role="alert">
                    {saveLine(t, saveState)}
                  </p>
                )}
                {unanswered > 0 && <p className="status-note">{t.unanswered(unanswered)}</p>}
                {(submitState === 'offline' || submitState === 'failed') && (
                  <p className="error" role="alert">
                    {submitState === 'offline' ? t.submitOffline : t.submitFailed}
                  </p>
                )}
                {/* Submit waits for the end of the first listen, so a stray tap cannot end the attempt early (owner,
                2026-11-19). */}
                {phase === 'finished' ? (
                  <button type="button" className="primary" disabled={submitState === 'submitting'} onClick={submit}>
                    {submitState === 'submitting' ? t.submitting : t.submitAnswers}
                  </button>
                ) : (
                  <p className="status-note">{t.submitAfterListen}</p>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <button type="button" className="quiet back" onClick={onBack}>
        {t.backToMaps}
      </button>

      {/* No controls attribute: the first listen offers no pause or seek. Gone once submitted (the server closes it). */}
      {!submitted && (
        // biome-ignore lint/a11y/useMediaCaption: captions would be the transcript, which reaches the learner only in review (CS 2.2, 4.6).
        <audio
          ref={audioRef}
          src={attemptAudioUrl(attempt.id)}
          preload="auto"
          onPlaying={() => {
            window.clearTimeout(stallTimer.current);
            setAudioState('playing');
            setAnnouncement(t.playingAnnounce);
          }}
          onWaiting={() => {
            setAudioState('buffering');
            window.clearTimeout(stallTimer.current);
            stallTimer.current = window.setTimeout(() => setAudioState('failed'), STALL_LIMIT_MS);
          }}
          onTimeUpdate={(e) => {
            const now = e.currentTarget.currentTime;
            if (now <= furthest.current + 1) furthest.current = Math.max(furthest.current, now);
            setPosition(now);
          }}
          onSeeking={(e) => {
            // Only the player moves the playhead, and only to resume: any other seek is undone.
            const audio = e.currentTarget;
            if (Math.abs(audio.currentTime - furthest.current) > 1) audio.currentTime = furthest.current;
          }}
          onPause={(e) => {
            const audio = e.currentTarget;
            if (phaseRef.current === 'listening' && !audio.ended && !audio.error) play();
          }}
          onEnded={() => {
            phaseRef.current = 'finished';
            setPhase('finished');
            holdMediaControls(false);
            setAnnouncement(t.firstListenDone);
          }}
          onError={() => {
            if (phaseRef.current === 'listening') setAudioState('failed');
          }}
        />
      )}
    </article>
  );
}

// Only while answers can still be saved; a save refused for good is shown in the status strip instead.
function saveLine(t: Strings, state: SaveState) {
  if (state === 'saved') return t.saveSaved;
  if (state === 'saving') return t.saveSaving;
  return state === 'offline' ? t.saveOffline : t.saveFailed;
}
