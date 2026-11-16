# 15: Skill states and Progress

**What to build:** The Progress screen shows each micro-skill as not seen yet, building, secure with support or secure independently, lists independent check results (date, tier, score out of N), shows the current recommendation at the top, and has a designed empty state. No percentages or bands.

**Blocked by:** 11 Replays and hints; 12 Resuming and repeating; 13 Independent check

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] Skill-state rules built test-first from a worked-example table taken from the spec; seams confirmed with the owner before tests are written
- [ ] Property tests: seenBefore attempts never change a state; only independent checks reach secure independently
- [ ] One end-to-end API case per state
- [ ] Empty state explains what will appear and offers the first challenge

## Comments
