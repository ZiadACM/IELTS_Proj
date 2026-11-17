# 06: Staff: import, list, publish

**What to build:** Staff sign in and see an item list with status. A content author imports an item file; rejected imports list validator codes. Only a content reviewer can publish.

**Blocked by:** 01 Content format version 1; 05 Accounts

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] Import runs the same validation as the content validator and shows its codes on rejection
- [ ] Item list shows draft and published items to staff only
- [ ] Publish is refused for content_author and allowed for content_reviewer (D8)
- [ ] Learners, guests and admin are denied all staff endpoints; security authorization cases pass

## Comments

### 2026-11-17, owner (via agent `implement` session)
Decisions: (1) staff roles are granted by an owner-run script (`npm run staff-roles -w server`), like invite codes; ADM-07 is not built. (2) Audio storage and the audio-file check at import and publish are deferred to ticket 07; import runs every other validator check. (3) Importing an id that already exists replaces it while it is a draft and is refused (409) once published. (4) The staff screens' Impeccable critique/audit and browser checks are deferred to ticket 07, as for 04 and 05.
