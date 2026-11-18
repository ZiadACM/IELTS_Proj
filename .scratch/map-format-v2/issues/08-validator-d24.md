# 08: Validator: synthetic audio may be published (D24)

**What to build:** Change rule `audio-source` in `tools/validate-content.mjs` (protected; approved by the owner as D24, 2026-11-18) and its tests, and the spec's audio rule. The owner-listened and licence conditions are human checks; record how they are recorded on the item (for example in `validation`).

**Source:** `docs/content/map-redesign-interview.md`, `docs/product/owner-decisions.md` (D23a, D24, D25).

**Status:** done

## Comments

### 2026-11-18, agent
Protected files changed with the owner's approval (D24, given in this session): `tools/validate-content.mjs`, `tools/validate-content.test.mjs`. Fixtures untouched.
- **Rule** `audio-source`, for a published item: a human recording, or `audio.source: "synthetic"` with an `audio.synthetic` record:
  - `engine`;
  - `licence` from an allow-list of licences that permit app use (`APP_LICENCES`: Apache-2.0, MIT, BSD-2-Clause, BSD-3-Clause, CC0-1.0, CC-BY-4.0; non-commercial licences such as CC-BY-NC are refused);
  - `listenedBy` and `listenedOn` (the owner listened);
  - `timingCheck: "pass"`.
  - Optional fields kept for the record: `voice`, `speed`.
- Drafts are unchanged (no record needed). The validator only checks that the human steps were recorded; it cannot listen or run `check.py`.
- **Tests first** (red: the passing case failed, 70 pass and 1 fail), then green. New tests:
  - the full record passes;
  - each of 8 gaps is refused with `audio-source`: no record, no engine, a non-commercial licence, no licence, not listened, blank listening date, a failed timing check, no timing check;
  - a draft needs no record.
- Wording updated:
  - server: a comment in `staff/items.ts` and a test title in `staff/items.test.ts` (behaviour unchanged: synthetic audio with no record is still refused);
  - spec (`.scratch/listening-map-prototype/spec.md`), the Kokoro proposal (marked superseded), and `prompts/draft-map-item.md`.
- **Ran:**
  - `node --test tools/*.test.mjs`: 82 of 82 pass;
  - `npm test -w server`: 115 of 115 pass;
  - `npm run typecheck`: clean;
  - biome on the changed files: clean;
  - `check-protected-files.mjs` result in the comment below.
