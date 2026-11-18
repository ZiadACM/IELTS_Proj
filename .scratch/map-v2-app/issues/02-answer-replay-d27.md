# 02: Answer Replay the D27 way

**What to build:** Answer Replay on a v2 map, driven by the audio clock and each event's `atSec`: each point appears whole at its time; the place just named (room area, symbol or answer letter) is lit, one at a time, until the next is named; a new leg starts unlit, earlier legs fade; a correction's `wrongPath` appears, holds 0.8 s, pulls back over 0.45 s (sine easing) and the walk waits; 0.8 s after the last destination all answers are framed and numbered. Reduced motion: wrong path dashed and stays; summary not animated.

**Blocked by:** 01; and `.scratch/listening-map-prototype/` tickets 08 (answer and submit), 09 (review) and 10 (Answer Replay), which hold the screen this runs on. See the comment.

**Status:** done (folded into `.scratch/listening-map-prototype/issues/10-answer-replay-preview.md`, owner 2026-11-19)

Spec: `../spec.md`

- [ ] Replay timing is a pure function of (item, clock time), built test-first from the anchored item's authored times (independent expected values: the prototype's 14 checks, `check-replay.mjs`)
- [ ] Nothing appears before its `atSec`; one place lit at a time; new leg unlit
- [ ] Wrong path: appears, holds 0.8 s, pulls back 0.45 s, is gone; the walk waits
- [ ] Summary 0.8 s after the last destination
- [ ] Reduced-motion version
- [ ] Browser checks seek the clock (headless cannot play AAC); real playback on a phone is an owner check

## Comments

### 2026-11-19, agent
Answer Replay is not in the app yet: it is ticket 10 of the main plan, after 08 and 09. Ticket 10's text predates D27 (it says "traces the route", "step between route events", "0.75x or 1x", and a reduced-motion version "drawn at once with numbered steps"). Proposal: amend ticket 10 to D27 and build this there, rather than a second replay.

### 2026-11-19, owner (via agent)
Decision: amend main-plan ticket 10 to D27 and build 08, 09, 10 in order. This ticket is closed; its checklist moved into ticket 10.
