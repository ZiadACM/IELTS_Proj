# Helper scripts for map-format-v2 (throwaway)

Saved from the 2026-11-18 session so a later session can repeat the steps. Not production code; no tests.

| Script | What it does |
|---|---|
| `make-v2.mjs` | Builds `first-challenge-001.v2.json` (the v2 redraw) from the v1 item. Holds the map. |
| `make-anchored.mjs` | Builds `first-challenge-001.anchored.json` from the v2 redraw: talk, route, questions. Cue times are left at 0. |
| `render.py` | Renders each cue with Kokoro (`bf_emma`, speed 0.70, D22), caps pauses (0.25 s, 0.35 s in the self-correction cue), joins with 0.3 s lead-in, 0.35 s gaps, 0.5 s tail; writes a WAV and `times.json`. Edit `CAP` if the correction cue id changes. Word times (ticket 03, D23): for every event with a `word`, takes Kokoro's per-token end time for the end of that phrase, maps it through the trim and pause caps, and moves it back to where speech stopped if it lands in a pause; written as `events[].atSec`. Prints `PROBLEM` lines for a word it cannot find. |
| `fill-times.mjs` | Copies the cue times and `atSec` into the item, checks each `atSec` is inside its cue and never goes down (exit 1 if not), and prints the pace. |
| `merge-redraft.mjs` | Merges an external AI's answer (its `2. JSON` section) into the anchored item: only `transcript`, `events`, `questions`; bumps `version`, recomputes `difficulty`, zeroes times; gives questions without an id `q1`, `q2`, ... |
| `check-route.mjs` | Pre-voicing route checks (D23): every `at` on a corridor, door or letter point; legs start at an entrance; one destination per leg, exactly on its letter; walkable segments; `word` in its cue and in order; hint rules. |
| `check.py` | Decodes nothing itself: give it the item and a WAV decoded from the final `.m4a`; checks speech at every cue start and end and silence in every gap (0.06 s tolerance). |

Steps (from the repo root; Kokoro lives in `~/.local/share/ielts-tts/venv`, see `docs/development/proposals/2026-11-17-kokoro-tts.md`):

```bash
PY=~/.local/share/ielts-tts/venv/bin/python; W=<a scratch folder>
HF_HUB_OFFLINE=1 $PY -I .scratch/map-format-v2/scripts/render.py <item.json> $W/a.wav $W/times.json
afconvert -f m4af -d aac -b 64000 $W/a.wav <audio.m4a>
node .scratch/map-format-v2/scripts/fill-times.mjs <item.json> $W/times.json
afconvert -f WAVE -d LEI16@24000 <audio.m4a> $W/decoded.wav
$PY -I .scratch/map-format-v2/scripts/check.py <item.json> $W/decoded.wav
node tools/validate-content.mjs <item.json> --assets .scratch/map-format-v2
```

Run Kokoro from a scratch folder (`cd $W`), not from the repo.
