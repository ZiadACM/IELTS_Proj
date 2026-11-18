# Spec: Listening Map Labelling prototype ("Masar", working name)

Status: ready-for-agent

Source: grilling session 2026-11-15 (decisions Q1 to Q32, confirmed by the owner), product blueprint v0.1, owner decisions D1 to D16, ADR 0001. Vocabulary follows `GLOSSARY.md`; terms in **bold** are glossary terms.

## Problem Statement

Arabic-speaking IELTS learners aiming for roughly Band 5.5 to 7.0 practise Listening map labelling by answering question after question, but when they get one wrong they rarely see *why*: where the speaker turned, which landmark they mistook for the answer place, or where a correction misled them. Placement tests and long courses bore them before they practise anything. And a correct answer reached with replays and hints feels like progress even though it says little about how they will do on an unseen task in the real exam.

The owner needs a small, free, invite-only prototype to test whether adaptive map practice with visual answer reconstruction (**Answer Replay**) is engaging, understandable, and improves performance on unseen tasks.

## Solution

A mobile and desktop web app, with an Arabic right-to-left interface by default (English switch) and English practice content, offering Listening map labelling only:

- A tester enters with an invite code, starts as a guest, optionally gives a target band, and is in the featured first challenge within moments.
- They answer **questions** on **guided tour items** by choosing the map letter for each named place. In **guided practice** the **first listen** plays straight through; afterwards they may replay audio and ask for **hints**, all recorded as **support usage**.
- After submitting, review shows their answer and the correct letter, then **Answer Replay** traces the **authored route** across the map in step with the audio and transcript, pointing out authored distractor and correction moments. Each question has a short English explanation and an optional reviewed Arabic version.
- A **provisional recommendation** with a careful reason suggests the next step (harder item, same tier on first listen, or a focused **skill challenge**), and the learner can always choose something else (**guided freedom**).
- **Independent checks** (unseen item, one listen, no aids, server-enforced deadline) are the only way to reach **secure independently**; the Progress screen shows each micro-skill's **skill state** without percentages or bands.
- Staff import, preview and publish items, and read **problem reports**. Learners can download or delete their data.
- A 3-week pilot with 15 to 30 adult testers measures transfer with a start and end independent check.

## User Stories

### Access and onboarding
1. As an invited tester, I want to enter an invite code to get in, so that only selected testers can use the prototype.
2. As an invited tester, I want to confirm I am 18 or over when I redeem my code, so that the pilot only includes adults.
3. As a tester with an invalid, used-up or withdrawn code, I want a clear message, so that I know to ask the owner for a new one.
4. As a new tester, I want to start as a guest without giving personal details, so that I can try the app immediately.
5. As a new tester, I want one optional screen asking my target band (5.5, 6.0, 6.5, 7.0+), so that the app knows my goal without a placement test.
6. As a new tester, I want to skip the target band question, so that I am not forced to answer anything before practising.
7. As a new tester, I want to go straight into a featured first challenge, so that I feel I am practising rather than being assessed.
8. As a guest, I want to create an account later and keep everything I have done, so that I can continue on another device.
9. As an account holder, I want to sign in and sign out, so that my progress is mine on any device.
10. As an account holder, I want to reset my password, so that I can recover access.
11. As a learner, I want the interface in Arabic by default, so that instructions are easy to follow.
12. As a learner, I want to switch the interface to English, so that I can practise in an all-English environment if I prefer.
13. As a learner, I want to change my target band later in settings, so that it reflects my current goal.

### Practising an item
14. As a learner, I want 30 seconds to read the questions before the audio starts, so that I can predict what to listen for, as in the real exam.
15. As a learner in guided practice, I want to skip the reading time, so that I do not wait when I am ready.
16. As a learner, I want to see the map with lettered places and a list of questions naming places, so that I know what I need to locate.
17. As a learner, I want to answer by tapping a letter on the map, so that answering feels direct.
18. As a learner, I want to answer by choosing a letter from a list, so that I can answer with a keyboard, a screen reader or on a small screen.
19. As a learner, I want to change an answer before I submit, so that I can correct myself.
20. As a learner, I want the first listen to play straight through without pause or seek, so that my first attempt reflects exam conditions.
21. As a learner, I want clear playback status (playing, position, finished), so that I always know what the audio is doing.
22. As a learner in guided practice, I want to replay the whole recording after the first listen, so that I can catch what I missed.
23. As a learner in guided practice, I want to replay only the part for one question, so that I can focus on a single direction.
24. As a learner in guided practice, I want a first-level hint showing the last landmark before the answer place, so that I get a nudge without being given the answer.
25. As a learner in guided practice, I want a second-level hint showing the transcript sentence for that question, so that I can read what I could not hear.
26. As a learner, I want to know that replays and hints are recorded, so that I understand how they affect my progress.
27. As a learner, I want to submit when I am done, so that I can see my review.
28. As a learner who leaves mid-attempt in guided practice, I want to resume where I left off, so that I do not lose my work.
29. As a learner, I want answers saved as I go, so that a closed tab or lost connection does not erase them.
30. As a learner, I want the "Unofficial IELTS-style practice" label on every item, so that I know this is not official material.

### Review and Answer Replay
31. As a learner, I want my score and, per question, my answer next to the correct letter, so that I see at a glance what I got wrong.
32. As a learner, I want both my letter and the correct letter marked on the map, so that I see how far off I was.
33. As a learner, I want Answer Replay to trace the authored route in step with the audio, so that I see where the speaker was leading.
34. As a learner, I want the transcript highlighted in step with the route, so that I connect the words to the map.
35. As a learner, I want authored distractor and correction moments marked on the map and transcript, so that I see exactly where I could have been misled.
36. As a learner, I want to play, pause and step backward and forward between route events, so that I can study each turn at my own pace.
37. As a learner, I want to jump to the part of the route for a given question, so that I can go straight to my mistake.
38. As a learner, I want to slow replay to 0.75x, so that fast speech is easier to follow.
39. As a learner with reduced motion turned on, I want the route drawn at once with numbered steps and the transcript highlighted step by step, so that I still understand the route without animation.
40. As a learner, I want a short English explanation for each question, so that I understand the reasoning.
41. As a learner, I want to open a reviewed Arabic version of the explanation, so that confusing concepts are clear.
42. As a learner, I want to report a problem with a question (wrong answer key, audio unclear, map unclear, other) with an optional comment, so that bad content gets fixed.
43. As a learner, I want to be reminded not to include personal details in a report, so that I do not share them by mistake.

### Recommendations and navigation
44. As a learner, I want Home to show one recommended next step with a short reason, so that I know what to do next without planning.
45. As a learner, I want the reason worded carefully ("you may be..."), so that one attempt does not label me.
46. As a learner who answered everything correctly without support, I want to be offered a harder item or an independent check, so that I keep progressing.
47. As a learner who was correct only with replays or hints, I want to be offered a fresh item at the same tier and encouraged to answer on the first listen, so that I build independence.
48. As a learner with repeated errors on one micro-skill, I want a focused skill challenge for that micro-skill and then a fresh item, so that I fix the specific weakness.
49. As a learner, I want "Choose something else" on Home, so that I am never locked into the recommendation.
50. As a learner, I want to browse all map items by **difficulty tier**, so that I can pick any practice I like.
51. As a learner, I want items I have already done marked as seen, so that I can choose fresh ones.
52. As a learner, I want to redo an item in guided practice, so that I can practise again with what I learned.
53. As a learner, I want to understand that a redo does not change my progress, so that I am not misled about my skill state.

### Independent checks
54. As a learner, I want to start an independent check on an unseen item, so that I can find out if I can do it on my own.
55. As a learner, I want to be told before starting that an independent check has one listen, no hints, no transcript and a deadline, so that I am not surprised.
56. As a learner in an independent check, I want 30 seconds of reading time that I cannot skip, so that conditions are the same for everyone.
57. As a learner in an independent check, I want 2 minutes after the audio ends to check my answers, so that I can finish writing them.
58. As a learner in an independent check, I want to submit early, so that I do not wait unnecessarily.
59. As a learner in an independent check, I want my answers submitted automatically at the deadline, so that I do not lose them.
60. As a learner whose connection drops in an independent check, I want the audio to resume from where it stopped (never rewinding), so that a network glitch does not ruin the check.
61. As a learner, I want review to open only after the independent check is submitted, so that the check is fair.

### Progress
62. As a learner, I want each micro-skill shown as not seen yet, building, secure with support, or secure independently, so that I understand my standing without false precision.
63. As a learner, I want my independent check results listed (date, tier, score out of N), so that I can see real progress on unseen tasks.
64. As a learner, I want the current recommendation and its reason at the top of Progress, so that the next step is always visible.
65. As a learner, I want no percentages and no band estimates, so that I do not mistake practice for an exam score.
66. As a new learner with no attempts, I want Progress to explain what will appear and offer the first challenge, so that it is not an empty dashboard.

### Data rights
67. As a learner, I want to download my data (settings, attempts, progress) as a file, so that I know what is stored about me.
68. As a learner, I want to delete my data immediately, so that I can leave the pilot cleanly.
69. As a guest, I want to know my data is deleted after 30 days of inactivity, so that I understand what happens if I stop.

### Staff
70. As a content author, I want to import an item file that has passed the validator, so that it becomes a draft in the app.
71. As a content author, I want a rejected import to tell me which validator codes failed, so that I can fix the item.
72. As a content author or reviewer, I want a list of items with their status, so that I know what needs review.
73. As a content reviewer, I want to preview an item exactly as learners will see it, including full Answer Replay, so that I can judge it before publishing.
74. As a content reviewer, I want to publish an item, so that learners can see it.
75. As a content author, I want to be unable to publish, so that a second person (or role) always approves content.
76. As staff, I want to read problem reports grouped by item and question, so that I can fix ambiguous content.
77. As the owner, I want to create and withdraw invite codes with a script, so that I control who joins the pilot.

### Pilot
78. As the owner, I want every tester to take an independent check at the start and end of the pilot on two equivalent tier 2 items, with the order swapped between testers, so that I can measure transfer.
79. As the owner, I want those two pilot items hidden from Browse and recommendations, so that testers do not see them in advance.
80. As the owner, I want pilot measurements calculated from the app's own data with no third-party analytics, so that learner data stays minimal.

## Implementation Decisions

### Stack and boundaries (ADR 0001)
- React + Vite single-page app and a Fastify API, deployed as one Node service with PostgreSQL. Better Auth for sessions, guest sessions (anonymous plugin) and account upgrade.
- Route conventions from ADR 0001 apply: literal full paths, no prefixes; test-support routes only in the test-support area and never mounted in production.
- The API shapes follow `docs/security/test-harness-contract.md`. An **independent check** is an attempt with mode `exam`; **guided practice** is mode `guided`. The glossary terms are used in all learner-facing text and in code names; the `exam` mode value stays because the security suites depend on it.

### Modules
- **Access**: invite code redemption, guest sessions, account creation and upgrade (keeps guest data), sign-in, sign-out, password reset. A valid invite code is required to start a guest session and to create an account without an existing guest session. The 18+ confirmation is stored with the redemption.
- **Settings**: interface language (Arabic default, English) and optional target band. The target band is stored and shown only; it does not drive recommendations.
- **Item catalogue**: published items for learners, with a per-learner "seen" flag and tier. Delivery payloads never include correct answers, authored route, transcript, hint content or explanations. The two pilot transfer items and the featured first challenge are marked so they are excluded from Browse and recommendations (the first challenge is still offered once, at onboarding).
- **Attempts**: create, save answers, submit, score on the server. One open attempt per user per item (D10). Fields per the harness contract: mode, status, answers, support usage (replay count, hint count, hint levels per question), deadline (independent check only), `seenBefore`, `countsTowardIndependentReadiness`, `late`, score.
- **Audio delivery**: guided practice serves the item audio; the client enforces the uninterrupted first listen as an interaction rule, and every replay request after it is recorded server-side (whole recording or one question's segment). Independent check: one forward-only grant per D9 (Range may resume from the furthest byte delivered, never rewind; grant ends at audio end plus 10 s, or at submit).
- **Hints**: guided practice only, per question, two levels returned in order (level 1: last landmark before the answer place; level 2: transcript sentence). Refused in independent checks. Every hint is recorded.
- **Reading time and deadlines**: 30 s reading time before audio, skippable in guided practice, fixed in independent checks. Independent check deadline = reading time + audio duration + 2 minutes, computed by the server from server time; answers saved after the deadline are rejected; at the deadline the attempt is submitted with whatever answers exist. Early submit allowed.
- **Review**: available only for the learner's own submitted attempt (D6). Contains score, per-question learner answer and correct letter, authored route events (turns, landmarks, answer places, distractors, corrections) with cue times, transcript cues, English explanation and Arabic explanation.
- **Skill states** (pure logic): from a learner's attempts on questions tagged with each micro-skill, excluding `seenBefore` attempts:
  - not seen yet: no counted attempt on that micro-skill;
  - building: attempted, and any error on that micro-skill in the last two counted attempts;
  - secure with support: correct on that micro-skill in the last two counted attempts, with replay or hint used on those questions;
  - secure independently: correct on that micro-skill in an independent check (and not since dropped to building by a later independent check error).
- **Recommendations** (pure logic): evaluated after each submitted attempt using the learner's last two counted attempts:
  - Rule A, correct without support (all questions correct, no replay or hint): fresh item one tier up; at tier 2 or 3, an independent check at that tier if none done yet.
  - Rule B, correct only with support (support used on half or more of the questions): fresh item at the same tier, with the first-listen encouragement.
  - Rule C, repeated errors on one micro-skill (two or more wrong answers on the same micro-skill across the two attempts): that micro-skill's focused skill challenge, then a fresh item at the same tier.
  - Otherwise: fresh item at the same tier.
  - Precedence when several apply: C, then B, then A.
  - Never move more than one tier at a time; never move down a tier because of a single attempt.
  - "Fresh" means an item with no submitted attempt by this learner; if none is left at the target tier, recommend the least recently attempted item at that tier and say so.
  - Every recommendation carries a reason code; the client renders it in careful wording ("you may be..."), in the interface language.
  - Before any attempt, the recommendation is the featured first challenge.
- **Problem reports**: one per submission, attached to an item and question, reason (wrong answer key, audio unclear, map unclear, other), optional comment up to 500 characters, stored and rendered as plain text, visible only to staff.
- **Data rights**: download (JSON of settings, attempts with support usage, skill states, reports the learner wrote) and immediate deletion, for guests and account holders.
- **Retention**: per D11 (guest data deleted after 30 days of inactivity).
- **Staff**: item list with status, import (runs the same validation as the content validator, rejects with codes), preview (full learner view plus Answer Replay, staff only), publish (`content_reviewer` only), problem reports list. No item editor. Invite codes are managed by an owner-run script (create, list, withdraw); there is no invite endpoint for staff or admin.

### Authorization matrix changes (protected; owner approval in the ticket that does it)
- New row ME-04 `GET /me/export`: anonymous deny, every signed-in role `own`, `ownerScoped`.
- AUTH-05 (guest sessions) and AUTH-01 (accounts without a guest session) accept and require an invite code; add the `rateLimited` and `enumerationSensitive` flags if not already present.
- Map the AUTH-* logical paths to Better Auth's real routes when auth is wired up (already noted in the security baseline).
- ATT-07 (replays) accepts an optional question id for one question's segment.

### Content model additions (validator is protected; owner approval in the ticket that does it)
Each item adds: difficulty tier (1, 2 or 3) alongside the existing difficulty dimensions; a micro-skill per question from the five prototype micro-skills; two hint levels per question (the level 1 landmark must be a landmark on the route before that question's answer place; the level 2 hint must reference an existing transcript cue); an English explanation and an Arabic explanation per question; authored distractor and correction events on the route with cue references; a flag for featured first challenge, focused skill challenge (with its micro-skill) and pilot transfer item; audio source (synthetic draft or human recording).

The five micro-skills: spatial language; following a sequence; landmark vs answer place; corrections and distractors; orientation.

### Content set (produced in Phase B, not by this spec's code tickets)
- 10 map items (amended 2026-11-18, D21: tier 1 items are **guided tour items**; tier 2 and tier 3 items are **anchored items**): tier 1 (3 items: small map, 3 questions, slow clear speech, few distractors); tier 2 (4 items: about 8 lettered places, 4 to 5 questions, natural pace, one distractor or correction); tier 3 (3 items: 9 or more places, 5 to 6 questions, several distractors and corrections, mixed accents).
- 6 focused skill challenges: 2 each for spatial language, landmark vs answer place, and corrections and distractors.
- 1 featured first challenge: a dedicated tier 2 item with 3 questions (an anchored item from D21; first-challenge-001 is still a guided tour and needs a rewrite).
- 2 pilot transfer items: equivalent tier 2 items.
- Audio drafted with synthetic voices; published pilot items use human recordings.

### Screens
Onboarding (invite code + 18+ confirmation, optional target band), item player (reading time, map, question list, audio, hints and replays in guided practice), review with Answer Replay, Home, Browse, Progress, Settings (language, target band, account, download data, delete data), sign-in and account creation, staff item list, staff preview, staff reports. Layout is planned with `impeccable shape` before UI code; the Impeccable hook is enabled at the first UI ticket after owner approval (D1).

### Pilot measurements
Computed from app data only: first-challenge completion; time from first attempt start to first review; testers returning within 7 days; change between start and end independent check scores; trend of replay and hint use; problem reports per item. Success thresholds are set by the owner before the pilot starts (not in this spec).

## Testing Decisions

- **A good test** checks behaviour a user or client can observe at an agreed seam (responses, stored state, what is and is not returned), never internal function calls or private structure. Expected values come from this spec, a worked example or a golden fixture, never from re-running the code under test (CODING_STANDARDS 5.1).
- **Seam 1, HTTP API (main)**: Fastify `inject()` in-process. Covers access and invite codes, settings, catalogue (including answer-data absence), attempts, audio rules, hints, reading time and deadlines, submit and scoring, review, recommendations (one end-to-end case per rule), skill states (one end-to-end case per state), repeat attempts, problem reports, export, delete, retention, staff import, preview and publish. Prior art: the live security suites under `tests/security/` and their contract; once the app exists, they run against a test instance with `SECURITY_BASE_URL` set.
- **Seam 2, pure rules**: recommendation rules and skill-state rules as functions of recent attempts, built test-first from a worked-example table derived from rules A, B, C, the precedence order, the tier limits and the four skill states. Property-based tests for invariants: never more than one tier move; never down a tier on one attempt; `seenBefore` attempts never change a skill state; only independent checks reach secure independently.
- **Seam 3, content validator**: new checks get valid and invalid fixtures, following the existing validator tests and fixtures. Property-based tests for route invariants (cue times increase; each question's answer place lies on the route; level 1 hint landmark precedes the answer place).
- **Browser tests (Playwright)**: written after the behaviour works: onboarding to first review, Answer Replay controls and reduced motion, an independent check to auto-submit, Browse and Progress; on mobile and desktop widths and in RTL, with an automated accessibility scan.
- The security suites must pass against the real app before any tester is invited (Tier 1 pre-pilot check, D2).

## Security & Privacy

- All authorization on the server (CS 2.1); every endpoint has a matrix row and the coverage gate stays green.
- Delivery payloads never contain correct answers, authored route, transcript, hint content or explanations; review only for the learner's own submitted attempt (CS 2.2, D6). Staff preview is staff-only.
- Independent check rules (one listen, no hints, no replays, server deadline, single-use audio grant) are enforced on the server (CS 2.3, D9, D10).
- Invite codes: random, single-tester, withdrawable, rate-limited redemption, responses that do not reveal whether a code exists beyond "not valid".
- Problem report comments and any other user text are validated at the boundary, length-limited and rendered escaped; staff report views treat them as untrusted (CS 2.5).
- Personal data is minimal: no name required; email only for accounts. Logs and pilot measurements contain no learner personal data (CS 2.6, D11). No third-party analytics.
- Download and delete are owner-scoped; delete is immediate in the app, with backup removal per D11.
- Admin has no access to learner attempts or progress (D7).
- Test-support routes never mounted in production (SECRET-04).

## Accessibility, RTL & Responsive

- Interface `dir="rtl"` by default with logical CSS; English practice content (map labels, questions, transcript, English explanations) stays left-to-right; directional icons mirror, except map content.
- Every control keyboard operable with visible focus and accessible names; the letter-list answer path is the keyboard and screen reader path for the map.
- Touch targets at least 44 px; no horizontal page scroll at 390 px; works from 360 px width; the map answer flow needs no pinch-zoom.
- Contrast at least 4.5:1 (3:1 large text); the learner's answer vs the correct letter is never shown by colour alone.
- `prefers-reduced-motion` gives the static numbered-route Answer Replay.
- Audio status is visible and announced; transcript in review only (CS 4.6).
- Supported browsers: current iOS Safari, Android Chrome, desktop Chrome, Edge, Firefox, Safari.

## Failure & Empty States

- Invalid, used or withdrawn invite code; redemption rate-limited.
- Audio fails to load or stalls: retry in guided practice; in an independent check, resume from the furthest point already played, and if the deadline passes, auto-submit what exists.
- Connection lost while answering: answers saved locally and re-sent; the learner is told when answers are not yet saved.
- Session expired: return to sign-in (account) or explain the guest session has ended.
- Attempt already open on this item: resume it instead of starting a new one.
- Independent check requested on a seen item: explain it needs an unseen item and offer one.
- Answers sent after the deadline: rejected, with a clear message.
- No fresh item left at the recommended tier: recommend the least recently attempted one and say so.
- Empty states: Progress before any attempt; Browse with no published items at a tier; staff reports list with no reports.
- Loading, error, offline and disabled states designed for every screen (CS 4.7).
- Import rejected: list validator codes.

## Content Validation

- Every item passes the content validator (with the additions above) before it is committed as reviewed or published (CS 3.2).
- Only a human `content_reviewer` publishes (CS 3.1, D8); AI-drafted items stay draft until the `validate-ielts-content` judgement checks are done (CS 3.4).
- Arabic explanations reviewed by a fluent reader (CS 3.5).
- Original content only; every item shows the Unofficial practice label (CS 3.3).
- Content text is plain text (D4).
- Problem reports feed the content ambiguity measure.

## Out of Scope

- Reading, and every Listening question type other than map labelling; location-description map items.
- Timed exam simulation of a whole section and full mocks.
- AI tutor and any AI at runtime.
- Item editor, staff invite screens, admin dashboards beyond the listed staff screens.
- Exam date, study planning, notifications, gamification.
- Band estimates, percentages, indicative scores.
- Offline mode; native apps.
- Payments or subscriptions.
- Public sign-up and the public release (D12b age policy and D13 data residency remain open).
- Producing the content set itself (Phase B); full Listening and Reading skill trees (later sessions); pilot success thresholds (before the pilot).

## Further Notes

- **Phase order**: the content model additions and the content set belong to Phase B (`property-based-testing` and `validate-ielts-content` skills); code tickets belong to Phase C. Per `INSTALL-FOR-AGENTS.md`, the owner approves installing each phase's skills before work in that phase starts.
- **Protected files** touched by this spec (owner approval needed in the ticket): content validator and its tests and fixtures, the authorization matrix and `tests/security/**`.
- **Open owner tasks before the pilot**: GitHub repository protections from the security baseline; final working name (placeholder "Masar"; the name must not contain "IELTS"); pilot success thresholds; recruiting 15 to 30 adult testers across bands 5.5 to 7.0.
- The target band is collected but unused by the rules in this prototype; revisit after the pilot.
- Pilot runs 3 weeks; at least 3 sessions per tester encouraged; interviews and observation notes kept outside the app and anonymised.

## Done Checklist

Copied from `docs/development/agentic-playbook.md` section 18.

- [ ] Approved feature contract exists and scope is clear.
- [ ] Required functionality works end to end, including loading/error/empty states.
- [ ] Every required button and control produces the intended outcome.
- [ ] Relevant unit/integration/browser tests run and pass (or gaps are explicitly recorded and approved).
- [ ] Responsive behavior and accessibility were checked where applicable.
- [ ] User data, permissions and security implications were reviewed.
- [ ] IELTS answer/evidence/media validation passed where applicable.
- [ ] No unintended changes or unresolved critical/high-severity issues remain.
- [ ] Reviewer feedback is resolved or explicitly tracked.
- [ ] Docs, task record and handoff reflect the actual implemented behavior.
- [ ] Human approval occurs before merging/deploying wherever policy requires it.
