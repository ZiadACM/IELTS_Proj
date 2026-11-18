// The item player shell (ticket 07; spec stories 14 to 16, 20, 21, 30): reading time (skippable in guided practice),
// the map and question list, and the first listen, which plays straight through with no pause or seek. The
// uninterrupted first listen is an interaction rule in the client (spec: Audio delivery). Answering is ticket 08.
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { type Attempt, attemptAudioUrl, type DeliveredItem, getItem, startGuidedPractice } from './api.ts';
import { ItemMap } from './ItemMap.tsx';
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

const clock = (seconds: number) => {
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
      // the browser does not support this action
    }
  }
}

export function Player({
  t,
  itemId,
  mapNumber,
  onBack,
  onSessionGone,
}: {
  t: Strings;
  itemId: string;
  mapNumber: number | null;
  onBack: () => void;
  onSessionGone: () => void;
}) {
  const [loaded, setLoaded] = useState<Loaded | 'loading' | 'not-found' | 'failed'>('loading');
  const [phase, setPhase] = useState<Phase>('reading');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [audioState, setAudioState] = useState<AudioState>('waiting-to-start');
  const [position, setPosition] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const phaseRef = useRef<Phase | 'left'>('reading');
  const strip = useRef<HTMLDivElement>(null);
  const furthest = useRef(0); // the furthest point played: a retry resumes here, never earlier
  const stallTimer = useRef<number | undefined>(undefined);
  // The strings in a ref: switching language mid-listen re-labels the screen and must not reload the item, which
  // would remount the audio and lose the first listen.
  const strings = useRef(t);
  strings.current = t;

  const load = useCallback(async () => {
    setLoaded('loading');
    const [item, attempt] = await Promise.all([getItem(itemId), startGuidedPractice(itemId)]);
    if (!item.ok || !attempt.ok) {
      const failure = !item.ok ? item.failure : !attempt.ok ? attempt.failure : 'error';
      if (failure === 'unauthenticated') return onSessionGone();
      return setLoaded(failure === 'not_found' ? 'not-found' : 'failed');
    }
    setLoaded({ item: item.value, attempt: attempt.value });
    setSecondsLeft(item.value.readingTimeSec);
    setAnnouncement(strings.current.readingAnnounce(item.value.readingTimeSec));
  }, [itemId, onSessionGone]);

  useEffect(() => {
    load();
  }, [load]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
    } catch (error) {
      setAudioState((error as DOMException).name === 'NotAllowedError' ? 'blocked' : 'failed');
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
  const readingTimeSec = typeof loaded === 'object' ? loaded.item.readingTimeSec : null;
  useEffect(() => {
    if (readingTimeSec === null) return;
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

  const { item, attempt } = loaded;
  const duration = item.audio.durationSec;
  const share = (value: number, of: number) => Math.min(1, Math.max(0, value / of));

  return (
    <article className="player">
      <header className="stub">
        <h1>{mapNumber ? t.mapName(mapNumber) : t.guidedPractice}</h1>
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

      <div className="status-strip" ref={strip} tabIndex={-1}>
        {phase === 'reading' && (
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
        {phase === 'listening' && audioState === 'blocked' && (
          <div className="status-row">
            <p className="status-text">{t.audioBlocked}</p>
            <button type="button" className="primary" onClick={play}>
              {t.startAudio}
            </button>
          </div>
        )}
        {phase === 'listening' && audioState === 'failed' && (
          <div className="status-row">
            <p className="status-text error" role="alert">
              {furthest.current > 0 ? t.audioFailed : t.audioNotLoaded}
            </p>
            <button type="button" className="primary" onClick={retry}>
              {t.retry}
            </button>
          </div>
        )}
        {phase === 'listening' && audioState !== 'blocked' && audioState !== 'failed' && (
          <>
            <p className="status-text">
              {audioState === 'playing' ? t.playing(clock(position), clock(duration)) : t.audioLoading}
            </p>
            <div className="time-line" aria-hidden="true">
              <span style={lineShare(share(position, duration))} />
            </div>
            <p className="status-note">{t.firstListenRule}</p>
          </>
        )}
        {phase === 'finished' && (
          <div className="status-row done">
            <svg className="done-mark" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="11" />
              <path d="M7 12.5l3.2 3.2L17 9" />
            </svg>
            <div>
              <p className="status-text">{t.firstListenDone}</p>
              <p className="status-note">{t.answeringLater}</p>
            </div>
          </div>
        )}
      </div>
      <p className="visually-hidden" role="status">
        {announcement}
      </p>

      <div className="map-frame">
        <ItemMap map={item.map} label={t.mapLabel} />
      </div>

      <section className="questions" aria-labelledby="questions-title">
        <h2 id="questions-title">{t.itemQuestions}</h2>
        <p>{t.questionsIntro}</p>
        <ol>
          {item.questions.map((q, index) => (
            <li key={q.id}>
              <span className="question-number">{index + 1}</span>
              <span className="question-prompt" dir="ltr" lang="en">
                {q.prompt}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <button type="button" className="quiet back" onClick={onBack}>
        {t.backToMaps}
      </button>

      {/* No controls attribute: the first listen offers no pause or seek. */}
      {/* biome-ignore lint/a11y/useMediaCaption: captions would be the transcript, which reaches the learner only in review (CS 2.2, 4.6). */}
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
    </article>
  );
}
