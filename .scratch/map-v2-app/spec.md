# Map format v2 in the real app

Status: **Proposed** (2026-11-19). Handoff: `docs/development/handoffs/2026-11-19-map-v2-in-app.md`.

## What

The learner app draws v2 maps (rooms, corridors, entrances, symbols, compass, letter boxes) and plays Answer Replay the D27 way, and the v2 first challenge replaces the v1 one. Behaviour is already proven in the prototype (branch `agent/map-format-v2-prototype`, variant D); port the behaviour, not the code.

Sources: `docs/content/map-format-v2.md`; D21 to D27 in `docs/product/owner-decisions.md`; the map look as drawn in the prototype (owner: do not change it).

## Facts found while splitting (2026-11-19)

- **Answer Replay does not exist in the app yet.** The player stops after the first listen ("answering later"). Replay is ticket 10 of `.scratch/listening-map-prototype/`, blocked by 08 (answer and submit) and 09 (review). Ticket 02 here depends on them.
- **Delivery is an allow-list.** `server/src/catalogue/routes.ts` sends only `width`, `height`, landmark `id/label/x/y` and target `label/x/y`. v2 drawing fields must be added there, and the route, `wrongPath`, `word` and `atSec` must stay out (answer-key leakage suite).
- **The reviewed v2 item is not on `main`.** `validation.status: reviewed` and `audio.synthetic` sit on `agent/first-challenge-v2-reviewed` (not merged yet).
- **A published item cannot be re-imported** (409 `item_published`, ticket 06 decision 3).
- The web has no unit test runner; browser checks use Playwright (`web/e2e`). Pure logic (replay timing) is tested with the server's runner or `node --test`.

## Security & Privacy

- Delivery adds only drawing fields (`format`, `title`, `compass`, `areas`, `paths`, `entrances`, `symbols`, the landmark/target link fields). No route events, `wrongPath`, `word`, `atSec`, answers, hints or explanations before review. The answer-key leakage suite must pass with a v2 item.
- A target's `area` reveals nothing extra: every lettered place has one, answers and decoys alike.
- Replay data (route, times) is sent only with the learner's own submitted attempt (D6), as ticket 10 already requires.
- No new dependency.

## Accessibility, RTL & Responsive

- Map content is English and stays LTR inside the Arabic frame (`direction="ltr" lang="en"`), as v1.
- Fits the screen width at 360 px (map 326 px wide, D22); no zoom or pan; no sideways scroll.
- Letters are not told apart by colour alone (box + letter). Highlights use fill and outline.
- Reduced motion (device setting): each piece appears whole; the wrong path appears dashed and stays; the summary is not animated (D27).
- Replay controls keyboard-operable (ticket 10).

## Failure & Empty States

- `map.format` absent: draw v1 exactly as today.
- Unknown area, path or symbol kind (should never pass the validator): skip that shape, draw the rest; never crash the player.
- An event with no `atSec`: appears at the end of its cue (`map-format-v2.md`).
- Audio fails during replay: the line stops where the clock stopped; the existing audio failure states apply.

## Content Validation

- Ticket 03 adds the v2 rules to the validator (protected; owner approval needed).
- Ticket 04 runs `validate-ielts-content` on the item before it is imported and published.

## Done Checklist

- [ ] Approved feature contract exists and scope is clear.
- [ ] Required functionality works end to end, including loading/error/empty states.
- [ ] Every required button and control produces the intended outcome.
- [ ] Relevant unit/integration/browser tests run and pass (or gaps are explicitly recorded and approved).
- [ ] Responsive behavior and accessibility were checked where applicable.
- [ ] User data, permissions and security implications were reviewed.
- [ ] IELTS answer/evidence/media validation passed where applicable.
- [ ] No unintended changes or unresolved critical/high-severity issues remain.
- [ ] Reviewer feedback is resolved or explicitly tracked.
- [ ] Docs, task record and handoff reflect the actual implemented behavior.
- [ ] Human approval occurs before merging/deploying wherever policy requires it.
