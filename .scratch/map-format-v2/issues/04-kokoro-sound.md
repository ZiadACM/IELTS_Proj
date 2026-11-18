# 04: Kokoro sound (paragraph rendering, natural pauses, correction pause, voice test)

**What to build:** `scripts/render.py` renders whole paragraphs, keeps natural pauses, and adds a deliberate pause before a self-correction; cue times and `atSec` still come from Kokoro's token times. Then a blind test of 2 or 3 Kokoro voices on the same 3 sentences; the owner picks by ear.

**Source:** `docs/content/map-redesign-interview.md` (voice: keep Kokoro), handoff `docs/development/handoffs/2026-11-18-map-redesign-start.md`.

**Status:** ready-for-human (owner listens to the blind test and picks)

- [x] Paragraph rendering, no pause caps, 1.2 s minimum pause before a correction
- [x] Full first challenge re-rendered in scratch: timing check PASS, word times PASS, route check PASS, validator exit 0
- [x] Blind clips in `.scratch/map-format-v2/voice-test/` (`voice-X`, `voice-Y`, `voice-Z`), pace matched
- [ ] Owner picks a voice; key revealed and recorded here

## Comments

### 2026-11-18, agent
- Kokoro renders a 3-sentence paragraph as one chunk; sentence pauses come out about 0.7 to 0.85 s. The "..." before "oh, sorry" gave only about 0.7 s, now lengthened to 1.2 s.
- Kokoro's first-token start time is about 0.05 to 0.1 s after the speech begins, so a cue start inside speech moves back to where that speech began (never before the previous cue's end).
- Full talk with `bf_emma 0.70`: 83.8 s, 161 wpm during speech, **141 wpm overall** (was 155 overall). Inside tier 2's 140 to 160, but at the bottom; the longer natural pauses are the reason. If the owner wants it brisker, raise the speed a little rather than cap pauses again.
- Blind test: the 3 sentences "Start from the main entrance once more … I mean north." (the self-correction included). Three voices, speed set per voice so pace during speech is about 153 wpm: `bf_emma 0.70`, `bf_isabella 0.75`, `af_heart 0.80` (Kokoro's highest-graded voice, American). Order shuffled; the key is kept outside the repo until the owner picks. Only these four voices are cached offline (`af_bella` too, close to `af_heart`).
- `full-talk-new-pipeline-bf_emma.m4a`: the whole first challenge with the new pipeline, for a before/after against `audio/first-challenge-001-anchored.m4a`.
