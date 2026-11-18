# Prompt: interview the owner, then redesign the Listening map section from scratch (external AI)

Owner use: copy everything below the line into a new chat with a capable AI (one that can search the web is best). Answer its interview questions. Bring its final answer back to the coding agent, who turns it into tickets and owner decisions. The AI proposes; nothing it says is decided until the owner agrees, and the coding agent checks every fact before building.

Why this prompt exists: the owner's review of prototype version 7 (2026-11-18, ticket `.scratch/map-format-v2/issues/02-first-challenge-anchored.md`). The map drawing looks good. The voice, the audio and the talk overall need a lot of help; the replay line should move more smoothly; the self-correction felt unneeded. The owner wants a fresh look that does not lean on the current design.

---

You are a senior learning designer and audio producer helping me redesign one part of an app: **IELTS Listening map labelling practice** for adult Arabic-speaking learners. I am the owner. I am not a programmer; explain things in plain English.

**Do not design anything yet.** First interview me (Part 1), then design (Part 2). Treat everything in "Where we are now" as something you may throw away, except the hard rules.

## The app in brief

- An adaptive IELTS practice app (Academic Reading and Listening), mobile first, for adult Arabic-speaking learners. The first release is free. The interface is in Arabic (right to left); maps and recordings are in English, as in the exam.
- **Map labelling** (like IELTS Listening Part 2): one speaker describes a place; the learner matches place names to letters on a map.
- After answering, the learner gets **Answer Replay**: the recording plays again while a line traces the speaker's route on the map in step with the words, plus an explanation in English and Arabic for each question.
- Three difficulty tiers: tier 1 a gentle guided tour, tiers 2 and 3 real-exam style.
- The first map task every new learner sees is the **first challenge**. It must feel like the real exam, be fair, and leave the learner feeling they can do this.

## Where we are now (you may discard all of this)

- The map is drawn by the app from coordinates as a floor plan: rooms, corridors, doors, a north arrow, a "You are here" marker, square letter boxes A to H, and room names inside rooms. It fits the phone's width (the map is about 326 px wide on a 360 px phone). **I like how the map looks.**
- Draft audio is made with a free, local text-to-speech engine (Kokoro, British female voice "bf_emma", slowed to 0.70 speed, pauses trimmed). Each sentence is rendered separately and joined with short silences. **I do not like how it sounds yet.**
- The talk (the script) is written by an AI and then fixed for correctness: 3 questions, each starting again at the main entrance and walking along the corridors. **I think the talk overall needs a lot of help.** The self-correction ("...directly south of the café... oh, sorry, I mean north") felt unneeded.
- Answer Replay draws the route as a line made of straight pieces. Each piece appears in one step, right after the speaker says the words for it. **It should move more smoothly.**

## Hard rules (these stay)

1. **Original content only.** Never copy or closely paraphrase any Cambridge or IELTS published test, script or map, or any commercial practice test. Use official IELTS pages (ielts.org, British Council, IDP) for the format only.
2. **Published items need a human voice recording.** Synthetic speech is for drafts and prototypes. So treat the synthetic voice as a drafting and testing tool, and say how a human recording would fit in.
3. **Replay lines (owner decision D23):** every question's line starts at an entrance or gate, follows paths and corridors and goes through doors (never through a wall or a room), and each part appears only after the speaker has said the words for it, never before.
4. **Phone first:** everything must work on a 360 px wide phone, with the whole map visible while listening (no zooming). Text on the map at least 11 px.
5. **Fair answers:** each answer must be the only letter a careful listener can defend.
6. **Accessibility:** a transcript always exists; the app must work by keyboard and with reduced motion (anything animated needs a calm alternative).
7. **Learner-friendly topics:** everyday settings; avoid alcohol, religion, romance, gambling and politics.
8. **The voice must be free.** No paid text-to-speech services, no paid voice actors, no subscriptions or per-character fees. Only free options: free or open-source speech engines (running locally or with a free licence that allows use in an app), or free human recordings (me, or volunteers). The rest of the budget is small too; if you suggest anything else that costs money, give the price and a free alternative.

## Part 1: interview me

Ask me questions in rounds of **at most 5 questions**, numbered, each with 2 to 4 suggested answers I can pick from (I can also write my own). After each round, summarise in 2 or 3 lines what you learned, then ask the next round. Keep going until you can design with confidence; expect about 5 to 8 rounds. Do not skip a topic because you can guess the answer: ask.

Cover at least these topics:

- **Voice and audio:** what exactly sounds wrong (robotic, flat, too slow, odd pauses, accent, pronunciation, joins between sentences)? Which voices or accents do I like? Should there be a sense of place (room sound, light background noise) or a clean studio sound? How do real IELTS recordings feel to me? The voice must be free (hard rule 8): would I record myself, find volunteers, or rely on free speech engines? Which free engines or voices should we compare, and how?
- **The talk:** what makes a talk feel natural to me? How chatty or formal should the speaker be? How long? How many questions? Should questions follow the order of the walk? Which traps do I want (a room named near the answer, "opposite" versus "next to", a correction) and which feel cheap or unneeded? Should the speaker ever correct herself? One speaker or two (for example a guide answering a visitor's question)?
- **Settings and maps:** which kinds of places do I want (community centre, museum, park, campus, farm, sports centre)? Indoor floor plans, outdoor maps, or both? What do I like about the current map look, and is anything missing (a key, symbols, colour, room shapes)?
- **Answer Replay and motion:** what should "smooth" look like (a line growing along the path, a moving dot, the map gently highlighting the room being described, the current words highlighted in the transcript)? How fast? What should happen at a correction or a trap? What should learners see after the line finishes?
- **Learners:** their level (roughly which IELTS band), what they find hardest in map tasks, and how much help (hints, Arabic explanations, slower audio) they should get in each tier.
- **Feeling and quality bar:** two or three apps, games or videos whose look or feel I admire, and what "much nicer" means to me.

## Part 2: design (only after the interview)

Start with a one-paragraph summary of what you heard from me, and ask me to confirm it. Then give:

1. **Voice and audio plan.** The recommended way to make draft audio and final audio, using free options only (hard rule 8): name each engine or approach, its licence, and why it would sound better than what we have. Exact settings: speaking speed in words per minute for each tier, how pauses work inside and between sentences, how sentences are joined, loudness, any background sound, and the file format. A short checklist I can use when listening to a new recording.
2. **Talk-writing guide.** Rules for writing a natural, fair map talk for each tier: structure (opening, orientation, one section per question, closing), sentence length, the spoken phrases to use and to avoid, how to pin down an answer room fairly, which traps to use in which tier, and how to make sure every direction is true on the map.
3. **One complete sample item** on a **new, original map** of your choosing (not a community centre, unless I asked for one in the interview):
   - The map as a list: the building or area outline, every room or area with its rectangle (x, y, width, height on a 1000-wide grid, with x growing east and y growing south), each room's door, the paths or corridors as lines, the entrance or entrances, symbols, and 8 lettered places A to H.
   - The talk, cue by cue (one or two sentences each).
   - For each question: the answer letter, the route as a list of points along the paths with the exact words after which each point should be drawn, and a short explanation in English and in Arabic (Modern Standard Arabic, plain and friendly; English only for the speaker's exact words, in «guillemets», with Arabic words on both sides).
   - A self-check table: every direction in the talk checked against the coordinates, and the two most tempting wrong letters per question with why each is ruled out.
4. **Answer Replay motion design.** Describe exactly how the line and anything else moves: what grows, at what speed, how it eases, how it stays in step with the words, what happens at each question change, at a trap or a correction, and the reduced-motion version. Describe it so a developer can build it without guessing.
5. **Map visual refinements** (optional, small, since I like the map): anything that would make it read better on a phone.
6. **Open questions and risks:** anything you are unsure about or that I still need to decide.

Be concrete: numbers, examples and exact wording, not general advice. If you use web sources, list them at the end.
