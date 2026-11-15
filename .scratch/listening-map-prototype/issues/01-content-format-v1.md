# 01: Content format version 1

**What to build:** Content authors can describe a complete prototype item and the content validator accepts it or rejects it with clear codes. The validator gains: difficulty tier (1 to 3), one micro-skill per question from the five prototype micro-skills, two hint levels per question, English and Arabic explanations per question, authored distractor and correction route events, flags (featured first challenge, focused skill challenge with its micro-skill, pilot transfer item) and audio source (synthetic draft or human recording). Phase B. Protected files: the owner must approve this change in this ticket before work starts.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

Spec: `../spec.md`

- [ ] Owner approval to edit the validator, its tests and fixtures is recorded in this ticket's Comments before any edit
- [ ] A valid example item using every new field passes the validator
- [ ] Invalid examples fail with a distinct code each: missing tier, unknown micro-skill, missing hint level, level 1 hint landmark not on the route before the answer place, level 2 hint pointing at a missing transcript cue, missing English or Arabic explanation, distractor event without a cue
- [ ] Property-based tests cover: cue times increase; each question's answer place lies on the authored route; level 1 hint landmark precedes the answer place
- [ ] Existing validator tests still pass; markup is still rejected in all new text fields (D4)
- [ ] Spec section 'Content model additions' is satisfied

## Comments
