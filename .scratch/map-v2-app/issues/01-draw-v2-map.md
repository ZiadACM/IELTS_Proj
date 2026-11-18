# 01: Draw a v2 map in the player

**What to build:** `web/src/ItemMap.tsx` draws a `map.format: 2` map as the prototype does (variant D): areas (building, rooms with door gaps, water, grass and the other kinds), paths (corridors, roads, dashed footpaths), entrances with "You are here", symbols, the north arrow, landmark labels inside their areas, and answer letters as square boxes (26 px, 15 px bold). v1 maps (no `format`) draw exactly as today. The delivery allow-list (`server/src/catalogue/routes.ts`, `web/src/api.ts`) passes the drawing fields and nothing else.

**Blocked by:** none

**Status:** ready-for-human (built on `agent/map-v2-app`; owner looks at the screenshots)

Spec: `../spec.md`

- [x] v2 map drawn at 360 px and desktop, matching the prototype's look; no sideways scroll
- [x] v1 maps unchanged (existing browse-player browser test passes)
- [x] Delivery carries the drawing fields; no route, `wrongPath`, `word` or `atSec` (server test with the anchored item; leakage suite)
- [x] Unknown kinds are skipped, not fatal
- [x] Map stays LTR inside the RTL frame; letters readable at 326 px
- [x] `verify-user-flow` on the player with a seeded v2 item (mobile, desktop, Arabic/RTL)

## Comments

### 2026-11-19, agent
Built on `agent/map-v2-app`.
- **Server:** delivery (`server/src/catalogue/routes.ts`) has a v2 allow-list (`mapOf`): `format`, `title`, `compass`, `areas`, `paths`, `entrances`, `symbols`, and the landmark/target link fields. A v1 map is delivered exactly as before. Route data never sits inside `map`, so it is still never sent. Tests first (red on the v2 map, then green): the anchored item's map is delivered whole with no forbidden key and no `wrongPath`/`startsLeg`/`word`/`atSec`; unknown fields inside a map are dropped.
- **Web:** new `web/src/MapV2.tsx` ports the prototype's drawing (variant D) as React: grass, building, rooms with door gaps, entrance with "You are here", corridor names, trees, noticeboard, names inside rooms (two lines when needed), the north arrow, letter boxes (26 px, 15 px bold). `ItemMap.tsx` picks v1 or v2 on `map.format`; the v1 drawing code is unchanged. The map title shows above the map (English, LTR). Map colours are new tokens in `app.css` (black on white, as in the prototype).
- **Not drawn (not in the prototype, no item uses them, look not decided):** water, roads and other path kinds as lines, polygon areas, symbols other than tree and noticeboard, and the symbol key. They are skipped without an error. They need a design decision before an item uses them.
- **Browser test** `web/e2e/map-v2.spec.ts` (written after it worked): seeds the anchored item as published practice; checks the title, 8 letter boxes, every room name, the start mark, the north arrow, room names inside their rooms, LTR inside RTL, no sideways scroll; at 360 px the map is 326 px wide and a letter box is 26 px.
- **Ran:** `npm test -w server` 117/117; `node --test tools/*.test.mjs` 82/82; type check clean; lint 4 warnings (all from before this change); `npx playwright test` against a local test instance (port 3100): 19 passed, 2 skipped (the 360 px test runs on one project only). Evidence: `docs/testing/evidence/map-v2-app/2026-11-19/`.
- **verify-user-flow:** 6 mobile PASS; 7 desktop PASS; 8 Arabic/RTL PASS; 1 happy path PASS (the player opens with the v2 map); 2 controls N/A (the map has no controls yet; answering is main ticket 08); 3, 4, 10, 12 N/A (no answering, saving or replay in this ticket); 5 failure states: unknown kinds skipped (in code; no browser case); 9 keyboard N/A (no map controls); **11 axe scan NOT VERIFIED** (no axe in the repo).
- **NOT VERIFIED:** a real phone (the owner judges); the axe scan; live playback is unchanged and not re-checked by hand.
