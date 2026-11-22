# 12: Resuming and repeating

**What to build:** A learner who leaves a guided attempt resumes where they left off. A learner can redo a submitted item in guided practice; the redo is flagged seenBefore and Browse marks seen items.

**Blocked by:** 08 Guided practice: answer and submit

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] At most one open attempt per user per item; starting again resumes it (EXAM-07 passes)
- [ ] Interruption recorded on the attempt
- [ ] Redo flagged seenBefore and shown in history
- [ ] Browse marks seen items
- [ ] A seen map in Browse links to its last review (`GET /attempts/{id}/review` exists since ticket 09; owner, 2026-11-20)

## Comments

### 2026-11-19, from ticket 08 (owner: fix here, not in 08)
- **Known issue:** answers that could not be sent stay on the device (`web/src/saved-answers.ts`) and win over the server's copy when the attempt is opened again. If the learner answered later on another device, the older device copy overwrites those newer answers.
- **Fix here:** when resuming, keep the newest copy. For example, store a change time with the device copy, and have the server return when it last saved the answers.
