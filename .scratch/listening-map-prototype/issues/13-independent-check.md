# 13: Independent check

**What to build:** A learner starts an independent check on an unseen item after being told the conditions: fixed 30 s reading time, one listen, no hints, no replays, no transcript, answers until audio end plus 2 minutes, then automatic submit. Early submit allowed. Review opens only after submit.

**Blocked by:** 09 Review with explanations

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] Refused on a seen item, with an explanation and an offer of an unseen item (D10)
- [ ] Single forward-only audio grant per D9; resume from furthest byte after a drop; never rewind
- [ ] Server-set deadline; late answers rejected; automatic submit at the deadline with existing answers
- [ ] No answer data delivered before submit
- [ ] All exam-mode security cases (EXAM-*) pass

## Comments
