// Review after submit (ticket 09; spec stories 31, 32, 40, 41; D6). Shown in place of the player's status strip, map and
// question list: the score, each question with the learner's letter and the correct one (in words and marks, not colour
// alone), the selected question marked on the map, its English explanation with an Arabic version on request, and the
// transcript with the line where that answer is named. Answer Replay is ticket 10.
import { useCallback, useEffect, useRef, useState } from 'react';
import { type DeliveredItem, getReview, type Review as ReviewData } from './api.ts';
import { bidiRuns } from './bidi.ts';
import { ItemMap } from './ItemMap.tsx';
import type { Strings } from './strings.ts';

type Props = { t: Strings; item: DeliveredItem; attemptId: string; onBack: () => void; onSessionGone: () => void };

export function Review({ t, item, attemptId, onBack, onSessionGone }: Props) {
  const [review, setReview] = useState<ReviewData | 'loading' | 'offline' | 'failed'>('loading');
  const [selected, setSelected] = useState(0);
  const [arabicOpen, setArabicOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const mapFrame = useRef<HTMLDivElement>(null);
  const namedLine = useRef<HTMLLIElement>(null);

  const load = useCallback(async () => {
    setReview('loading');
    const res = await getReview(attemptId);
    if (res.ok) return setReview(res.value);
    if (res.failure === 'unauthenticated') return onSessionGone();
    setReview(res.failure === 'offline' ? 'offline' : 'failed');
  }, [attemptId, onSessionGone]);

  useEffect(() => {
    load();
  }, [load]);

  const ready = typeof review === 'object';
  // Keyboard and screen reader users land on the review heading once it is there.
  useEffect(() => {
    if (ready) heading.current?.focus();
  }, [ready]);

  if (!ready)
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

  return (
    <>
      <div className="status-strip review-head">
        <h2 ref={heading} tabIndex={-1}>
          {t.reviewTitle}
        </h2>
        <p className="review-score">{t.reviewScore(review.score, review.questions.length)}</p>
      </div>

      <div className="map-frame" ref={mapFrame}>
        <ItemMap
          map={item.map}
          label={t.reviewMapLabel(selected + 1, question.yourAnswer, question.correctAnswer)}
          marks={{ yours: question.yourAnswer, correct: question.correctAnswer, yoursTag: t.yours }}
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
                  onClick={() => setSelected(index)}
                >
                  <span className="question-number">{index + 1}</span>
                  <span className="review-row-body">
                    <span className="question-prompt" dir="ltr" lang="en">
                      {q.prompt}
                    </span>
                    <Verdict t={t} q={q} />
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
          {review.transcript.cues.map((cue) => {
            // The selected question's line; two questions named in one line each mark it when selected.
            const here = cue.id === question.cueId;
            return (
              <li
                key={cue.id}
                ref={here ? namedLine : undefined}
                className={here ? 'named' : undefined}
                tabIndex={here ? -1 : undefined}
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

      <div className="review-end">
        <p>{t.reviewEnd}</p>
        <button type="button" className="primary" onClick={onBack}>
          {t.backToMaps}
        </button>
      </div>
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
