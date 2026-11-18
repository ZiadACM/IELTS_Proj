# 09: Review with explanations

**What to build:** After submitting, the learner sees the score, per question their letter and the correct letter (both marked on the map, not by colour alone), the transcript, the English explanation, and can open the Arabic explanation.

**Blocked by:** 08 Guided practice: answer and submit

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] Review is available only for the learner's own submitted attempt (D6)
- [ ] Learner and correct letters distinguished by more than colour
- [ ] Transcript and explanations shown in review only; Arabic explanation is right-to-left, English content left-to-right
- [ ] Review cases in the security suites pass
- [ ] English text inside an Arabic explanation is isolated (`<bdi>` / `unicode-bidi: isolate`), see the 2026-11-18 comment

## Comments

### 2026-11-18, agent (owner request: English inside Arabic)
The Arabic explanations quote the exact English words heard in the audio (e.g. «at the far end»), and use map letters (A to H). Without isolation, the bidirectional algorithm can move neighbouring punctuation and reorder words around these runs. Requirement for this ticket: the review screen must **isolate every English run inside Arabic text**, with `<bdi dir="ltr" lang="en">…</bdi>` or an element with `unicode-bidi: isolate; direction: ltr`. Added as an acceptance check above; test it with q1 to q3 of `first-challenge-001` in `verify-user-flow` (RTL row). The writing rule that keeps these runs short and mid-sentence is in `docs/content/prompts/draft-map-item.md`.
