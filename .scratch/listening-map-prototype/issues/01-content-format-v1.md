# 01: Content format version 1

**What to build:** Content authors can describe a complete prototype item and the content validator accepts it or rejects it with clear codes. The validator gains: difficulty tier (1 to 3), one micro-skill per question from the five prototype micro-skills, two hint levels per question, English and Arabic explanations per question, authored distractor and correction route events, flags (featured first challenge, focused skill challenge with its micro-skill, pilot transfer item) and audio source (synthetic draft or human recording). Phase B. Protected files: the owner must approve this change in this ticket before work starts.

**Blocked by:** None (can start immediately)

**Status:** done

Spec: `../spec.md`

- [x] Owner approval to edit the validator, its tests and fixtures is recorded in this ticket's Comments before any edit
- [x] A valid example item using every new field passes the validator
- [x] Invalid examples fail with a distinct code each: missing tier, unknown micro-skill, missing hint level, level 1 hint landmark not on the route before the answer place, level 2 hint pointing at a missing transcript cue, missing English or Arabic explanation, distractor event without a cue
- [x] Property-based tests cover: cue times increase; each question's answer place lies on the authored route; level 1 hint landmark precedes the answer place
- [x] Existing validator tests still pass; markup is still rejected in all new text fields (D4)
- [x] Spec section 'Content model additions' is satisfied

## Comments

- 2026-11-15, owner: "install phase B skills and start ticket 01". Recorded as the owner's approval to edit the protected content validator, its tests and its fixtures for this ticket only. It does not cover `tests/security/**` (see below if that becomes necessary).
- 2026-11-15, agent: validator, valid fixture and tests updated; tool tests 78/78 pass; mutation check: each new rule, when disabled, makes at least 2 tests fail. **Blocked:** `tests/security/fixture-proof.test.mjs` now fails 2 cases (36/36 before this change), because the SYNTHETIC security fixture item (`tests/security/fixtures/items/security-map.template.json`) is in the old format and staff imports (ADM-02, ADM-03) now return 422. Fixing it needs edits under `tests/security/**` (protected, D3), which the approval above does not cover. Waiting for the owner.
- 2026-11-15, owner: "yes, approve the tests/security change". Covers: converting the SYNTHETIC security fixture item to content format v1 (canaries kept), adding `hints` to the leak-scan forbidden keys, and serving hint levels from the fixture server. No existing assertion is weakened.
- 2026-11-15, agent: security fixture updated under the owner's approval. Changes: fixture item converted to format v1 (canaries kept in `explanation.en` and `explanation.ar`); `hints` added to the leak-scan forbidden keys; fixture server serves level 1 then level 2 hints; XSS-01 now injects into `explanation.en` and `explanation.ar` (it previously targeted a plain-string explanation, which the new format rejects for shape alone); the vulnerable LEAK-07 path prints `explanation.en`. Results: `node --test tools/*.test.mjs scripts/lib/*.test.mjs` 78/78 pass; `node --test --test-concurrency=1 tests/security/*.test.mjs` 36 pass, 0 fail, 25 skipped (live cases, no app yet), the same as before this ticket.
