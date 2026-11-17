// Staff item list, import and publish (ticket 06; spec: Staff). Plain screen: its design review and browser checks are
// deferred to ticket 07 (owner decision). Item ids, purposes and content-checker messages are English and stay
// left-to-right inside the Arabic frame.
import { type ChangeEvent, useCallback, useEffect, useId, useState } from 'react';
import {
  type Failure,
  ITEM_FILE_MAX_BYTES,
  type ItemProblem,
  importItem,
  listStaffItems,
  publishItem,
  type StaffItem,
} from './api.ts';
import type { Strings } from './strings.ts';

type Notice = { kind: 'ok' | 'error'; text: string; problems?: ItemProblem[] };

function failureText(t: Strings, failure: Failure) {
  if (failure === 'forbidden') return t.staffNotAllowed;
  if (failure === 'item_published') return t.alreadyPublished;
  if (failure === 'offline') return t.offline;
  return t.failed;
}

export function StaffItems({
  t,
  onBack,
  onSessionGone,
}: {
  t: Strings;
  onBack: () => void;
  onSessionGone: () => void;
}) {
  const [items, setItems] = useState<StaffItem[] | null>(null);
  const [canPublish, setCanPublish] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // 'import' or the itemId being published
  const fileId = useId();
  const hintId = useId();

  const failed = useCallback(
    (failure: Failure, problems?: ItemProblem[], rejectedText?: string) => {
      if (failure === 'unauthenticated') return onSessionGone();
      if (failure === 'item_invalid' && rejectedText) setNotice({ kind: 'error', text: rejectedText, problems });
      else setNotice({ kind: 'error', text: failureText(t, failure) });
    },
    [t, onSessionGone],
  );

  const load = useCallback(async () => {
    const res = await listStaffItems();
    if (res.ok) {
      setItems(res.value.items);
      setCanPublish(res.value.canPublish);
    } else failed(res.failure);
  }, [failed]);

  useEffect(() => {
    load();
  }, [load]);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = ''; // the same file can be chosen again after a fix
    if (!file) return;
    setNotice(null);
    if (file.size > ITEM_FILE_MAX_BYTES) return setNotice({ kind: 'error', text: t.fileTooLarge });
    let item: unknown;
    try {
      item = JSON.parse(await file.text());
    } catch {
      return setNotice({ kind: 'error', text: t.fileNotJson });
    }
    if (!item || typeof item !== 'object' || Array.isArray(item))
      return setNotice({ kind: 'error', text: t.fileNotJson });
    setBusy('import');
    const res = await importItem(item);
    setBusy(null);
    if (!res.ok) return failed(res.failure, res.problems, t.importRejected);
    // 201 creates a draft, 200 replaces one; the list shows which item it was.
    const known = items?.some((i) => i.itemId === res.value.itemId);
    setNotice({ kind: 'ok', text: known ? t.replaced : t.imported });
    await load();
  };

  const onPublish = async (itemId: string) => {
    setNotice(null);
    setBusy(itemId);
    const res = await publishItem(itemId);
    setBusy(null);
    if (!res.ok) return failed(res.failure, res.problems, t.publishRejected);
    setNotice({ kind: 'ok', text: t.publishedNotice });
    await load();
  };

  return (
    <section className="panel staff">
      <h1>{t.staffTitle}</h1>

      <div className="field">
        <label htmlFor={fileId}>{t.importLabel}</label>
        <input
          id={fileId}
          type="file"
          accept="application/json,.json"
          onChange={onFile}
          disabled={busy !== null}
          aria-describedby={hintId}
        />
        <p id={hintId} className="hint">
          {t.importHint}
        </p>
      </div>

      <div role="status" aria-live="polite" className={notice?.kind === 'error' ? 'error' : 'notice'}>
        {busy === 'import' && t.importing}
        {notice && <p>{notice.text}</p>}
        {notice?.problems && notice.problems.length > 0 && (
          <ul className="problems" dir="ltr" lang="en">
            {notice.problems.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the same code can appear more than once
              <li key={i}>
                <code>{p.code}</code> {p.msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!canPublish && items !== null && <p className="hint">{t.onlyReviewerPublishes}</p>}

      {items === null ? (
        !notice && <p role="status">{t.loading}</p>
      ) : items.length === 0 ? (
        <p>{t.staffEmpty}</p>
      ) : (
        <ul className="item-list">
          {items.map((item) => (
            <li key={item.itemId}>
              <span className="item-id" dir="ltr" lang="en">
                {item.contentId}
              </span>
              <span className="item-meta">
                <span dir="ltr" lang="en">
                  {item.purpose}
                </span>
                {' · '}
                {t.itemTier} {item.tier}
                {' · '}
                {t.itemQuestions} {item.questionCount}
              </span>
              <span className={`item-status ${item.status}`}>
                {item.status === 'published' ? t.statusPublished : t.statusDraft}
              </span>
              {canPublish && item.status === 'draft' && (
                <button type="button" onClick={() => onPublish(item.itemId)} disabled={busy !== null}>
                  {busy === item.itemId ? t.publishing : t.publish}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={onBack}>
        {t.backHome}
      </button>
    </section>
  );
}
