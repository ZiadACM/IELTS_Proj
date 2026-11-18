// Browse (ticket 07; spec stories 50, 51): published maps grouped by difficulty tier. The server already leaves out
// drafts, the first challenge and pilot items. Items have no title, so each is numbered within its tier in publishing
// order (owner decision, ticket 07). "Seen" marks are ticket 12.
import { useCallback, useEffect, useState } from 'react';
import { type CatalogueItem, listItems, type Tier } from './api.ts';
import type { Strings } from './strings.ts';

const TIERS: Tier[] = [1, 2, 3];
export type ChosenItem = { itemId: string; mapNumber: number };

export function Browse({
  t,
  onOpen,
  onBack,
  onSessionGone,
}: {
  t: Strings;
  onOpen: (item: ChosenItem) => void;
  onBack: () => void;
  onSessionGone: () => void;
}) {
  const [items, setItems] = useState<CatalogueItem[] | null>(null);
  const [failed, setFailed] = useState<'offline' | 'error' | null>(null);

  const load = useCallback(async () => {
    setFailed(null);
    const res = await listItems();
    if (res.ok) setItems(res.value.items);
    else if (res.failure === 'unauthenticated') onSessionGone();
    else setFailed(res.failure === 'offline' ? 'offline' : 'error');
  }, [onSessionGone]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="browse">
      <div className="page-head">
        <h1>{t.browseTitle}</h1>
        <p>{t.browseIntro}</p>
      </div>
      {failed && (
        <div className="panel">
          <p role="alert">{failed === 'offline' ? t.offline : t.loadFailed}</p>
          <button type="button" className="primary" onClick={load}>
            {t.retry}
          </button>
        </div>
      )}
      {!items && !failed && <p role="status">{t.loading}</p>}
      {items &&
        TIERS.map((tier) => {
          const inTier = items.filter((i) => i.tier === tier);
          return (
            <section key={tier} className="tier" aria-labelledby={`tier-${tier}`}>
              <h2 id={`tier-${tier}`}>{t.tierHeading(tier)}</h2>
              {inTier.length === 0 ? (
                <p className="tier-empty">{t.tierEmpty}</p>
              ) : (
                <ul className="stubs">
                  {inTier.map((item, index) => (
                    <li key={item.itemId}>
                      <button
                        type="button"
                        className="stub-card"
                        onClick={() => onOpen({ itemId: item.itemId, mapNumber: index + 1 })}
                      >
                        <span className="stub-number" aria-hidden="true">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="stub-body">
                          <span className="stub-name">{t.mapName(index + 1)}</span>
                          <span>{t.questionCount(item.questionCount)}</span>
                          {item.focusSkill && (
                            <span>
                              {t.skillChallenge}: {t.microSkills[item.focusSkill]}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      <button type="button" className="quiet" onClick={onBack}>
        {t.backHome}
      </button>
    </section>
  );
}
