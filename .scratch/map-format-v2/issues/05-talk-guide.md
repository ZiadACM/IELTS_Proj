# 05: Talk-writing guide and drafting prompt

**What to build:** Write the guide and update or add the drafting prompt: formal register, one speaker, 3 questions in walk order, traps per tier (D25), left/right self-correction with a pause, compass words kept, pace within the tier range.

**Source:** `docs/content/map-redesign-interview.md`, `docs/product/owner-decisions.md` (D23a, D24, D25).

**Status:** done (one open question for the owner, below)

## Comments

### 2026-11-18, agent
- New `docs/content/talk-writing-guide.md`: one formal speaker; one paragraph per question, in walk order; every question starts at an entrance; compass words kept, left/right for walking; trap types and counts per tier (D25); the left/right self-correction pattern with "..." and a wrong path; pace per tier, calm and measured; help by mode; Arabic explanations in every tier.
- `docs/content/prompts/redraft-first-challenge-anchored.md` updated (not a new prompt): formal register, paragraphs, exactly one left/right self-correction in the table tennis question plus an optional decoy room in the Craft Room question, pace 140 to 160 wpm, and `wrongPath` on the correction event.
- `docs/content/map-format-v2.md`: new "Correction events (D25)" section defining `wrongPath` (1 to 3 points; `at` is the last; `word` names the wrong side) and how Answer Replay and reduced motion draw it. Planned validator rule `v2-wrong-path` listed, not added (protected file). The current validator accepts the extra field (checked on a scratch copy: exit 0).
- `check-route.mjs` checks `wrongPath`: tested on the current item (FAIL: no wrongPath, as expected), a valid left/right wrong path to G's door (PASS), and an off-corridor point (FAIL, 3 reasons).
- `docs/content/prompts/draft-map-item.md`: stale voice settings (bf_emma, sentence by sentence, "a published item needs a human recording") and the tier 2 trap rule brought in line with D24 to D26.
- **OPEN for the owner:** the spec gives tier 2 items 4 to 5 questions and tier 3 items 5 to 6; the interview says "keep 3 questions per talk". Does that mean every talk, or only the first challenge? The guide follows the spec until the owner says.
- Decoy rooms have no event (a lettered room is not a landmark, so the `distractor` kind cannot name it); the trap is named in the explanation. Say if the replay should mark decoys too.
