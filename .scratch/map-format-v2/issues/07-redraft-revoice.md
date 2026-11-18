# 07: Redraft and re-voice the first challenge

**What to build:** Redraft with the new guide (05), voice with the picked voice (04), run the scripts README checks, then validate-ielts-content Layer 2 in a fresh-context sub-agent.

**Source:** `docs/content/map-redesign-interview.md`, `docs/product/owner-decisions.md` (D23a, D24, D25).

**Status:** done

## Comments
- 2026-11-18 (agent): External AI redraft merged (version 5) and voiced with bf_isabella 0.75: 81.3 s, 203 words, 150 wpm overall. render.py now takes in a quiet onset before a dip of 50 ms or less (check.py had failed on the "F" of "First"). Checks: check-route PASS, word times PASS, check.py PASS, validator exit 0. Layer 2 (fresh sub-agent): PASS WITH NOTES. Fixed: c7 now says "the next door on your left" (E's door, on the right, came first); E named as the Q2 decoy; wrongPath 2 points (D25); 2 Arabic wordings. Left for the owner: room B's door opens into the staff office (map; "do not change the map look"); `difficulty.landmarks` counts map landmarks (7), not spoken ones (5). Prototype variant D uses this item; published as version 11. NOT VERIFIED: sound (owner listens), Arabic by a fluent reader. `audio.synthetic` is added only after the owner has listened.
- 2026-11-18 (agent): Owner said to adjust both. Room B's door moved to x 283 on its north wall (at the corridor corner, reachable); difficulty.landmarks now counts landmarks the talk names (5), in the item and in make-anchored/merge-redraft. Published as version 12.
- 2026-11-19 (agent): Owner reviewed and listened. audio.synthetic recorded (Kokoro-82M bf_isabella 0.75, Apache-2.0, listened 2026-11-19, timing check pass); validation.status reviewed. Not published: the app does not read map format v2 yet.
