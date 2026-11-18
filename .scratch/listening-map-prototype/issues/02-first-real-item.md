# 02: First real item: the featured first challenge

**What to build:** A dedicated tier 2 guided tour item with 3 questions exists as real content, drafted with synthetic audio, and passes the validator. This proves the format on real content before any app is built. Phase B. A person reviews it; it is not published by an agent.

**Blocked by:** 01 Content format version 1

**Status:** done for the prototype (2026-11-18): item `reviewed` by the owner. Publishing it needs a human recording instead of the synthetic audio (validator rule `audio-source`) and a `content_reviewer` to publish.

Spec: `../spec.md`

- [x] Item is original, carries the Unofficial practice label and is marked as the featured first challenge (`purpose: first-challenge`; the format has no label field, so the app shows the label on every item: ticket 07)
- [x] Map, transcript cues, authored route with distractor or correction events, hints and English and Arabic explanations are complete
- [x] Validator exits 0 with the assets directory
- [x] `validate-ielts-content` judgement checks done; Arabic explanations checked by a fluent reader; status stays draft until a human reviewer approves

## Comments

### 2026-11-17, agent (validate-ielts-content, pre-audio fixes)
Item `docs/content/items/first-challenge-001.json` (draft, AI-drafted, first committed here; the as-drafted file was never in git). Layer 1 before edits: `node tools/validate-content.mjs <item>` exit 0; with `--assets docs/content` exit 1, only `audio-missing` (no audio yet).

Owner's suspected problems (coordinates: y grows downward, the entrance is "at the bottom of the map"):
- **FAIL** q1's explanation names "Equipment Store (letter A)": no Equipment Store exists in the transcript or on the map; A is an unnamed letter.
- **FAIL** `difficulty.distractors` 0 while the meeting room misleads: it was spoken but not on the map and had no route event, so the item under-described itself and Answer Replay could not show it. Fixed by making it a labelled landmark the route passes (as the staff office is for q2), with a `landmark` event; distractors stay 0 because tier 2 allows one distractor **or** one correction (spec, Content) and the item already has its correction. Owner to confirm (alternative: a `distractor` event and `distractors: 1`, which breaks that tier 2 rule).
- **FAIL** "on your right" after turning right at the noticeboard: heading east, right is south, but D (650,420) and C (780,360) were both north of the corridor (left).
- **FAIL** "turn left… head down toward the staff office": the staff office (300,320) was north of the noticeboard (y 480), i.e. up the map; and "keep going north" in c13 came with no turn.
- **FAIL** G on the "west side": G (x 350) was east of the junction (x 300), so both G and H were east.
- **FAIL** "Meeting Room" as a proper name: now "the meeting room" (c8, c9, explanations).
- **PASS (requirement carried into the audio)** female voice: the item has no audio yet; the correction note ("corrects herself"), the q3 explanation ("she") and the Arabic «المرشدة» all make the guide a woman, so the one voice must be female.
- Also found: **FAIL** q2's explanation said the staff office is "letter E", but the staff office is a labelled landmark and E a separate letter.

Fixes (status stays `draft`): new layout; the east corridor runs along y 480 with A on the left (650,420), the meeting room (630,540), D (720,540) and C (820,540) on the right; turning left at the noticeboard leads west to a corner (300,480) and north, with the staff office (230,380) and F (230,280) on the left and E (370,380) opposite; G (200,100) west and H (400,100) east of the junction. c7 "keep going along that corridor"; c11 "turn left, walk to the end of that corridor, and then turn right, so you're heading north". q1's level-1 hint is now the meeting room (the last landmark before the answer). q1 and q2 explanations rewritten in English and Arabic; q3 unchanged. `difficulty`: landmarks 7, routeSteps 11 (move, landmark and turn events), distractors 0, selfCorrections 1. A geometric check of every left/right/compass claim against the new coordinates agrees with the transcript. Layer 1 after edits: exit 0 without assets.

### 2026-11-17, agent (synthetic audio and cue timing, owner-approved)
Owner approved: macOS `say`, voice "Flo (English (UK))" (female), rate 150; keep the meeting room as a landmark. Each cue rendered separately, silence trimmed, joined with 0.4 s lead-in, 0.6 s between cues and 0.6 s tail (throwaway Node script, nothing added to the repo), then `afconvert` to AAC 64 kbit/s: `docs/content/audio/first-challenge-001.m4a`, 90.82 s, 606 KB. No MP3 encoder on this machine, so `audio.file` is now `.m4a` (no code depends on `.mp3`; ticket 07 must serve it as `audio/mp4`). Pace: 161 wpm during speech, 145 overall (tier 2 "natural", 140 to 160).

Cue times come from the measured lengths, then were checked against the final file: decoded the `.m4a` back to PCM and confirmed, for all 15 cues, speech at each cue's start, speech just before its end, and silence in every gap (tolerance 0.06 s).

Layer 1: `node tools/validate-content.mjs docs/content/items/first-challenge-001.json --assets docs/content` exit 0. `--require-published` exit 1 (`not-published`; correct for a draft, and publishing would also need a human recording).

```
Item: first-challenge-001 v1     Layer 1: PASS (0 errors)
Layer 2: 1 NOT CHECKED (timing machine-checked, nobody has listened) | 2 NOT CHECKED (owner) | 3 PASS, agent view | 4 PASS | 5 PASS, agent view | 6 NOT CHECKED (owner) | 7 PASS
NOT CHECKED: 1, an agent cannot listen: the cue boundaries are measured, not heard, so a person should play c1, c8/c9 and c14 against the transcript; 2, one defensible answer, the owner's check (agent view: q1 D is past the meeting room but not at the far end and A is on the left; q2 E is opposite, not past, the staff office; q3 G is the corrected-away west side); 6, Arabic explanations for q1 and q2 were rewritten and need a fluent reader.
Verdict: READY FOR HUMAN REVIEW (stays draft; a human sets reviewed/published, and a published item needs a human recording)
```
Notes for 3 and 5: the trap letters (A, D, E, G) are places a careless listener would go, and the correct route needs no second listen; the setting and names are invented and generic. 4: landmarks 7, routeSteps 11, distractors 0, selfCorrections 1, pace natural, all match the audio and route. 7: the transcript is in the item; map places carry text labels.

### 2026-11-18, agent (Kokoro audio, shorter pauses, Arabic explanations rewritten)
Owner's review of the previous version: no PASS/FAIL entry was in this ticket; the owner's requests came in the task message (shorter pauses; Arabic explanations too mixed with English). Transcript, map, route and answers unchanged.

**Audio.** Kokoro 0.9.4 (proposal `docs/development/proposals/2026-11-17-kokoro-tts.md`), voice `bf_emma` (owner's blind-test pick), run offline (`HF_HUB_OFFLINE=1`). `bf_emma.pt` SHA-256 `d0a423de…5da701` matches its VOICES.md prefix (was NOT VERIFIED in the proposal). Each cue rendered separately at speed 0.75: at speed 1.0 the voice speaks about 231 words per minute, far above tier 2. Pauses: inside a cue capped at 0.25 s (Kokoro's own were up to 0.74 s at this speed), except 0.35 s in c14 so the "west side... oh, sorry" hesitation stays audible; between cues 0.35 s (was 0.6), lead-in 0.3 s (was 0.4), tail 0.5 s (was 0.6). AAC 64 kbit/s with `afconvert`: `docs/content/audio/first-challenge-001.m4a`, 82.81 s (was 90.82), 685 KB. Pace: 170 wpm during speech, 159 overall (tier 2 "natural", 140 to 160: inside, at the top end). History: commit c596567 wrongly replaced this with a speed 0.7 render with even shorter pauses (85.48 s). The agent had read the owner's description of this render ("speed a bit slower, pauses a bit shorter", compared with the `say` version) as a change request. The next commit restores this render. Throwaway Python scripts in the session scratchpad; nothing added to the repo.

**Timing check** (same method as before): decoded the `.m4a` back to PCM; for all 15 cues, speech within 0.06 s after each start and before each end, silence in every gap, the lead-in and the tail; decoded length equals `audio.durationSec`. PASS. The check fails as it should when c6 to c8 are shifted by 0.2 s.

**Arabic explanations q1 to q3 rewritten** (owner: the Arabic–English mix is hard to read). One English quote per explanation, only the exact words heard («at the far end», «just past», «oh, sorry, I mean»), always with Arabic words on both sides; no English room names, nothing in brackets. Room names now Arabic only: غرفة الهدوء، غرفة الأشغال اليدوية (was «الحرف اليدوية»)، غرفة تنس الطاولة. q3 now quotes the correction signal «oh, sorry, I mean» instead of two quotes. English explanations unchanged. A script check of the rule (quote count, no Latin outside quotes except map letters, no quote at a sentence or clause edge, no brackets) passes for all three. The writing rule is now in `docs/content/prompts/draft-map-item.md`; ticket 09 now requires isolating English inside Arabic on the review screen.

Layer 1: `node tools/validate-content.mjs docs/content/items/first-challenge-001.json --assets docs/content` exit 0. `--require-published` exit 1 (`not-published`; correct for a draft).

```
Item: first-challenge-001 v1     Layer 1: PASS (0 errors)
Layer 2: 1 PASS (owner listened to this render, no problems reported; timing machine-checked) | 2 PASS (owner) | 3 PASS, agent view | 4 PASS | 5 PASS, agent view | 6 PASS (owner, from the right-to-left preview) | 7 PASS
NOT CHECKED: none.
Verdict: READY FOR HUMAN REVIEW (stays draft; a human sets reviewed/published, and a published item needs a human recording)
```

**Owner review, 2026-11-18** (given in chat, recorded by the agent): Arabic q1 to q3 **OK** (read in the right-to-left preview). Answers **PASS** (one defensible answer per question). Audio (speed 0.75 render): "the sound was a bit slower and the pauses were a bit shorter" (than the `say` version), no change requested.

### 2026-11-18, owner decision (recorded by the agent)
Owner: "mark reviewed". `validation` is now `{ "status": "reviewed", "reviewer": "owner", "reviewedOn": "2026-11-18" }`. The owner made the decision; the agent only wrote it into the file. Basis: Layer 1 PASS and Layer 2 all PASS or PASS (agent view) in the report above (listening, one defensible answer and Arabic checked by the owner). Layer 1 after the change: `node tools/validate-content.mjs docs/content/items/first-challenge-001.json --assets docs/content` exit 0; `--require-published` exit 1 (`not-published`, as expected). Not published: publishing needs a human recording and a `content_reviewer`.
