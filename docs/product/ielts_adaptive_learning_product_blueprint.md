# Adaptive IELTS Learning App — Product Blueprint

**Working document:** v0.1 — product discovery consolidation  
**Date:** 27 October 2026  
**Status:** Vision and high-level experience agreed; detailed curricula, implementation, and launch strategy pending.  
**Working title:** To be decided.  

> **Purpose of this document**  
> Preserve the product ideas, decisions, distinctions, and open questions discussed so far. It is a foundation for later product requirements, complete Reading/Listening skill trees, prototype design, and technical planning—not a claim that all details have been finalized.

## 1. Product vision

Build an engaging, adaptive IELTS preparation platform focused initially on Arabic-speaking students. Students improve through *doing*: short interactive challenges, targeted techniques, skill-specific practice, clear mistake analysis, and increasingly realistic IELTS tasks. An optional, context-aware AI tutor helps when useful but does not replace the structured learning experience.

**Core promise:** Help learners understand, practice, and independently master the skills required for IELTS—not just watch lessons or accumulate practice questions.

**Longer-term ambition:** Improve English capability more broadly (e.g., comprehension, paraphrasing, listening confidence), while using IELTS as the initial learning goal and organizing framework. Potential future expansion includes Writing, Speaking, grammar, vocabulary, AI conversation, and wider English learning.

**Design principle:** Make difficult things understandable and help students succeed independently; do not make exercises easy merely to manufacture a feeling of progress.

## 2. Problem and opportunity

### Learner problems identified

- Long courses, videos, reading materials, and conventional placement tests can be boring and passive.
- Students may answer many exam questions without understanding why their answers were wrong or which underlying skill they lack.
- General practice scores often hide specific weaknesses (e.g., paraphrasing vs contradictions).
- Beginners/intermediates can be discouraged by exam-level questions; stronger users become impatient with overly basic ones.
- Real exam conditions differ from guided practice. A correct answer achieved with hints or repeated audio is not the same as independent readiness.
- Students want to see meaningful improvement and choose where to focus.

### Differentiation hypothesis

**Adaptive micro-skill practice + interactive answer reconstruction**—particularly synchronized route tracing for listening maps and evidence highlighting for Reading—could be more useful than generic question banks and AI grading alone.

This is a **hypothesis to test**, not yet validated market differentiation. Competing official and commercial preparation tools already offer question-type practice, mock tests, and various feedback mechanisms; later competitive research should compare exact capabilities.

## 3. Audience and positioning

- **Primary audience:** Arabic-speaking IELTS learners with functional English, with an initial emphasis on approximately **Band 5.5–7.0** goals/abilities, including intermediate to upper-intermediate students.
- **Broader philosophy:** Different abilities should be supported through adaptation; the first version is **not** designed as a comprehensive beginner-English course.
- **Important nuance:** An overall IELTS band is not a reliable single indicator of every micro-skill. Track Reading and Listening (and question-type/underlying skills) separately.
- **Primary exam scope:** Start with **IELTS Academic Reading** and **IELTS Listening**. Listening content may ultimately serve Academic and General Training students; General Training Reading is a later scope decision.
- **Platforms:** Mobile and desktop/web, with interfaces suited to short practice and longer exam-like sessions.
- **Language strategy:** English is the language of practice; Arabic explanations are available strategically, especially for confusing concepts and common Arabic-first learner challenges. Avoid assuming all Arabic speakers share the same weaknesses.

## 4. High-level product decisions (decision log)

| Topic | Agreed direction | Status |
|---|---|---|
| Experience | Hybrid: structured, interactive challenges lead; AI tutor helps when useful | Agreed |
| Initial subjects | Reading and Listening only | Agreed |
| Initial audience | Focus ~5.5+; prioritize beginner/intermediate-to-upper-intermediate IELTS learners rather than absolute beginners | Agreed as starting hypothesis |
| Progression | **Guided freedom**: recommend next challenge without locking users into a rigid progression | Agreed |
| Navigation | IELTS **question types first**; underlying English skills shape personalized recommendations | Agreed |
| Learning navigation | Combination of **visible mastery journey** and **personalized next-challenge feed/button** | Agreed |
| Onboarding | Ask only brief goals, then deliver an engaging interactive challenge; avoid lengthy/boring upfront placement tests | Agreed |
| Teaching approach | Adaptive: teach first when useful; otherwise challenge first and teach after observed need | Agreed |
| Session formats | Flexible short and long sessions; single challenges, small sets, exam simulation | Agreed |
| Feedback timing | At completion of the current unit: after a single question if stand-alone; after all questions in a set; after an exam in simulation mode | Agreed |
| Feedback depth | **Visual explanation first**, optional detailed text/Arabic/AI help | Agreed |
| Assessment | Distinguish supported practice from independent readiness; don't infer bands from tiny sets | Agreed principle |
| Initial prototype | Focused **Listening Map Labelling** experience | Recommended first slice, not irrevocable |
| Prototype audience | Selective participants for testing and feedback | Agreed |
| Pricing | Prototype **completely free** | Agreed |
| First released version pricing | **Completely free** | Agreed |
| Monetization | Postpone until product demonstrates value/usage and features create meaningful ongoing cost | Agreed |
| Tech stack/architecture | Placeholder; decide after high-level plan and detailed product discussions | Deferred |

## 5. Core learning model

### 5.1 Learning loop

1. **Choose or discover a practice objective.** The app suggests a next challenge; the student can browse any IELTS question type or jump to exam-level practice.
2. **Attempt a meaningful challenge.** Begin at an accessible but not childish difficulty, particularly for the first interaction.
3. **Collect evidence.** Record answer accuracy, difficulty, hints, repeats, completion context, and attempts.
4. **Review at an appropriate boundary.** Show why the answers are correct or incorrect with visual evidence first.
5. **Teach where needed.** Offer a compact technique or targeted micro-skill exercise, not a mandatory lecture.
6. **Recommend the next challenge.** Increase difficulty, keep it comparable while varying a weak dimension, or provide scaffolded support.
7. **Check transfer.** Revisit the skill using *unseen* exercises without assistance, ideally under progressively realistic exam conditions.
8. **Display progress.** Explain what seems strong, what needs work, and what to practice next, without making unsupported precision claims.

### 5.2 Three session experiences

**A. Skill challenges** — often one interactive micro-task lasting roughly 1–5 minutes (illustrative only). Example: follow two directions, identify a qualifier, or locate a landmark. Show feedback as soon as that challenge is complete.

**B. Practice sets** — approximately 4–10 related items, often built around one recording/passage or question type. No interruption after each answer; review the complete set afterward. Could be guided or exam-like.

**C. Exam simulations** — timed, unseen sections or eventually full original mock exams, with realistic conditions and no in-test hints. Produce a post-attempt report and targeted recommendations.

**Note:** Session length and difficulty are separate. A short session can still be advanced.

### 5.3 Adaptive teaching, not a forced course

- Present short technique instruction **when useful**, not obligatorily at the start of every practice session.
- Strong students should skip fundamentals quickly.
- Students who struggle should get focused support for the likely missing skill, not be sent back through an entire generic module.
- Incorrect answers may have multiple causes; distinguish **observed errors** from **hypothesized causes**, and let the learner clarify when needed.
- Avoid dramatic level changes based on a single answer. Early recommendations are provisional and sharpen with repeated evidence.
- Permit manual navigation and direct access to IELTS-level practice regardless of recommended level.

### 5.4 Dimensions of difficulty

A single numeric level is useful for presentation but insufficient for adaptive logic. Examples of listening-map difficulty attributes:

- Number of landmarks, route steps, intersections and destinations.
- Complexity of spatial vocabulary (e.g., opposite, beyond, at the far end).
- Length, pace, accent and naturalness of the audio.
- Distractors, self-corrections, false starts, changes of direction.
- Density of irrelevant detail and map visual complexity.
- Replay/hint availability and time constraints.

Reading dimensions will be developed in the full Reading skill-tree phase (e.g., sentence-level vs passage-level paraphrases, inference, qualifiers, distractor plausibility, passage length).

### 5.5 Measuring progress responsibly

Track at minimum:

- **Learning/practice performance:** accuracy with context (difficulty, hints, replays, previous exposure).
- **Independent readiness:** accuracy and consistency on unseen tasks without help under appropriate time/audio constraints.
- **Question-type progress** (e.g., map labelling, matching headings).
- **Underlying skill progress** (e.g., directional language, paraphrasing, recognizing contradictions).
- **Error patterns and confidence in those inferences.** Five answers are not enough to diagnose detailed abilities confidently.

Avoid equating gamified completion with mastery. Don't issue precise IELTS band estimates from a handful of original micro-exercises. Only show well-qualified indicative score estimates after appropriate validation.

## 6. Onboarding and first five minutes

**Design objective:** Make the student feel they're already practicing and learning, rather than taking a tedious placement exam.

**Proposed flow:**

1. Select a target IELTS band (goal, not proof of current level).
2. Choose Reading or Listening; optionally highlight Map Labelling as a featured first challenge.
3. Start a short, **moderately challenging**, attractive exercise with minimal introductory text.
4. Complete the attempt; see a useful explanation/visual reconstruction.
5. Offer an adaptive recommendation while allowing a different practice choice.
6. Introduce account creation, exam-date planning, and deeper settings later, after demonstrating value (exact timing to decide).

**Invisible/embedded assessment:** Let early challenge performance inform starting difficulty without announcing a long formal placement test. A few initial answers give only provisional evidence; maintain ongoing assessment in the background.

**Avoid:** Long questionnaires, basic left/right drills for capable learners, large empty dashboards, forced tutorials, and inaccurate overconfident level labels.

## 7. Navigation and home experience

### 7.1 Main architecture (concept)

- **Home:** prominent "Continue / Recommended next challenge" action; a short explanation for why it is suggested.
- **Browse:** Reading and Listening → recognized IELTS question types → question-type overview.
- **Within a question type:** a **visible mastery path** (skills, milestone challenges, current areas of work) plus a **quick personalized continue action** that automatically chooses an appropriate next task.
- **Quick practice:** student picks a question type and practices immediately at a desired difficulty, including IELTS-level questions.
- **Exam practice:** longer sets, timed sections and (later) full mock simulations.
- **Review & progress:** mistakes, visual reviews, recently practiced skills, independent-readiness indicators, and next recommendations.

Navigation labels and information architecture remain to be tested in prototypes.

### 7.2 Guided freedom

The system **recommends but does not force**. No unnecessary locks. A learner targeting a near-term test can skip directly to an exam-like set; a learner struggling with a technique can follow the guided mastery route.

## 8. Detailed first prototype: Listening Map Labelling

### 8.1 Prototype hypothesis

An adaptive map-labelling experience with visually reconstructed answer explanations will feel more engaging, clarify why errors happened, and improve performance on new map questions.

### 8.2 Suggested flow

1. Student chooses Listening → Map Labelling (or selects a featured challenge).
2. The first task is a short, moderately difficult listening-map challenge with real audio and a legible interactive map.
3. During learning practice, start from exam-relevant listening conditions where practical, while allowing optional replays or hints; record support usage.
4. After the task/set ends, show selected answers, correct answers and evidence.
5. Present **Answer Replay**: synchronize audio and route-tracing; reveal transcript phrases and key landmarks as the route unfolds.
6. Offer optional "Why?", Arabic explanation, and (later) context-aware AI tutor.
7. Choose next task according to early signals. Preserve student choice.
8. After guided practice, offer a fresh unaided exam-style check.
9. Show a concise progress summary and recommended next step.

### 8.3 Listening map micro-skill progression — provisional example

This is a **conceptual example**, not the finalized comprehensive Listening skill tree:

1. Understand core directions and spatial expressions.
2. Combine short sequences of directions.
3. Follow a route on a small map with clear landmarks.
4. Track landmarks, distractors, corrections and natural speech in increasingly complex maps.
5. Complete unfamiliar IELTS-style map/plan labelling under real exam-like conditions without support.

Learners should **skip earlier stages** based on demonstrated ability. Present levels in an motivating way without reducing the model to five rigid gates.

### 8.4 Answer Replay — potential signature feature

After an attempt (not during an unaided assessment), a learner can:

- See **their chosen destination** and the **correct destination**.
- Play the relevant audio clip (or sequence) again.
- Watch the actual route **trace progressively across the map**, aligned with speech.
- Highlight relevant transcript phrases as the route reaches turns, landmarks and destinations.
- Understand distractors: e.g., speaker mentions the old library, **but continues past it** to the real answer.
- Step backward/forward through route events.
- Optionally open deeper explanation or request Arabic clarification.
- Try a fresh exercise targeting the same skill.

**Accuracy safeguard:** The known intended route and transcript alignment should be verified exercise data, not spontaneously improvised by AI at answer-review time. Show likely confusion points, but do not claim to know the student's thought process from an incorrect choice alone.

### 8.5 Accessibility and layout

- Map and answer targets must remain legible and tappable on mobile; avoid requiring constant pinch-zoom.
- Desktop should support comfortable simultaneous view of map and question set.
- Audio player needs obvious playback status; transcript is revealed during review (or as an intentional learning aid), not during exam simulation.
- Plan for accessible controls, keyboard support, captions/transcripts in learning contexts, and suitable contrast.
- Test visual animations with a reduced-motion alternative.

### 8.6 Adaptive branch examples

| Early observation | Suggested response |
|---|---|
| Consistently correct without support | Move to more complex routes / natural audio / distractors / exam-style sets |
| Some mistakes, e.g. landmarks confused with destinations | Offer a *focused* landmark-tracking challenge, then retry with a fresh map |
| Repeated foundational spatial-language mistakes | Brief interactive explanation, smaller map, simpler directions, then return to original goal |
| Correct only after replay | Recommend progressively reduced audio support and fresh first-listen checks |
| Strong in guided practice, weak in unaided checks | Focus on continuous tracking, memory, timing and one-pass listening |

These are **illustrative rules**, not final calibrated thresholds.

## 9. Reading experience — foundational concepts to expand later

Navigation will follow official IELTS Reading question types, with underlying skill exercises linked to each type. Earlier examples discussed:

- True/False/Not Given: understanding contradiction versus missing information; qualifiers such as *all*, *most*, *only*, *some*.
- Matching headings: identifying the main idea, avoiding distractor details.
- Other reading concepts: skimming, scanning, synonyms, paraphrasing, sentence-level vs passage-level comprehension, inference and timing.

### "Evidence Reveal" review concept

- After a set ends, highlight the **exact sentence or passage span** supporting or contradicting the answer.
- Visually connect phrases from question and passage, including paraphrases.
- Reveal why a plausible incorrect answer fails, with careful treatment of *Not Given*.
- Offer an optional short explanation and Arabic version, plus targeted follow-up questions.
- Record evidence spans as reviewed item metadata rather than relying on a model to discover the answer anew during review.

**Later deliverable:** Comprehensive Academic Reading question-type taxonomy, underlying skill graph, prerequisite relationships, difficulty features, exercise mechanics, hints, feedback rules and mastery conditions.

## 10. Listening experience — foundational concepts to expand later

Earlier candidate subskills/question-type concerns:

- Map/plan labelling and directional language.
- Numbers, names, spellings and note completion.
- Prediction from prompts, listening for paraphrases and synonyms.
- Distractors, corrections, accents, natural speech and following longer conversations.
- Listening to the relevant recording, then studying the transcript to understand errors.

**Later deliverable:** Comprehensive Listening question-type taxonomy (not just map labelling), underlying skills, prerequisite relationships, difficulty features, micro-interactions, audio policies, distractor handling and mastery criteria.

## 11. Feedback and mistake intelligence

### Timing rules

- **Stand-alone one-question challenge:** feedback after the answer/completion.
- **Multi-question practice set:** preserve flow; feedback only after the entire set.
- **Exam simulation:** no coaching while testing; review at the end.

### Review hierarchy

1. Score and selected/correct answer summary.
2. **Visual-first** evidence: traced listening route or highlighted Reading evidence.
3. Student controls to replay/inspect evidence.
4. Optional detailed explanation, technique tip or Arabic translation/explanation.
5. Optional contextual AI question / additional targeted exercise.

### Mistake intelligence

Use patterns across multiple attempts to suggest *possible* weak skills (e.g., paraphrasing, landmarks, contradictions). A wrong answer alone doesn't reveal why it was chosen. Reports should be useful but calibrated, not overconfident.

**Illustrative report:** "You handled direct directions well, but may be losing track when the speaker mentions a landmark before the destination. Try a 3-minute landmark-tracking challenge." Avoid detailed percentage-based skill diagnoses from tiny sets.

## 12. AI tutor — optional, not the main interface

Potential future/contextual functions:

- Explain a specific answer in simpler English or Arabic.
- Clarify a particular spatial expression, paraphrase or distractor.
- Answer "Why isn't this Not Given?" or "Where did the speaker change direction?"
- Offer more examples or suggested follow-up practice.
- Later: grammar correction, speaking practice and voice-based conversation.

**Interaction principle:** Tutor is easy to reach but usually quiet; it shouldn't constantly interrupt practice. Structured validated content determines answers, route, evidence and baseline adaptation. AI is supplementary for explanation, not an unchecked grading authority.

**Scope caution:** AI tutor can be omitted or reduced to a lightweight proof of concept in the earliest prototype if it threatens the core map and review experience. Determine costs and feasibility in later technical planning.

## 13. Practice content and mock exams

### Content direction

- Build an original library of IELTS-*style* practice rather than providing scanned/republished Cambridge tests.
- AI can help **draft** original reading passages, audio scripts, questions, distractors, answer keys and explanations.
- Apply consistency checks and human editorial/educational review before publishing; AI-generated material is not automatically authentic, unambiguous, or psychometrically equivalent to real IELTS tests.
- For listening maps, package verified map geometry, route coordinates, transcript, time-aligned events and answer keys together.
- For Reading, package passage spans/evidence, paraphrase relationships and wrong-choice rationales.
- Ensure each reviewed exercise can generate the rich feedback experience.

### Mock testing principles

- Distinguish learning-mode exercises, realistic timed **section practice**, and a later full exam-length **mock**.
- Full mocks should represent the selected IELTS version's structure, time demands, and audio policies closely; content remains original.
- Label these as **unofficial IELTS-style practice**, not Cambridge or official IELTS materials.
- Indicative band scores require careful calibration against representative learner performance. Avoid implying official score equivalence without evidence.
- Intellectual-property, licensing, content sourcing and trademark compliance are **business/legal items for later review**, not solved here.

## 14. Prototype → first version → later expansion

### Phase A — Selective prototype (free)

**Goal:** Validate student engagement, intuitive usability, the adaptive branching concept and whether Answer Replay improves understanding/transfer.

**Recommended smallest complete slice:**

- Brief, friendly goal selection.
- Listening → Map Labelling guided practice.
- Approximately 8–12 carefully crafted original exercises across meaningful difficulty variations (planning estimate only).
- Short challenge and connected question-set flows.
- Three provisional adaptive next-step pathways.
- Answer Replay with animated route and relevant transcript/audio evidence.
- Minimal progress and next-step screen.
- Optional simpler English/Arabic written explanations.
- Selective invitations to test and provide feedback.

**Potential deferrals even in the prototype:** Full AI tutor, all Reading/Listening categories, complete mock tests, complex dashboards, gamification economy, advanced scoring.

### Phase B — First public version (still free)

**Goal:** Develop the promising prototype into a practical Reading + Listening learning product while retaining a focused, maintainable feature set.

- Expand to a deliberately chosen set of Reading and Listening question types.
- Add coherent visible mastery journeys alongside personalized "continue" actions.
- Build up original reviewed question banks and useful explanations.
- Support quick practice, skill practice sets and appropriately scoped exam-like section practices.
- Improve adaptive recommendations based on pilot evidence.
- Deliver usable mobile and desktop experiences.
- Keep sophistication proportional to demonstrated learning benefit and operating capacity.

**Important scope note:** The *exact* minimum question types, content volume, mock-exam coverage and use of AI for v1 have **not** been decided. The user expects v1 to be broadly similar to the prototype in philosophy and not a highly sophisticated complete platform.

### Phase C — Post-release / optional future expansion

- Comprehensive Reading and Listening coverage; more extensive original mock libraries.
- Richer personalized progress and skill diagnostics.
- AI-powered tutor, grammar support and writing feedback.
- Speaking and pronunciation practice, including shadowing and IELTS-style prompts.
- Voice AI partner for speaking practice.
- More general English-learning paths beyond IELTS.
- Potential subscription offerings if justified by real operating cost and student value.

This is **not** a feature commitment or fixed release sequence.

## 15. Pricing and business philosophy

### Firm current policy

**The selective prototype is completely free. The first public version is also completely free.** The motivation is access, learner value, iteration and traction, not immediate revenue.

### Possible future monetization — explicitly deferred

Only reconsider after the product is meaningfully used and growing, or when costly value-added services create a need to offset expenses. Possibilities **raised but not agreed as a business model**:

- Subscription for AI-assisted features.
- Voice AI speaking practice.
- Extra practice collections / larger mock-exam libraries.
- Other advanced services carrying meaningful variable costs.

**Access principle:** Preserve useful free access rather than making the app inaccessible to learners who cannot pay. Exact free/paid boundaries and sustainability strategy are open.

### Business decisions intentionally deferred

Market sizing and competitor deep dive, brand/name, distribution, partnerships, licensing/legal review, budget, ongoing infrastructure and editorial costs, growth model, success thresholds for considering monetization, and pricing.

**Caveat:** Free to users still incurs content, hosting, support and maintenance cost. Future planning must establish sustainable prototype/v1 cost limits—even if no one is charged.

## 16. Research and validation plan

### Prototype evaluation questions

- Is the first challenge engaging without being too easy or stressful?
- Can students start within moments without a tedious placement test?
- Do students understand the difference between guided practice and exam simulation?
- Does Answer Replay clearly show the *intended route* and the source of misleading cues?
- Does visual review improve accuracy on **new, unseen** questions (not just repeat of the same task)?
- Are adaptive suggestions relevant without feeling restrictive or inaccurate?
- Does the Arabic support improve understanding while leaving genuine English practice intact?
- Is the map/audio interface comfortable on phone and computer?
- Do students voluntarily return for another session?

### Proposed trial approach

Invite a small, selected sample of Arabic-speaking IELTS learners across intended ability bands (earlier discussion suggested roughly **15–30** as an exploratory sample, not a statistical requirement). Observe real sessions, collect qualitative frustration/confidence feedback, record completion/support behavior, and give comparable unseen transfer exercises before/after learning. If possible, compare variants of feedback or learning routes without overstating causal results from a small pilot.

### Success metrics to define later

First-challenge completion; time to first useful feedback; repeat sessions; practice-set completion; hint/replay usage; ability to solve unseen independent questions; perceived explanation clarity; bug reports; recurring confusion points; content ambiguity rate.

## 17. Product risks and safeguards

| Risk | Proposed safeguard |
|---|---|
| Learners get bored with placement | Start practice immediately; embedded/adaptive observation |
| Learners get stuck in easy lessons | Moderate starting point; fast skips; guided freedom |
| Learners rush through without learning | Transfer checks using unseen unaided material |
| Gamification feels childish | Clean, motivating learning UI; serious exam mode |
| AI invents an answer or route | Verified structured content and deterministic answer keys |
| Generated questions contain ambiguity | Automated consistency checks + human review and user issue reporting |
| Mistakes are overdiagnosed | Treat first signals as provisional; track multiple attempts |
| Students misread mastery as an IELTS band | Separate skill progress from calibrated exam readiness |
| Audio replays create false confidence | Track support use; fade scaffolding; one-pass exam checks |
| Free product becomes costly | Monitor content, hosting, audio and AI costs; defer expensive features |
| Copyright/trademark misunderstandings | Original practice content; clear unofficial labeling; later legal review |

## 18. Deferred decisions and placeholders

### 18.1 Product detail — NEXT DISCUSSION

**[TO DEVELOP] Comprehensive Reading skill tree**

- Full Academic Reading question-type list.
- Underlying skill taxonomy and shared skills across question types.
- Difficulty ladders and differentiated exercise mechanics.
- Micro-lessons, hints, review/evidence design and mastery rules.
- Mapping between generic English skills and IELTS-specific strategies.

**[TO DEVELOP] Comprehensive Listening skill tree**

- Full Listening question-type list.
- Skills and difficulty features for each type.
- Appropriate audio behaviors, transcript use and feedback modes.
- Adaptive paths across types; mastery and transfer checks.

**[TO DEVELOP] Product UX/specification**

- Detailed home/navigation information architecture and screen flows.
- Account/guest mode, goal updates, exam date and study planning.
- Exact exercise formats and interaction rules.
- Progress visualization and history; accessible mobile/desktop layouts.
- Learner controls for pace, hints, language and difficulty.
- Definitive prototype/v1 inclusion criteria and test scenarios.

### 18.2 Technical decisions — PLACEHOLDER, DISCUSS LATER

**[UNDECIDED]** Frameworks/platform stack, backend/database, auth, hosting, content schema and authoring tools, recommendation implementation, media generation and alignment, AI provider/model, costs, privacy/security, monitoring, QA, deployment and maintenance.

The product discussion includes *conceptual* components (structured question bank, rules-based adaptive engine, optional AI tutor), **not** commitments to any technologies or architectural design.

### 18.3 Business decisions — PLACEHOLDER, DISCUSS LATER

**[UNDECIDED]** Branding, market/competitor research, acquisition, budget and unit economics, legal/trademark review, partnerships, governance of user feedback, future monetization triggers and pricing.

**[DECIDED NOW]** Prototype and first public version are free. No subscription or payment features are required for these phases.

## 19. Open questions / hypotheses to test—not to force into today's plan

1. Is question-type-first navigation intuitive for new learners whose familiarity with IELTS varies?
2. Does the visible mastery map plus a prominent adaptive "Continue" control reduce friction or produce clutter?
3. Is the moderate first challenge appropriate across the intended ability range?
4. How much content and variety are enough to demonstrate adaptive learning credibly?
5. Does visual-first review help more than transcript/text-first review for each question type?
6. What thresholds best distinguish a temporary error, a recurring weak skill and true readiness?
7. Which Reading question type offers the best second proof-of-concept after listening maps?
8. What level of human content review is necessary for reliable original practice?
9. How can optional Arabic explanations avoid creating a crutch during English comprehension practice?
10. What is the minimum meaningful exam simulation for v1, without claiming official calibration?

## 20. Suggested next document iterations

- **v0.2:** Confirm any omissions/misinterpretations in this consolidation.
- **v0.3:** Complete **Reading skill tree**, question types and interaction patterns.
- **v0.4:** Complete **Listening skill tree**, question types, audio and review patterns.
- **v0.5:** Finalize first prototype and v1 product requirement boundaries and illustrative user flows.
- **Later:** Technical architecture, content production workflow and sustainable business planning.

---

## Appendix A — Example UI principles from discovery

- Visual feedback should show exactly **where** the answer comes from, not merely say right/wrong.
- Practice should feel active and achievable without withholding authentic difficulty.
- Prefer micro-interactions over passive video lessons, while allowing the student to request explanations.
- Make learning progress legible without making progress bars more important than actual transfer.
- A student completing a five-question set receives **review at the end**, while a stand-alone single question can give feedback immediately after completion.
- Optional contextual actions: "Explain in Arabic", "Show another example", "Why was this wrong?", "Replay route", "Try a similar challenge".
- The AI coach should be **available, not intrusive**.

## Appendix B — Later-phase ideas explicitly outside the initial prototype

- Writing Task 1/2 structure, argument development, grammar, cohesion and vocabulary coaching.
- Speaking practice including shadowing, two-minute monologues, follow-up questions and AI voice conversation.
- A broader English skill system spanning pronunciation, listening comprehension, vocabulary, grammar and fluency.
- Larger original mock banks and potentially premium AI/content features, only if later justified.

**End of v0.1.**
