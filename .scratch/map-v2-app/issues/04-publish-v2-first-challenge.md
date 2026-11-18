# 04: Import and publish the v2 first challenge

**What to build:** Replace `docs/content/items/first-challenge-001.json` (v1) with the reviewed v2 item (`.scratch/map-format-v2/first-challenge-001.anchored.json`, version 5) and its audio, import it through the staff flow and publish it as a `content_reviewer`. Prove the learner flow with `verify-user-flow` (mobile, desktop, Arabic/RTL, keyboard, exam mode).

**Blocked by:** 01; main-plan tickets 08 to 10 (replay); 03; the PR from `agent/first-challenge-v2-reviewed` merged to `main`.

**Status:** needs-info

Spec: `../spec.md`

- [ ] `validate-ielts-content` passes on the item
- [ ] Imported and published through the staff screens (not `/__test__/items`)
- [ ] v1 no longer served
- [ ] `verify-user-flow` all rows

## Comments

### 2026-11-19, agent
A published id cannot be re-imported (409). If v1 `first-challenge-001` is already published in an instance, the v2 item needs a new id (for example `first-challenge-002`) or the old row removed by the owner. Locally it was never published (it needed a human recording before D24).
