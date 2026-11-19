# 03: Validator rules for v2

**What to build:** Add the v2 rules from `docs/content/map-format-v2.md` to `tools/validate-content.mjs`, each with a failing fixture and a test, tests first. First batch (handoff): `v2-shape`, `v2-ref`, `v2-inside`, `v2-wrong-path`. The rest of the list (`v2-named-answer`, `v2-label-fit`, `v2-compass`, `v2-start`, `v2-leg-start`, `v2-leg-question`, `v2-hint-leg`, `v2-word`, `v2-at-time`, `v2-route-walkable`) only if the owner says so.

**Blocked by:** none. **Protected files** (`tools/validate-content.mjs`, its tests, `tools/fixtures/**`): needs the owner's explicit approval in the session that builds it.

**Status:** done (merged to `main` in PR #20; status line updated 2026-11-19)

Spec: `../spec.md`

- [x] Each rule has a fixture that fails with its code, seen failing first
- [x] The anchored first challenge passes all rules
- [x] v1 items and existing fixtures unchanged
- [x] Staff import shows the new codes (it calls the validator itself)

## Comments

### 2026-11-19, owner (via agent)
Approved: edit the protected validator, its tests and fixtures to add **only** `v2-shape`, `v2-ref`, `v2-inside`, `v2-wrong-path`. The other rules are not approved yet.

### 2026-11-19, agent
Built on `agent/map-v2-app`. Protected files changed with the owner's approval in this session: `tools/validate-content.mjs` (new `validateMapV2`, called only when `map.format` is present), `tools/validate-content.test.mjs` (appended, nothing existing changed), new fixture `tools/fixtures/map-002-v2.valid.json` (a copy of the reviewed anchored first challenge, version 5). The existing v1 fixture is untouched.
- Seam: `validateItem(item)` codes, as every existing validator test. Not confirmed separately with the owner (the tdd skill asks for that); it is the same seam ticket 08 of map-format-v2 used.
- **Tests first:** 34 new cases (21 `v2-shape`, 6 `v2-ref`, 2 `v2-inside`, 5 `v2-wrong-path`) seen failing (86 pass, 34 fail), then green. Plus: the v2 fixture passes; a point inside a corridor's half-width and a point at a door pass; a polygon area holds a landmark; v2 rules never fire on a v1 map. One of my own tests was wrong (it gave a polygon area a door) and was fixed, not the rule.
- Choices (recorded in `docs/content/map-format-v2.md`): rules run only when `map.format` is present; door tolerance 20 map units; symbol links name a symbol kind; door only on a rect area.
- Server: a staff import of a v2 item without a wrong path is refused with `v2-wrong-path` (new test in `server/src/staff/items.test.ts`).
- **Ran:** `node --test tools/*.test.mjs` 120/120; `npm test -w server` 118/118; type check clean; lint 4 old warnings. CLI: `docs/content/items/first-challenge-001.json` OK; `first-challenge-001.anchored.json` OK; the historical `first-challenge-001.v2.json` FAIL `v2-wrong-path` (expected, see the doc).
- NOT VERIFIED: CI (not pushed). The CODEOWNERS/CI protected-file check will flag this branch, by design.
