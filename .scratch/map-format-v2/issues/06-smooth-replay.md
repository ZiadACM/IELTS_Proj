# 06: Smooth Answer Replay (prototype)

**What to build:** On `agent/map-format-v2-prototype` after merging `agent/map-format-v2`: eased growth arriving at each point at its `atSec`, never early (D23a); pull-back and redraw at a self-correction only (D25 wrong path); all 3 answers highlighted at the end; reduced-motion version. Publish to the same artifact page after reading it.

**Source:** `docs/content/map-redesign-interview.md`, `docs/product/owner-decisions.md` (D23a, D24, D25).

**Status:** ready-for-human (owner reviews the page; the real redraft arrives with ticket 07)

## Comments

### 2026-11-18, agent
Built on `agent/map-format-v2-prototype` (merged `agent/map-format-v2` first; commits b65626a and the check-script commit after it). Published as page version 8 at https://claude.ai/artifact/Sf2i7Uv2rCZVGKYUPKhgM3 (same page; read first; the live page was exactly the previous build).
- **Smooth growth (D23a):** the route layer redraws every animation frame from the audio clock (`timeupdate` fires only about 4 times a second, which is why the old line stepped). Each piece grows toward its point with sine easing for 0.35 to 1.6 s (by its length) and reaches the point exactly at its `atSec`, never before, and never before the previous piece ends.
- Cubic easing was tried first: the head sat within half a map unit of the point for the last 0.1 s, so it looked early. Sine easing fixed it: 0.1 s before each `atSec` the line is still at least 1 px short.
- **Correction (D25):** a `wrongPath` grows to the wrong door by the correction's `atSec`, holds 0.5 s, and pulls back over 0.55 s; then the walk carries on. The wrong letter keeps its dashed red frame. A correction without `wrongPath` (variants A to C) is framed only, as before.
- **Summary:** 0.8 s after the last answer is reached, all answer letters get a green frame with their question number, one after another (once). The question list shows the answers. The legs stay faintly visible.
- **Reduced motion:** follows the device setting, with a "Reduced motion" button to preview it. Each piece appears whole at its time; the wrong path appears dashed and stays; the summary is not animated.
- **Demo data:** the current draft's correction ("south of the café ... north") has no `wrongPath`. The build script adds one for the page only (corridor south to room E's door, marked `demoWrongPath`), so the item file is unchanged. The redraft (ticket 07) brings a real left/right one.
- **Checks** (`prototype/check-replay.mjs`, headless Chromium, 360 px, variant D, 17 of 17 PASS):
  - no point reached early, and none late, in both modes;
  - continuous growth along the main hall (34 in-between frames of 41, largest step 12 units);
  - the wrong path grows, holds at the wrong door, pulls back, and is gone, with the frame kept;
  - the summary appears exactly at its time, and the list shows CFH;
  - reduced motion: no partial pieces; the wrong path stays dashed; the summary is not animated;
  - no sideways scroll; no script errors; variants A to C still render.
- Screenshots checked at four moments: mid-growth, wrong path holding, after the pull-back, summary. The first build drew the wrong path under the orange line (hidden where it runs back along it); now it is drawn on top.
- **NOT VERIFIED:**
  - live playback with the recording: headless Chromium cannot play the AAC audio, so the frame loop was driven by seeking, not by `audio.currentTime` while playing;
  - how it feels on a real phone (the owner judges).
