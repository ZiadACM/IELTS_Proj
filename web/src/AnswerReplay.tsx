// Answer Replay's player strip (ticket 10, approved shape brief): it sits under the review map and owns the recording.
// Play and pause; step back and forward, which move to the moment the previous or next point appears and pause there;
// a jump to each question's part, which starts at the sentence that opens it and plays; 0.75x or 1x; the sentence being
// spoken as a caption (below the controls), with a trap's or correction's authored note under it, read out when paused; and a progress line you read, not drag.
// The map drawing is the parent's: this strip reports the clock with onTime (null: back to the review marks).
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Note, type ReplayPlan, stepFrom } from './replay.ts';
import type { Strings } from './strings.ts';
import { lineShare, minutesSeconds } from './time.ts';

type Status = 'ready' | 'loading' | 'failed' | 'offline';
const SPEEDS = [0.75, 1] as const;
// Lands a seek just after its step, so a browser that rounds the playhead down still shows the point.
const PAST_STEP_SEC = 0.01;

type Props = {
  t: Strings;
  plan: ReplayPlan;
  audioUrl: string;
  durationSec: number;
  time: number | null; // null before the first play and after Show marks
  caption: string | null;
  note: Note | null;
  onTime: (time: number | null) => void;
};

export function AnswerReplay({ t, plan, audioUrl, durationSec, time, caption, note, onTime }: Props) {
  const audio = useRef<HTMLAudioElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const frame = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<Status>('ready');
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const started = time !== null;

  // While playing, the map follows every frame (a pulled-back wrong path needs more than timeupdate's 4 a second).
  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      if (audio.current && !audio.current.paused) onTime(audio.current.currentTime);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [playing, onTime]);

  // Back to the review marks (Show marks, or a question row picked in the review): the recording stops and rewinds,
  // so the next Play starts from the beginning.
  useEffect(() => {
    const a = audio.current;
    if (time !== null || !a || (a.paused && a.currentTime === 0)) return;
    a.pause();
    a.currentTime = 0;
  }, [time]);

  const play = useCallback(async () => {
    const a = audio.current;
    if (!a) return;
    onTime(a.currentTime);
    try {
      await a.play();
    } catch (error) {
      // An interrupted play (a pause or seek came first) is not a failure; anything else is shown with a retry.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus(navigator.onLine ? 'failed' : 'offline');
    }
  }, [onTime]);

  // Moves the clock; before the recording's length is known, as soon as it is.
  const seek = useCallback(
    (to: number, then: 'pause' | 'play') => {
      const a = audio.current;
      if (!a) return;
      if (then === 'pause') a.pause();
      const go = () => {
        a.currentTime = to;
        onTime(to);
        if (then === 'play') play();
      };
      if (a.readyState >= HTMLMediaElement.HAVE_METADATA) return go();
      a.addEventListener('loadedmetadata', go, { once: true });
      // Safari may not have fetched anything yet (iOS ignores preload); this tap starts it.
      if (a.networkState !== HTMLMediaElement.NETWORK_LOADING) a.load();
    },
    [onTime, play],
  );

  const step = (dir: 1 | -1) => {
    const to = stepFrom(plan, time ?? 0, dir);
    if (to !== null) seek(to + PAST_STEP_SEC, 'pause');
  };

  const showMarks = () => {
    onTime(null);
    playButton.current?.focus(); // this button is about to go; focus must not fall to the page
  };

  const retry = () => {
    setStatus('loading');
    audio.current?.load();
  };

  const now = time ?? 0;
  const canBack = started && stepFrom(plan, now, -1) !== null;
  const canForward = stepFrom(plan, now, 1) !== null;

  return (
    <div className="replay-strip">
      <h3 className="replay-title">{t.replayTitle}</h3>
      {!started && <p className="status-note">{t.replayIntro}</p>}
      {(status === 'failed' || status === 'offline') && (
        <div className="status-row">
          <p className="status-text error" role="alert">
            {status === 'offline' ? t.replayOffline : t.replayFailed}
          </p>
          <button type="button" className="primary" onClick={retry}>
            {t.retry}
          </button>
        </div>
      )}

      <div className="replay-clock">
        <div className="time-line" aria-hidden="true">
          <span style={lineShare(now / durationSec)} />
        </div>
        <p className="status-note">
          {status === 'loading' ? t.audioLoading : t.replayClock(minutesSeconds(now), minutesSeconds(durationSec))}
        </p>
      </div>

      <div className="replay-controls">
        <button
          ref={playButton}
          type="button"
          className="primary icon-button"
          onClick={playing ? () => audio.current?.pause() : play}
          aria-label={playing ? t.replayPause : t.replayPlay}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13l10.5-6.5z" />}
          </svg>
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => step(-1)}
          disabled={!canBack}
          aria-label={t.replayStepBack}
        >
          <svg className="mirror" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 5h2.5v14H6zM19 5.5v13L9.5 12z" />
          </svg>
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => step(1)}
          disabled={!canForward}
          aria-label={t.replayStepForward}
        >
          <svg className="mirror" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.5 5H18v14h-2.5zM5 5.5v13L14.5 12z" />
          </svg>
        </button>
        {started && (
          <button type="button" className="quiet" onClick={showMarks}>
            {t.replayShowMarks}
          </button>
        )}
      </div>

      <div className="replay-controls">
        <fieldset className="replay-group">
          <legend>{t.replayJump}</legend>
          {plan.questionStarts.map((start, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: one button per question, in question order
            <button key={i} type="button" onClick={() => seek(start, 'play')} aria-label={t.replayJumpTo(i + 1)}>
              <bdi>Q{i + 1}</bdi>
            </button>
          ))}
        </fieldset>
        <fieldset className="replay-group">
          <legend>{t.replaySpeed}</legend>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={speed === s}
              onClick={() => {
                setSpeed(s);
                if (audio.current) audio.current.playbackRate = s;
              }}
            >
              <bdi>{s}×</bdi>
            </button>
          ))}
        </fieldset>
      </div>

      {/* The caption comes after the controls, so its changing height never moves a button under the thumb. */}
      {started && (
        <div className="replay-caption">
          <p className="replay-sentence" dir="ltr" lang="en">
            {caption ?? ' '}
          </p>
          {note && (
            <p className="replay-note">
              <span className="replay-note-kind">{note.kind === 'correction' ? t.replayCorrection : t.replayTrap}</span>{' '}
              <span dir="ltr" lang="en">
                {note.text}
              </span>
            </p>
          )}
        </div>
      )}

      {/* Read out only while paused (after a step or a pause), never every frame over the recording. */}
      <p className="visually-hidden" aria-live="polite">
        {started && !playing && caption ? (
          <>
            <span lang="en">{caption}</span>
            {note && (
              <>
                {' '}
                {note.kind === 'correction' ? t.replayCorrection : t.replayTrap}: <span lang="en">{note.text}</span>
              </>
            )}
          </>
        ) : null}
      </p>

      {/* Our own controls above are the keyboard and screen reader path; the transcript is the text alternative. */}
      {/* biome-ignore lint/a11y/useMediaCaption: the transcript below is the recording's text, shown in review */}
      <audio
        ref={audio}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={(e) => {
          e.currentTarget.playbackRate = speed;
          setStatus('ready');
        }}
        onPlaying={() => {
          setStatus('ready');
          setPlaying(true);
        }}
        onWaiting={() => setStatus('loading')}
        onPause={(e) => {
          setPlaying(false);
          if (started) onTime(e.currentTarget.currentTime);
        }}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setStatus(navigator.onLine ? 'failed' : 'offline');
        }}
      />
    </div>
  );
}
