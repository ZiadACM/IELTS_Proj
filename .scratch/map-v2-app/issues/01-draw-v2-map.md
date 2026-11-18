# 01: Draw a v2 map in the player

**What to build:** `web/src/ItemMap.tsx` draws a `map.format: 2` map as the prototype does (variant D): areas (building, rooms with door gaps, water, grass and the other kinds), paths (corridors, roads, dashed footpaths), entrances with "You are here", symbols with a key, the north arrow, landmark labels inside their areas, and answer letters as square boxes (26 px, 15 px bold). v1 maps (no `format`) draw exactly as today. The delivery allow-list (`server/src/catalogue/routes.ts`, `web/src/api.ts`) passes the drawing fields and nothing else.

**Blocked by:** none

**Status:** in-progress (branch `agent/map-v2-app`)

Spec: `../spec.md`

- [ ] v2 map drawn at 360 px and desktop, matching the prototype's look; no sideways scroll
- [ ] v1 maps unchanged (existing browse-player browser test passes)
- [ ] Delivery carries the drawing fields; no route, `wrongPath`, `word` or `atSec` (server test with the anchored item; leakage suite)
- [ ] Unknown kinds are skipped, not fatal
- [ ] Map stays LTR inside the RTL frame; letters readable at 326 px
- [ ] `verify-user-flow` on the player with a seeded v2 item (mobile, desktop, Arabic/RTL)

## Comments
