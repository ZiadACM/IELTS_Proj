# Handoff: start the Listening map redesign (2026-11-18)

Read `docs/development/agent-rules.md` first, as always. Branch: `agent/map-format-v2` (or a new `agent/<slug>` branch from it). Run `git status` first.

## The source of truth

`docs/content/map-redesign-interview.md`: the owner's interview, the agent review (8 numbered proposals), the voice decision (**keep Kokoro**; the voice must be free) and the open questions.

## Before building anything

1. Ask the owner to confirm or change Agent review items 1 to 8, unless the owner already answered them in the message that started this session. Record the answers in that file, and as owner decisions in `docs/product/owner-decisions.md` where they change a rule:
   - item 1: synthetic audio allowed for published items (this would be D24); it changes the protected validator rule `audio-source`, so it needs the owner's explicit approval;
   - item 2: the D23 amendment for eased replay.
2. Do not edit `tools/validate-content.mjs` or its tests and fixtures without that approval (protected files).

## Work, in order (each a ticket in `.scratch/map-format-v2/issues/`)

1. **Kokoro sound.** Improve `.scratch/map-format-v2/scripts/render.py`:
   - render whole paragraphs instead of one sentence at a time;
   - keep natural pauses instead of capping them;
   - add a deliberate pause before a self-correction.
   Cue times and `atSec` must still come from Kokoro's token timestamps, mapped through any cuts. Then run a blind test of 2 or 3 Kokoro voices or settings on the same 3 sentences; the owner picks. You cannot listen: the owner does.
2. **Talk-writing guide and drafting prompt.** Write these from the interview: a formal register, one speaker, 3 questions in walk order, traps per tier (item 4), and a left/right self-correction with a pause. Update `docs/content/prompts/redraft-first-challenge-anchored.md`, or write a new prompt beside it.
3. **Smooth Answer Replay** in the prototype (branch `agent/map-format-v2-prototype`). Merge `agent/map-format-v2` into it first.
   - The line grows along the path, eased, arriving at each point at its `atSec` and never early (item 2).
   - Pull-back and redraw only at a self-correction (item 5; this needs a format change).
   - Highlight all 3 answers at the end.
   - Reduced-motion version (item 8).
   - Publish to the same page, https://claude.ai/artifact/Sf2i7Uv2rCZVGKYUPKhgM3, after reading it with the Artifact tool's `read` action.
4. **Redraft and re-voice the first challenge** with the new guide and settings. Run the checks in `.scratch/map-format-v2/scripts/README.md`, then `validate-ielts-content` Layer 2 in a fresh-context sub-agent.

Map look: the owner likes it as it is; do not change it. Outdoor maps are still open.

## Rules for this work
- Commit only on `agent/*` branches. Never push or merge: the owner pushes.
- Report anything not run as NOT VERIFIED. End with the completion report (`agent-rules.md`, section 4).
- The owner's short notes sometimes describe rather than request: ask before reworking anything not listed here.
