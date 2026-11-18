# Talk-writing guide: Listening map talks

Status: **Proposed**, 2026-11-18 (ticket `.scratch/map-format-v2/issues/05-talk-guide.md`). Sources: the owner interview (`map-redesign-interview.md`), owner decisions D21 to D26 (`docs/product/owner-decisions.md`), the reference guide (`map-reference-guide.md`, section 6) and the format (`map-format-v2.md`).

This guide is for whoever writes a map talk: a person or a drafting AI. The drafting prompts (`prompts/`) put these rules into the AI's instructions. The validator checks the format; this guide covers what a script cannot check: register, pacing for the ear, and fair traps.

## 1. Speaker and register

- **One speaker.** No guide-and-visitor dialogue, no questions from the audience.
- **Formal, like a real guide or announcer.** One short welcome, then straight to the places. Minimal small talk: no jokes, no "isn't it lovely".
- **Written for the ear.** Short sentences, one direction per clause. Say the place name before describing it ("Next, the Craft Room. Starting from ...").
- The current voice is female (Kokoro `bf_isabella`, D26), so the speaker is a woman unless the item needs otherwise.
- No stage directions, sound effects or brackets inside the spoken text. Write a hesitation as "..." (the voicing adds the pause, section 5).

## 2. Shape of a talk

1. **Opening, 1 or 2 cues:** welcome, where the listeners are standing, and that north is at the top of the map.
2. **One paragraph per question, in walk order.** The first place described is question 1, the second is question 2, and so on, at every tier. The voicing renders each paragraph in one piece, so a paragraph should flow as one short passage (2 to 4 sentences).
3. **Every question starts again at an entrance** (D21, D23), said naturally: "Starting from the main entrance again, ...". Never continue from the previous answer place.
4. The speaker **walks** the listener there along paths and corridors, then pins the place down with rooms passed and position words. The answer place has no name on the map; only labelled places may be named.
5. **Closing, 1 cue.** Short.

Number of questions: the spec (`.scratch/listening-map-prototype/spec.md`, content set) sets tier 1 at 3, tier 2 at 4 to 5, tier 3 at 5 to 6; the first challenge has 3. The interview's "keep 3 questions per talk" was said about the first challenge; **OPEN for the owner** whether it means every talk (ticket 05).

## 3. Position language

- **Compass words stay** (Agent review item 6). Real exams use them in every recording. North is at the top of every map (D22). Use them for positions ("directly north of the staff office", "in the south-west corner").
- **Left and right** are for walking ("on your left", "turn right"). Check each one against the walking direction: walking north, left is west; walking south, left is east; walking east, left is north; walking west, left is south.
- Useful relations (from the reference recordings): next to, opposite, between, at the far end, the first or second door, just past, beyond, in the corner, alongside. These are hard for Arabic speakers (they do not map one to one from Arabic), so they are the core skill; use them precisely.
- Every direction must be true on the map coordinates. One false direction makes the item unfair.

## 4. Traps (D25)

Three trap types. Each type is used **at most once per talk**.

| Trap | What it is | Fair when |
|---|---|---|
| **Decoy room** | A second unnamed room near the answer, told apart only by the relation (left/right of a landmark, before/after it, opposite). | The words rule the decoy out for a careful listener. |
| **Preposition trap** | The answer depends on one relation word: "opposite" versus "next to", "before" versus "just past". | The relation is said once, clearly, and the map makes the two readings point to different letters. |
| **Self-correction** | The speaker names the wrong side, then corrects herself. | See below. |

| Tier | Traps per talk | Self-corrections |
|---|---|---|
| 1 | exactly one | none |
| 2 | one or two | at most one |
| 3 | two or three | at most one |

**Self-correction pattern** (owner, interview):
- Use a **left/right pair**, not north/south: "... the door on your left ... oh, sorry, I mean on your right."
- The mistake comes first, then "..." (a real pause, voiced at 1.2 s or more), then a short, natural correction. Vary the wording between items ("sorry, I mean", "no, my mistake, it's", "I should say").
- The correction names the same kind of thing (a side, a door), so the learner hears what changed.
- Only the corrected place is the answer. The wrong side must point at a real other door or room (that is the trap), and the route carries a short **wrong path** to it (`map-format-v2.md`, correction events).
- Traps are not corrections: a decoy or a preposition trap does not change the route, so the replay draws through it normally.

## 5. Pace and pauses

- Pace per tier from the spec: tier 1 slow and clear; **tier 2 140 to 160 words per minute overall**; tier 3 natural. The target inside each range is **calm and measured** (Agent review item 7), like the real exam, not conversational speed.
- Tier 2 length: about 170 to 200 words for 3 questions (65 to 85 seconds).
- Do not write pauses in; the voicing keeps the voice's own pauses between sentences and puts about 1 s between paragraphs. The only written pause is "..." before a self-correction.

## 6. Help and explanations (unchanged rules, recorded here for writers)

- Help is split by **mode**, not tier (Agent review item 3): guided practice allows hints and replays; an independent check allows one listen and no help. Write two hints per question at every tier.
- Every tier has an English and an Arabic explanation per question, shown after answering (Agent review item 8). The Arabic rules (guillemets for the speaker's exact words, Arabic place names) are in the drafting prompt.

## 7. Before handing over, check

- Every answer is the only defensible letter; try the two most tempting wrong letters for each question.
- Every left/right and compass word is true on the coordinates.
- Questions are asked in the order they are spoken.
- Trap count and types match the tier table.
- Nothing is copied or closely paraphrased from a published IELTS or commercial test.
