# 10: Answer Replay and staff preview

**What to build:** In review, Answer Replay draws the authored route across the map in step with the audio the D27 way (amended 2026-11-19, see the comment) and highlights the transcript; authored distractor and correction moments are marked. The learner can play, pause, step between route events, jump to a question's part, and choose 0.75x or 1x. With reduced motion each piece appears whole at its time, a correction's wrong path appears dashed and stays, and the end summary is not animated (D27). Staff preview shows an item exactly as learners will, including Answer Replay.

**Blocked by:** 09 Review with explanations

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] Replay timing driven only by authored cue times; never generated
- [ ] Step back and forward, jump to question, speed control all keyboard operable
- [ ] Reduced-motion version conveys the full route and highlights transcript step by step
- [ ] Staff preview is staff-only and matches the learner view
- [ ] Replay timing logic built test-first from a worked example
- [ ] D27 on v2 maps: each point appears whole at its `atSec` (never before); the place just named is lit, one at a time, until the next; a new leg starts unlit; a correction's `wrongPath` appears, holds 0.8 s, pulls back over 0.45 s (sine easing) and the walk waits; 0.8 s after the last destination all answers are framed and numbered

## Comments

### 2026-11-19, owner (via agent, map-v2-app split)
Decision: this ticket is amended to D27 instead of building a second replay (`.scratch/map-v2-app/issues/02-answer-replay-d27.md` is folded in here). Build 08, 09 and 10 in order with v2 maps in mind. D27 changed how the line is drawn and lit; it did not remove the controls listed above (play, pause, step, jump to question, speed), so they stay unless the owner says otherwise. Behaviour reference: prototype variant D and its checks (`check-replay.mjs` on `agent/map-format-v2-prototype`).
