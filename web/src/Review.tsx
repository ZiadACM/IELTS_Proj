// Review after submit (ticket 09; spec stories 31, 32, 40, 41; D6). Shown in place of the player's status strip, map and
// question list: the score, each question with the learner's letter and the correct one (in words and marks, not colour
// alone), the selected question marked on the map, its English explanation with an Arabic version on request, and the
// transcript with the line where that answer is named. Ticket 10 adds Answer Replay under the map (approved shape
// brief): once it has started the map shows the replay instead of the marks, and the transcript marks the line being
// spoken. Staff preview (ADM-04) shows the same screen with the correct letters only.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnswerReplay } from './AnswerReplay.tsx';
import type { DeliveredItem, Result, Review as ReviewData } from './api.ts';
import { bidiRuns } from './bidi.ts';
import { ItemMap } from './ItemMap.tsx';
import { cueAt, replayAt, replayPlan } from './replay.ts';
import type { Strings } from './strings.ts';

// Where the review comes from: the learner's own submitted attempt, or a staff preview (no learner answers).
export type ReviewSource = { load: () => Promise<Result<ReviewData>>; audioUrl: string; preview?: boolean };
type Props = { t: Strings; item: DeliveredItem; source: ReviewSource; onBack?: () => void; onSessionGone: () => void };

function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const change = () => setReduced(list.matches);
    list.addEventListener('change', change);
    return () => list.removeEventListener('change', change);
  }, []);
  return reduced;
}

export function Review({ t, item, source, onBack, onSessionGone }: Props) {
  const [review, setReview] = useState<ReviewData | 'loading' | 'offline' | 'failed'>('loading');
  const [selected, setSelected] = useState(0);
  const [arabicOpen, setArabicOpen] = useState(false);
  const [replayTime, setReplayTime] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const heading = useRef<HTMLHeadingElement>(null);
  const mapFrame = useRef<HTMLDivElement>(null);
  const namedLine = useRef<HTMLLIElement>(null);
  const { load: fetchReview, preview = false } = source;

  const load = useCallback(async () => {
    setReview('loading');
    const res = await fetchReview();
    if (res.ok) return setReview(res.value);
    if (res.failure === 'unauthenticated') return onSessionGone();
    setReview(res.failure === 'offline' ? 'offline' : 'failed');
  }, [fetchReview, onSessionGone]);

  useEffect(() => {
    load();
  }, [load]);

  const ready = typeof review === 'object';
  // Keyboard and screen reader users land on the review heading once it is there.
  useEffect(() => {
    if (ready) heading.current?.focus();
  }, [ready]);

  const plan = useMemo(
    () => (ready ? replayPlan({ events: review.route, cues: review.transcript.cues }) : null),
    [ready, review],
  );

  if (!ready || !plan)
    return (
      <div className="status-strip review-head">
        {review === 'loading' ? (
          <p className="status-text" role="status">
            {t.reviewLoading}
          </p>
        ) : (
          <div className="status-row">
            <p className="status-text error" role="alert">
              {review === 'offline' ? t.reviewOffline : t.reviewFailed}
            </p>
            <button type="button" className="primary" onClick={load}>
              {t.retry}
            </button>
          </div>
        )}
      </div>
    );

  const question = review.questions[selected];
  const cues = review.transcript.cues;
  const view = replayTime === null ? null : replayAt(plan, replayTime, reduced);
  const spokenId = replayTime === null ? null : cueAt(cues, replayTime);
  const answers = review.questions.map((q) => q.correctAnswer);
  const mapLabel = view
    ? view.summary
      ? t.replayMapSummary
      : t.replayMapLabel(Math.max(1, view.leg + 1))
    : preview
      ? t.previewMapLabel(selected + 1, question.correctAnswer)
      : t.reviewMapLabel(selected + 1, question.yourAnswer, question.correctAnswer);

  return (
    <>
      <div className="status-strip review-head">
        <h2 ref={heading} tabIndex={-1}>
          {t.reviewTitle}
        </h2>
        {!preview && <p className="review-score">{t.reviewScore(review.score, review.questions.length)}</p>}
      </div>

      <div className={reduced ? 'map-frame reduced' : 'map-frame'} ref={mapFrame}>
        <ItemMap
          map={item.map}
          label={mapLabel}
          marks={{ yours: question.yourAnswer, correct: question.correctAnswer, yoursTag: t.yours }}
          replay={view ? { view, answers } : undefined}
        />
        <AnswerReplay
          t={t}
          plan={plan}
          audioUrl={source.audioUrl}
          durationSec={item.audio.durationSec}
          time={replayTime}
          caption={cues.find((c) => c.id === spokenId)?.text ?? null}
          note={view?.note ?? null}
          onTime={setReplayTime}
        />
      </div>

      <section className="questions review-questions" aria-labelledby="review-questions-title">
        <h2 id="review-questions-title">{t.itemQuestions}</h2>
        <p>{t.reviewIntro}</p>
        <ol>
          {review.questions.map((q, index) => {
            const open = index === selected;
            return (
              <li key={q.id} className={open ? 'open' : undefined}>
                <button
                  type="button"
                  className="review-row"
                  aria-expanded={open}
                  aria-controls={open ? `why-${q.id}` : undefined}
                  onClick={() => {
                    setSelected(index);
                    // The row's marks are what the learner asked for: the map leaves the replay for them.
                    if (replayTime !== null) setReplayTime(null);
                  }}
                >
                  <span className="question-number">{index + 1}</span>
                  <span className="review-row-body">
                    <span className="question-prompt" dir="ltr" lang="en">
                      {q.prompt}
                    </span>
                    {preview ? (
                      <span className="verdict">
                        <span>
                          {t.correctLetter}: <bdi className="letter">{q.correctAnswer}</bdi>
                        </span>
                      </span>
                    ) : (
                      <Verdict t={t} q={q} />
                    )}
                  </span>
                </button>
                {open && (
                  <div className="why" id={`why-${q.id}`}>
                    <p dir="ltr" lang="en">
                      {q.explanation.en}
                    </p>
                    {/* On a phone the map is out of view below the open row; desktop shows both side by side. */}
                    <button type="button" className="see-on-map" onClick={() => bringIntoView(mapFrame.current)}>
                      {t.seeOnMap}
                    </button>
                    {q.cueId && (
                      <button type="button" onClick={() => bringIntoView(namedLine.current, true)}>
                        {t.showInTranscript}
                      </button>
                    )}
                    <button type="button" aria-expanded={arabicOpen} onClick={() => setArabicOpen(!arabicOpen)}>
                      {arabicOpen ? t.hideArabic : t.readArabic}
                    </button>
                    {arabicOpen && (
                      <p className="why-ar" dir="rtl" lang="ar">
                        {bidiRuns(q.explanation.ar).map((run, i) =>
                          run.latin ? (
                            // biome-ignore lint/suspicious/noArrayIndexKey: runs are a fixed split of fixed text
                            <bdi key={i} dir="ltr" lang="en">
                              {run.text}
                            </bdi>
                          ) : (
                            run.text
                          ),
                        )}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="transcript" aria-labelledby="transcript-title">
        <h2 id="transcript-title">{t.transcriptTitle}</h2>
        <ol dir="ltr" lang="en">
          {cues.map((cue) => {
            // The selected question's line; two questions named in one line each mark it when selected.
            const here = cue.id === question.cueId;
            // While Answer Replay runs, the line being spoken is marked too; the list does not scroll to it, so the
            // map stays in view on a phone (approved shape brief).
            const spoken = cue.id === spokenId;
            return (
              <li
                key={cue.id}
                ref={here ? namedLine : undefined}
                className={[here && 'named', spoken && 'spoken'].filter(Boolean).join(' ') || undefined}
                tabIndex={here ? -1 : undefined}
                aria-current={spoken || undefined}
              >
                {here && (
                  <span className="named-tag">
                    <span aria-hidden="true">Q{selected + 1}</span>
                    <span className="visually-hidden" dir={t.lang === 'ar' ? 'rtl' : 'ltr'} lang={t.lang}>
                      {t.answerNamedHere(selected + 1)}
                    </span>
                  </span>
                )}
                {cue.text}
              </li>
            );
          })}
        </ol>
      </section>

      {onBack && (
        <div className="review-end">
          <p>{t.reviewEnd}</p>
          <button type="button" className="primary" onClick={onBack}>
            {t.backToMaps}
          </button>
        </div>
      )}
    </>
  );
}

// Scrolls a part of the review into view, without animation for a learner who asked for reduced motion. A transcript
// line also takes focus, so keyboard and screen reader users land on it.
function bringIntoView(target: HTMLElement | null, focus = false) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (focus) target?.focus({ preventScroll: true });
  target?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: focus ? 'center' : 'start' });
}

// "Right" or "Wrong" with a drawn mark, then the learner's letter and the correct one in words.
function Verdict({ t, q }: { t: Strings; q: ReviewData['questions'][number] }) {
  return (
    <span className={q.correct ? 'verdict right' : 'verdict wrong'}>
      <svg className="verdict-mark" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="9" />
        <path d={q.correct ? 'M5.8 10.4l2.8 2.8 5.6-5.8' : 'M6.8 6.8l6.4 6.4M13.2 6.8l-6.4 6.4'} />
      </svg>
      <span className="verdict-word">{q.correct ? t.right : t.wrong}</span>
      <span>
        {t.yours}: {q.yourAnswer ? <bdi className="letter">{q.yourAnswer}</bdi> : t.noAnswer}
      </span>
      {!q.correct && (
        <span>
          {t.correctLetter}: <bdi className="letter">{q.correctAnswer}</bdi>
        </span>
      )}
    </span>
  );
}
