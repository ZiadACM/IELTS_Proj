# Owner interview: redesigning the Listening map section

Source prompt: [prompts/redesign-map-section-interview.md](prompts/redesign-map-section-interview.md) (the owner used a short interview-only version of it).
Purpose: record the owner's own answers. This file does not design anything. It is the record the design work starts from.

Status: interview complete (owner with an external AI, 2026-11-18). Checked by the coding agent on 2026-11-18 against the spec, the validator and owner decisions D21 to D23. The owner said "adjust it as needed". Items marked **Proposed (agent)** are the agent's recommendations, **not decided**: the owner confirms or changes each one before design starts (see "Agent review").

## Decisions (owner)
- Voice: synthetic, using the best free text-to-speech engine, for drafts and prototypes. The owner will not record and does not want volunteers. The voice must be free (no paid services or voice actors).
- Target sound: clean studio, no background ambience.
- Answer Replay motion: driven by the word times, but eased between them so it never looks stepped.
- The line pulls back and redraws **only** at a self-correction, not at traps (decoy rooms, preposition tricks): traps do not change the route, so the line moves through them normally.
- At the end of the replay, all 3 answers are highlighted together as a short summary.
- Quality bar ("much nicer"): a clean, modern, minimal app feel. The owner does not want to name specific apps, games or videos.

## Agent review (2026-11-18): conflicts and gaps, with proposals

1. **Blocker: who records the published voice.** The validator refuses to publish an item without a human recording (`audio-source`: a published item needs `audio.source: "human"`). The owner will not record, wants no volunteers, and the voice must be free. As things stand, no item can be published.
   - **Proposed (agent):** allow a published item to use synthetic audio, with three conditions: the engine's licence allows use in the app, the owner has listened to it, and it passes the timing checks. This changes a validator rule (a protected file) and the spec, so it needs an owner decision recorded as D24.
   - The licence matters here: Kokoro's model is Apache-2.0, but OmniVoice's model is non-commercial only (see "Voice candidates").
2. **Smooth replay versus D23 rule 3.** D23 says a part of the line appears only after its words. Easing means the line grows toward a point while its words are being spoken.
   - **Proposed (agent):** amend D23. The line may grow toward a point while its words are spoken, arrives exactly when they end (`atSec`), and never reaches a point early.
3. **Help is split by mode, not by tier.** The interview recorded "tier 1 generous, tiers 2 to 3 exam-strict, as already planned". The spec actually splits help by mode, at every tier:
   - guided practice allows hints and replays, recorded as support usage;
   - an independent check allows one listen, no hints, no replays and no transcript.
   - **Proposed (agent):** keep the spec. Tiers differ in pace, map density and traps, not in help.
4. **How many traps per tier.** The interview says "keep all three, tune by tier". Today a tier 2 item has exactly one distractor *or* one self-correction.
   - **Proposed (agent):**
     - tier 1: one trap, never a self-correction;
     - tier 2: one or two traps, at most one self-correction;
     - tier 3: two or three traps, at most one self-correction.
     - Each trap type is used at most once per talk.
5. **The correction animation needs a format change.** Today a correction event only marks the wrong place, and the replay skips it.
   - **Proposed (agent):** a correction event carries a short wrong path along the corridors (for example two or three points toward the wrong side). The replay draws it, pauses briefly, pulls it back, then draws the corrected direction. Every point stays on corridors (D23).
6. **Compass words.** The interviewer's note that learners' trouble with compass words "explains the push against" them is the interviewer's inference, not the owner's words.
   - **Proposed (agent):** keep compass words in the talks, because real exams use them. Use left/right pairs for self-corrections, as the owner asked.
7. **Pace.** The interview gives no number. The owner did not flag speed, so the current pace (153 words per minute overall, tier 2) seems fine.
   - **Proposed (agent):** keep the spec's tier ranges (tier 2: 140 to 160 wpm), and treat "calm, measured" as the target within them.
8. **Not covered in the interview:**
   - **Reduced motion.** **Proposed (agent):** no growing animation and no pull-back; each piece appears at its word time, and a correction shows as a dashed frame.
   - **Arabic explanations in tiers 2 and 3.** **Proposed (agent):** keep them in every tier, after answering. The spec already has them.
   - **Outdoor map style.** Still open (see "Open questions").
   - **How many items per kind of place.** Open; it belongs in the content plan, not this file.

## Voice candidates (all free)
- **Kokoro** (current; `bf_emma`, speed 0.70). Code and model are Apache-2.0. The owner finds it robotic and flat, with odd pauses and joins. Some of the joins and pauses come from our own pipeline, which renders each sentence separately and caps pauses, so try fixing those before switching engine. It gives word times, which the replay needs.
- **OmniVoice** (github.com/k2-fsa/OmniVoice; suggested by the owner on 2026-11-18). Checked by the agent on 2026-11-18 from the GitHub README and the Hugging Face model page:
  - **Licence:** code Apache-2.0, but **the pre-trained model is CC-BY-NC (non-commercial)** "due to constraints from its training data". Fine for drafts and prototypes; risky for audio shipped in the app if it could ever be called commercial. Needs the owner's decision.
  - **Voices:** no preset voices. It clones a voice from a 3 to 10 second sample clip, or designs one from a text description, or picks one automatically. Cloning needs a voice we have the right to use; its disclaimer forbids unauthorised cloning.
  - **Word times:** none, so the replay's word times would need a separate alignment step (for example Whisper word timestamps).
  - **Size and hardware:** 0.6B parameters; runs on Apple Silicon (MPS) and NVIDIA GPUs; install with `pip install omnivoice`.
  - **Not checked:** sound quality, speed on this Mac, Python version needs.
- **Proposed (agent):** a blind listening test, as done for Kokoro on 2026-11-17. The same 3 sentences are rendered by:
  - Kokoro with a better pipeline (whole paragraphs, natural pauses);
  - OmniVoice with a designed voice;
  - one more free engine with a licence that allows use in the app.
  The owner picks by ear; the agent checks the licence and the word timing for the winner.

## Open questions
- Which free engine wins the listening test (above)?
- Which accent counts as "clear": the owner decides when listening to samples.
- Exact wording of a left/right self-correction, with a pause before the correction: still to be drafted.
- Outdoor maps (parks, campuses): the indoor look needs nothing added; outdoor path maps have not been reviewed and may need their own look (a key, path styles).
- Agent review items 1 to 8: owner to confirm or change.

## Topics

### Voice and audio
- What's wrong with the current voice (Kokoro, bf_emma, 0.70 speed): **robotic and flat**, and **odd pauses and joins between sentences**. Not flagged: the speed itself, accent or pronunciation.
- Target voice and accent: any clear native English accent (British, American, Australian). The accent isn't the issue; clarity and naturalness are.
- Getting the voice, given it must stay free: the best free text-to-speech engine, no humans. The owner does not want to record or find volunteers. (Publishing then needs a rule change: Agent review item 1.)
- Ambience: clean studio sound, no room tone or background noise, like real IELTS.
- Real IELTS feel versus the current app: calm, clear, deliberately paced, measured but still natural, not robotic. This is the pacing target (not conversational speed, not the current flat delivery).

### The talk
- Tone: formal, like a real guide or announcer; minimal small talk, close to the real exam register.
- Self-correction, in the owner's words: "some IELTS exams include this type of correction but on this example it sounded odd, it should be something like 'to your right... oh sorry, I meant to the left' (not exactly that, but the south/north version shouldn't be how it's done), also a pause in between." So:
  - keep the self-correction as a device;
  - use left/right-style pairs rather than north/south;
  - add a pause before the correction;
  - the exact wording still needs drafting.
- Speaker count: one speaker only, no guide-and-visitor dialogue.
- Length: keep 3 questions per talk, just better written.
- Question order: always follows the walk order (the first room described is the first question), even in higher tiers.
- Traps: keep all three (a decoy room near the answer, opposite-versus-next-to and other preposition traps, a reworded self-correction). None feel cheap; tune them by tier (Agent review item 4).

### Settings and maps
- Places wanted: community centre (current), museum or gallery, park or outdoor campus, sports or leisure centre. The owner wants variety across all of these.
- Indoor and outdoor: both. Indoor floor plans for buildings; outdoor path maps for parks and campuses.
- Current map look: the owner likes it as it is, with nothing missing (floor plan, letter boxes, room names, north arrow, "You are here" marker). No key, colour or shape changes requested.

### Answer Replay and motion
- "Smooth" means a line that grows continuously along the path, not snapping into place in steps, in step with the words.
- At a self-correction only, the line briefly reverses: it pulls back and redraws the corrected direction (format change: Agent review item 5). Traps do **not** get this treatment.
- Speed: driven by the word times, but eased between them so it never looks jerky, not exact lockstep if that would look rough (D23 amendment: Agent review item 2).
- Ending: when the whole replay finishes, highlight all 3 answers together as a short summary moment.

### Learners
- Target band: middle (5.5 to 6.5) and higher (7+); not band 4 to 5 learners specifically. The spec says roughly 5.5 to 7.0, which agrees.
- What's hardest for these learners in map tasks:
  - spatial prepositions (next to, opposite, between), which don't map directly from Arabic;
  - keeping up with the speaker while tracking the map;
  - compass directions, which are less automatic in everyday Arabic speech.
- Help: the interview recorded "tier 1 generous, tiers 2 to 3 exam-strict"; the spec splits help by mode instead (Agent review item 3).

### Feeling and quality bar ("much nicer")
- "Much nicer" means a clean, modern app feel: crisp and minimal. The category is enough; the owner does not want to name examples.
- Owner confirmed there was nothing else to add on the first pass.
