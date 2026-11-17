# 02: First real item: the featured first challenge

**What to build:** A dedicated tier 2 guided tour item with 3 questions exists as real content, drafted with synthetic audio, and passes the validator. This proves the format on real content before any app is built. Phase B. A person reviews it; it is not published by an agent.

**Blocked by:** 01 Content format version 1

**Status:** ready-for-human

Spec: `../spec.md`

- [ ] Item is original, carries the Unofficial practice label and is marked as the featured first challenge
- [ ] Map, transcript cues, authored route with distractor or correction events, hints and English and Arabic explanations are complete
- [ ] Validator exits 0 with the assets directory
- [ ] `validate-ielts-content` judgement checks done; Arabic explanations checked by a fluent reader; status stays draft until a human reviewer approves

## Comments

### 2026-11-17, agent (validate-ielts-content, pre-audio fixes)
Item `docs/content/items/first-challenge-001.json` (draft, AI-drafted, first committed here; the as-drafted file was never in git). Layer 1 before edits: `node tools/validate-content.mjs <item>` exit 0; with `--assets docs/content` exit 1, only `audio-missing` (no audio yet).

Owner's suspected problems (coordinates: y grows downward, the entrance is "at the bottom of the map"):
- **FAIL** q1's explanation names "Equipment Store (letter A)": no Equipment Store exists in the transcript or on the map; A is an unnamed letter.
- **FAIL** `difficulty.distractors` 0 while the meeting room misleads: it was spoken but not on the map and had no route event, so the item under-described itself and Answer Replay could not show it. Fixed by making it a labelled landmark the route passes (as the staff office is for q2), with a `landmark` event; distractors stay 0 because tier 2 allows one distractor **or** one correction (spec, Content) and the item already has its correction. Owner to confirm (alternative: a `distractor` event and `distractors: 1`, which breaks that tier 2 rule).
- **FAIL** "on your right" after turning right at the noticeboard: heading east, right is south, but D (650,420) and C (780,360) were both north of the corridor (left).
- **FAIL** "turn left… head down toward the staff office": the staff office (300,320) was north of the noticeboard (y 480), i.e. up the map; and "keep going north" in c13 came with no turn.
- **FAIL** G on the "west side": G (x 350) was east of the junction (x 300), so both G and H were east.
- **FAIL** "Meeting Room" as a proper name: now "the meeting room" (c8, c9, explanations).
- **PASS (requirement carried into the audio)** female voice: the item has no audio yet; the correction note ("corrects herself"), the q3 explanation ("she") and the Arabic «المرشدة» all make the guide a woman, so the one voice must be female.
- Also found: **FAIL** q2's explanation said the staff office is "letter E", but the staff office is a labelled landmark and E a separate letter.

Fixes (status stays `draft`): new layout; the east corridor runs along y 480 with A on the left (650,420), the meeting room (630,540), D (720,540) and C (820,540) on the right; turning left at the noticeboard leads west to a corner (300,480) and north, with the staff office (230,380) and F (230,280) on the left and E (370,380) opposite; G (200,100) west and H (400,100) east of the junction. c7 "keep going along that corridor"; c11 "turn left, walk to the end of that corridor, and then turn right, so you're heading north". q1's level-1 hint is now the meeting room (the last landmark before the answer). q1 and q2 explanations rewritten in English and Arabic; q3 unchanged. `difficulty`: landmarks 7, routeSteps 11 (move, landmark and turn events), distractors 0, selfCorrections 1. A geometric check of every left/right/compass claim against the new coordinates agrees with the transcript. Layer 1 after edits: exit 0 without assets.
