# 06: Staff: import, list, publish

**What to build:** Staff sign in and see an item list with status. A content author imports an item file; rejected imports list validator codes. Only a content reviewer can publish.

**Blocked by:** 01 Content format version 1; 05 Accounts

**Status:** in-review (branch `agent/staff-import-publish`)

Spec: `../spec.md`

- [x] Import runs the same validation as the content validator and shows its codes on rejection (the audio-file check waits for 07, owner decision)
- [x] Item list shows draft and published items to staff only
- [x] Publish is refused for content_author and allowed for content_reviewer (D8)
- [ ] Learners, guests and admin are denied all staff endpoints; security authorization cases pass

## Comments

### 2026-11-17, owner (via agent `implement` session)
Decisions: (1) staff roles are granted by an owner-run script (`npm run staff-roles -w server`), like invite codes; ADM-07 is not built. (2) Audio storage and the audio-file check at import and publish are deferred to ticket 07; import runs every other validator check. (3) Importing an id that already exists replaces it while it is a draft and is refused (409) once published. (4) The staff screens' Impeccable critique/audit and browser checks are deferred to ticket 07, as for 04 and 05.

### 2026-11-17, agent (implement)
Built on `agent/staff-import-publish` from `main`. Routes: `GET /admin/items` (ADM-01), `POST /admin/items` (ADM-02), `POST /admin/items/{itemId}/publish` (ADM-05). Each write calls `validateItem` from `tools/validate-content.mjs` itself (the protected file is imported, not copied; `server/tsconfig.json` gained `allowJs` so the type check can read it). Import always stores a draft: the file's own `validation` block is replaced with `{status: "draft"}`, so a file that says "published" cannot skip review. Re-importing an id replaces it while it is a draft (200, same itemId), and is refused once it is published (409 `item_published`). Publishing validates the item again as published, so the validator's own rule applies: a published item needs a human recording (synthetic audio gives 400 `item_invalid` with code `audio-source`). The reviewer's user id and the date go into the item's `validation`. A rejected import or publish answers 400 `{error: "item_invalid", problems: [{code, msg}]}` and stores nothing. The list carries no answers, route, transcript, hints or explanations, and `canPublish` tells the screen whether to offer the button. Roles live in `staff_roles` (migration 0004), granted with `npm run staff-roles -w server -- grant|revoke|list`; a guest can never get one. Test support: `POST /__test__/users` creates staff; `POST /__test__/items` stores a validated item with the given status. Web: Home shows "Content items (staff)" when the server lets the account see the list; the screen lists items, imports a JSON file (size and JSON checked first) and shows the checker's codes, and offers Publish to reviewers. No new dependency. No protected file changed.

**Results:** `npm test` 93/93 (16 new, written first and seen failing with 404/501; 94/94 after review fixes). Offline security and tools 107 pass, 0 fail, 27 skipped; `scripts/lib` 8/8; the coverage gate accepts the three new routes. Lint, type check, build pass. Owner script tried on synthetic accounts: grant, grant a second role, list, revoke, revoke again (refused), unknown email (refused), unknown role (refused). Live, against a local instance with test support: the shared setup (`POST /__test__/items`, staff users) now passes in every suite. Every remaining failure stops at `POST /attempts` (ticket 08) or, for XSS-01, at the staff preview `ADM-04` (ticket 10). XSS-01's import step refused every HTML payload; only the `{{...}}` template strings were accepted, which D4 allows as plain text. **AUTHZ-06 could not run:** see below. I replayed its ADM-01, ADM-02 and ADM-05 cells with the suite's own `Actor`, recipes and expectations against the live instance: 18 cells, 0 problems (anonymous 401; guest, learner, admin and, for publish, content_author 403; publishing twice refused; no canary in the list).

**NOT VERIFIED:** the AUTHZ-06 suite run itself; the staff screen in a browser and its Impeccable critique/audit (deferred to 07, owner); the new Arabic strings (CS 3.5; they are in `web/src/strings.ts`, and the review sheet `docs/content/arabic-ui-review.md` predates them).

**Open for the owner:**
- Needs a decision (protected file): `tests/security/authorization-enforcement.test.mjs` loops forever until attempts exist. For a denied cell, `prepare()` retries `ownAttempt` with a new learner every time `POST /attempts` fails, with no limit, so AUTHZ-06 never ends before ticket 08. A one-line fix (retry once, then fail) would make it fail closed instead. It needs your approval because the file is protected.
- shortcut: no audio-file check yet (owner decision); ticket 07 must pass its audio directory to `validateItem` at import and at publish.
- shortcut: the reviewer is recorded by user id in the item's `validation.reviewer`, because accounts have no names. Accounts are deleted with ME-03 (ticket 17), and `published_by` then becomes null, while the id stays in the item's JSON.
- shortcut: the staff entry on Home costs one `GET /admin/items` per load for accounts (a refusal hides it). A role field on ME-01 would avoid the call.
- ADM-03 (edit), ADM-04 (preview, 10), ADM-06 (reports, 14) and ADM-07 (roles: owner script instead) stay unbuilt, so their AUTHZ-06 cells will still fail at ticket 20 unless ADM-03 and ADM-07 are removed from the matrix. That is an owner decision on a security document.


### 2026-11-17, agent (code-review)
Two-axis review (standards, spec): no blocking finding. Fixed: test support now fails if a staff role cannot be granted; `POST /__test__/items` refuses a status the file contradicts (so a "published" seed still meets the published rules) and a repeated id (409, was a 500), and uses the import's `{error, problems}` shape (new test, seen failing first); "Tier" became "Difficulty tier" / «فئة الصعوبة» (glossary: avoid "level"); the permission checks are named `contentStaffOnly` and `reviewerOnly`; the browser's file-size comment is accurate. After the fixes: `npm test` 94/94; offline security and tools 107 pass, 0 fail, 27 skipped; lint, type check, build pass; live ADM replay 18 cells, 0 problems; live auth suite unchanged (3 pass; SESS-08/09 stop at ticket 08). Left as is (judgement calls): `problemsOf` stays as the one place ticket 07 adds the audio directory; the web and server item types are separate packages; the error-to-failure chain in `web/src/api.ts`; the Home staff probe (listed above).

### 2026-11-17, agent (follow-up: AUTHZ-06 retry fix, owner-approved protected change)
Owner approved this change to the protected file `tests/security/authorization-enforcement.test.mjs` in the task. `prepare()` → `ownAttempt` now retries a failed attempt setup once with a fresh learner (denied cells only) and then fails with `<endpoint> as <role>: could not set up an attempt on <item> (<mode>) even with a fresh learner, so the deny check cannot run: <cause>`. Allowed cells still fail on the first error, as before. Nothing is weakened: a cell that used to hang now fails.

**Results:** live, against a local instance with test support (port 3100, random token): the fixed AUTHZ-06 ends in 8 s, exit 1, 1 test failed with `ATT-03 as anonymous: could not set up an attempt on p1 (guided) ... 404 {"error":"not_found"}`, the expected stop at ticket 08's `POST /attempts`. Control: the old file on the same instance was still running after 60 s and was killed (exit 142), having created several hundred throwaway users. Offline `node --test tests/security/*.test.mjs tools/*.test.mjs`: 107 pass, 0 fail, 27 skipped (unchanged). `npm run lint` passes (Biome ignores `tests/`). The PR needs the `protected-change-approved` label (NOT VERIFIED: agents do not open PRs or set labels).
