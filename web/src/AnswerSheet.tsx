// The item's stub and its answer sheet: the map and the question list, answered by a tap on the map or a letter from
// the list (ticket 08; spec stories 17 to 19). Shared by the player and the staff preview (ticket 10), so staff see
// exactly what learners see. The question list's letter choice is the keyboard and screen reader path (spec:
// Accessibility). `children` go at the end of the question list (the player's save line and submit).
import { type ReactNode, useState } from 'react';
import type { DeliveredItem } from './api.ts';
import { ItemMap } from './ItemMap.tsx';
import type { Strings } from './strings.ts';

export function ItemStub({ t, item, mapNumber }: { t: Strings; item: DeliveredItem; mapNumber: number | null }) {
  return (
    <>
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
    </>
  );
}

type Props = {
  t: Strings;
  item: DeliveredItem;
  answers: Record<string, string>;
  setAnswer: (questionId: string, letter: string | null) => void;
  locked: boolean;
  children?: ReactNode;
};

export function AnswerSheet({ t, item, answers, setAnswer, locked, children }: Props) {
  const [activeQuestion, setActiveQuestion] = useState(item.questions[0]?.id);
  const activeIndex = item.questions.findIndex((q) => q.id === activeQuestion);

  // A letter picked on the map answers the active question, then moves on to the next question without an answer.
  const pickOnMap = (letter: string) => {
    if (locked || !activeQuestion) return;
    setAnswer(activeQuestion, letter);
    const after = [...item.questions.slice(activeIndex + 1), ...item.questions.slice(0, activeIndex)];
    const next = after.find((q) => !answers[q.id]);
    if (next) setActiveQuestion(next.id);
  };

  return (
    <>
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
        {children}
      </section>
    </>
  );
}
