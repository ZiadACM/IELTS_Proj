# 02: Rewrite first-challenge-001 as an anchored item

**What to build:** The featured first challenge becomes an **anchored item** (D21): each of its 3 questions starts again from a fixed point, and most answer places are described by position, not walked to. It keeps the v2 map from ticket 01, the same three places and answer letters, the same micro-skills, and tier 2 rules (exactly one distractor or one self-correction). The draft gets new synthetic audio, re-timed cues, hints and English and Arabic explanations. It stays `draft` and does not replace the item in `docs/content/items/` until the owner reviews it.

**Blocked by:** 01 (map format v2 and route legs, D21)

**Status:** ready-for-human (owner review of the draft)

## Scope

- [x] New script: one leg per question; Q1 a walk from the main entrance, Q2 a pointing leg from the staff office, Q3 a pointing leg from the café with the self-correction
- [x] Draft item: `.scratch/map-format-v2/first-challenge-001.anchored.json` (version 3, `draft`)
- [x] Synthetic audio with the owner-approved Kokoro settings (`docs/content/prompts/draft-map-item.md`), cues re-timed and checked against the decoded file
- [x] Validator (v1 rules) passes with the audio
- [x] `validate-ielts-content` judgement checks, with what an agent cannot check marked NOT CHECKED
- [x] Prototype plays the new draft
- [ ] Owner listens and reviews (one defensible answer per question; Arabic explanations by a fluent reader)
- [ ] Owner decides whether it replaces `docs/content/items/first-challenge-001.json` (a new ticket, since the published path and Browse use that file)

## Content Validation

See Comments for the Layer 1 result and the judgement checks.

## Comments

### 2026-11-18, agent
Draft: `.scratch/map-format-v2/first-challenge-001.anchored.json` (v3, `draft`), audio `.scratch/map-format-v2/audio/first-challenge-001-anchored.m4a`. Same v2 map, same places and letters (q1 Quiet Lounge C, q2 Craft Room F, q3 Table tennis room H), same micro-skills. Legs: q1 walks from the main entrance (e1 to e4); q2 points from the staff office (e5, e6); q3 points from the café with the self-correction south to north (e7 to e9). Changes to the map: the café is now a landmark (it anchors q3); the corridor junction is gone (not spoken); anchor points sit under their room labels.

**Audio:** Kokoro 0.9.4, `bf_emma`, speed 0.75, the approved pause settings (0.35 s cap in c9 for the hesitation), AAC 64 kbit/s: 64.84 s, 176 words. Throwaway render script in the session scratchpad; nothing added to the repo.

**Timing check** (decoded the `.m4a`; speech within 0.06 s after each start and before each end, silence in every gap and the lead-in): PASS. With c6 to c8 shifted by 0.2 s it fails, as it should.

**Independent review** (fresh-context agent, `validate-ielts-content` Layer 2; it did not draft the item), then fixes:
```
Item: first-challenge-001 v3     Layer 1: PASS (0 errors)
Layer 2: 1 NOT CHECKED | 2 PASS | 3 PASS (weak traps) | 4 FAIL (pace) | 5 PASS with notes | 6 NOT CHECKED (written rule PASS) | 7 PASS
NOT CHECKED: 1, an agent cannot listen; 6, Arabic needs a fluent human.
Verdict: NEEDS FIXES
```
- Check 2 evidence: q1, D is on the right but not at the far end, A is on the left, and the far-end room on the left (Kitchen) has no letter. q2, F is the only room both directly north of and next door to the staff office (the Store is further north and not touching; E is across the corridor; B is next door to the south). q3, E touches the café's south wall with no corridor, so the cancelled "south" points only to E, and "across the corridor" fits only H.
- Fixed: c6 "west wing" (no wing on the map) now "Find the staff office, over on the west side of the map"; c8 now "For this one, start at the café"; c9 "the small corridor" now "the corridor" (all are the same width); the q2 explanation now presents E and the Store as "don't confuse it with" (the audio never names them); the q3 Arabic quote is now «I mean north» (the old quote stopped before the key word). Audio re-rendered and re-timed after these; timing check PASS again.
- Fixed in `docs/content/map-format-v2.md`: a leg may start with a `landmark` event; a pointing leg may contain a correction or distractor event.
- Kept: `difficulty.landmarks` 7 counts the map's landmarks, and `routeSteps` 6 counts move, landmark and turn events, the same conventions as v1 (ticket 02 of the prototype). Traps E, Store and A are not spoken, which matches `distractors: 0`.
- Follow-up: the drafting prompt still describes a 1000 x 700 map (ticket 01 follow-ups).

**Still open (owner):**
- **Pace FAIL:** 173 words per minute during speech and 163 overall, above tier 2's 140 to 160. Cutting words does not change it; the voice speed does. Options: re-render at speed 0.70, or accept for the synthetic draft (a published item needs a human recording anyway).
- Listen (check 1), one defensible answer (check 2, the owner's own view), and the Arabic explanations by a fluent reader (check 6).

Layer 1 after fixes: `node tools/validate-content.mjs .scratch/map-format-v2/first-challenge-001.anchored.json --assets .scratch/map-format-v2` exit 0. Prototype variant D plays this draft (Playwright at 360 px: no script errors).

### 2026-11-18, owner
Re-record at speed 0.70 (D22).

### 2026-11-18, agent
Re-rendered at speed 0.70 with the same pause settings: 67.92 s, 176 words, **155 words per minute overall** (165 during speech), inside tier 2's 140 to 160: check 4 now PASS. Map coordinates also changed (ticket 01, D22): C is now at (933, 702), and the q1 route follows it. Timing check against the decoded file: PASS. Layer 1 with assets: exit 0. Still open: the owner's listen (check 1), own answer check (check 2) and a fluent reader for the Arabic (check 6).

### 2026-11-18, owner
Review of prototype version 6, variant D: the line from the main entrance is fine, but the pointing lines cut through walls and rooms; every line is drawn before its words are spoken; a leg must start at an entrance, never at a room. The talk will be redrafted by an external AI. Recorded as D23.

### 2026-11-18, agent
- Version 3 of the anchored draft is superseded: its q2 and q3 legs start at rooms (staff office, café). Kept as the base the redraft merges into (map, audio settings, fields).
- Drafting prompt for the owner's AI: `docs/content/prompts/redraft-first-challenge-anchored.md` (every question starts at the main entrance and walks the corridors; events carry `word` for timing; map tables included).
- The fixes and the rest of this work moved to ticket 03 and its handoff, `docs/development/handoffs/2026-11-18-map-v2-replay-fixes.md`, for a new session. The helper scripts are saved in `.scratch/map-format-v2/scripts/`.

### 2026-11-18, owner (listen of prototype version 7, variant D)
"Cool … I like this as a start." The map looks good. The voice, audio and talk overall still need a lot of help. The replay lines could move more smoothly. The self-correction ("oh, sorry, I mean north") is unneeded. "Okay for now."
