// Staff preview (ticket 10; spec story 73; matrix ADM-04, ADM-08; approved shape brief). An item exactly as learners
// will see it: the item screen (picks are not saved), then the review with the correct letters, explanations,
// transcript and the full Answer Replay. Staff only: the server refuses everyone else, the screen is only a view.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnswerSheet, ItemStub } from './AnswerSheet.tsx';
import { getStaffPreview, type StaffPreview as PreviewData, staffAudioUrl } from './api.ts';
import { Review, type ReviewSource } from './Review.tsx';
import type { Strings } from './strings.ts';

type Props = { t: Strings; itemId: string; contentId: string; onBack: () => void; onSessionGone: () => void };

export function StaffPreview({ t, itemId, contentId, onBack, onSessionGone }: Props) {
  const [preview, setPreview] = useState<PreviewData | 'loading' | 'not-found' | 'failed' | 'forbidden'>('loading');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setPreview('loading');
    const res = await getStaffPreview(itemId);
    if (res.ok) return setPreview(res.value);
    if (res.failure === 'unauthenticated') return onSessionGone();
    setPreview(res.failure === 'not_found' ? 'not-found' : res.failure === 'forbidden' ? 'forbidden' : 'failed');
  }, [itemId, onSessionGone]);

  useEffect(() => {
    load();
  }, [load]);

  // The review screen reads the preview as a review with no learner answers; score and attempt are never shown.
  const source = useMemo<ReviewSource | null>(() => {
    if (typeof preview !== 'object') return null;
    const review = {
      attemptId: '',
      itemId,
      mode: 'guided' as const,
      score: 0,
      questions: preview.questions.map((q) => ({ ...q, yourAnswer: null, correct: false })),
      route: preview.route,
      transcript: preview.transcript,
    };
    return { load: async () => ({ ok: true, value: review }), audioUrl: staffAudioUrl(itemId), preview: true };
  }, [preview, itemId]);

  if (typeof preview !== 'object' || !source)
    return (
      <section className="panel">
        {preview === 'loading' ? (
          <p role="status">{t.loading}</p>
        ) : (
          <p role="alert">
            {preview === 'not-found' ? t.itemNotFound : preview === 'forbidden' ? t.staffNotAllowed : t.loadFailed}
          </p>
        )}
        {preview === 'failed' && (
          <button type="button" className="primary" onClick={load}>
            {t.retry}
          </button>
        )}
        <button type="button" onClick={onBack}>
          {t.backToItems}
        </button>
      </section>
    );

  const setAnswer = (questionId: string, letter: string | null) =>
    setAnswers(({ [questionId]: _, ...rest }) => (letter ? { ...rest, [questionId]: letter } : rest));

  return (
    <div className="staff-preview">
      <p className="preview-band">
        {t.previewBand}{' '}
        <bdi dir="ltr" lang="en">
          {contentId}
        </bdi>
      </p>
      <article className="player">
        <ItemStub t={t} item={preview.item} mapNumber={null} />
        <AnswerSheet t={t} item={preview.item} answers={answers} setAnswer={setAnswer} locked={false} />
      </article>
      <article className="player">
        <Review t={t} item={preview.item} source={source} onSessionGone={onSessionGone} />
        <button type="button" className="quiet back" onClick={onBack}>
          {t.backToItems}
        </button>
      </article>
    </div>
  );
}
