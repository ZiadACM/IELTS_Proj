# 07: Browse and player shell

**What to build:** A learner opens Browse, sees published map items grouped by difficulty tier, opens one, gets 30 seconds of reading time (skippable in guided practice), then sees the map with lettered places and the question list while the first listen plays straight through with clear playback status.

**Blocked by:** 02 First real item; 04 Invite codes and guest onboarding; 06 Staff: import, list, publish

**Status:** ready-for-agent

Spec: `../spec.md`

- [ ] Browse lists only published items, by tier; empty tier state designed
- [ ] Delivery payload contains no answers, route, transcript, hints or explanations (answer-key leakage suite passes)
- [ ] Reading time counts down and can be skipped in guided practice
- [ ] First listen cannot be paused or sought; playback status is visible and announced
- [ ] English content stays left-to-right inside the RTL frame; works at 360 px and on desktop

## Comments

### 2026-11-18, owner (via agent `implement` session)
Decisions: (1) Ticket 07 builds attempt start: `POST /attempts` (guided only; exam answers 501 until ticket 13), `GET /attempts/{id}` and guided audio (ATT-06). Answers and submit stay in 08. No matrix change. (2) Audio lives in a configured folder, `CONTENT_DIR` (dev default `docs/content`); import and publish run the validator's audio check against it, and the server serves audio from it. (3) The Impeccable hook stays off; shape, critique and audit run by hand (this also covers the onboarding, account and staff screens deferred from 04 to 06). (4) Playwright added now, pinned `@playwright/test` 1.64.1, Chromium and WebKit. (5) Testers mostly practise on phones. (6) Items have no title field, so Browse numbers them per difficulty tier ("Map 01"). (7) The app's look is created now and applies to every screen; direction round: **Boarding Pass**. (8) Tone (recorded in `PRODUCT.md`): no gamification (no streaks, points, badges, levels, leaderboards, or counters that only go up); "fun" means polish on real events only; guided practice stays calm, with no red timers; the warmth of a competent tutor, no mascots; the real IELTS task layout under our own branding, with the "Unofficial" label on every item screen (not every app screen); no sound effects in Answer Replay; skill states are four plain named states, never partial fills.

### 2026-11-18, agent (implement)
Built on `agent/browse-player-shell` (commits e9dd0fa, 115ce28, db251cb).
- **Server:**
  - `GET /items` (ITEM-01): published items only, without first-challenge and pilot items, ordered by tier and publishing date.
  - `GET /items/{itemId}` (ITEM-02): the delivery payload is whitelisted field by field (map, question prompts, tier, purpose, focus skill, audio length, 30 s reading time). It carries no answers, route, transcript, hints or explanations.
  - `POST /attempts` (ATT-01), guided only: one open attempt per user per item (D10, unique partial index). It answers 201 when it creates the attempt and 200 when it resumes an open one.
  - `GET /attempts/{id}` (ATT-03).
  - `GET /attempts/{id}/audio` (ATT-06): byte ranges, private and no-cache, and 409 once the attempt is submitted.
  - Admin is refused on the attempt rows; another user's attempt gives 404. Migration 0005 adds `attempts`.
  - `CONTENT_DIR` is required in config; import and publish check the audio file, and messages never show server paths.
- **Web:** Browse by tier, with a designed empty-tier message. The player shell has the following:
  - reading time counted against the clock, with "Start now";
  - the map (English, left to right, pixel-constant sizes, labels placed clear of letter discs and wrapped to two lines when crowded);
  - the question list;
  - the first listen.
- **First-listen rules:** the audio element has no controls, and a pause or seek is undone. Media Session keys are held. If autoplay is blocked, a "Start the audio" button shows. A stall longer than 10 s offers a retry that resumes from the furthest point played. Status is visible and announced (role=status). Switching language mid-listen keeps the audio playing.
- **Look:** the Boarding Pass world app-wide: tokens, a self-hosted Barlow Condensed 600 (OFL, `web/src/fonts/`), `PRODUCT.md`, and the surface brief `web/.impeccable/surfaces/src-player-tsx.md`.
- **Browser tests:** `web/e2e/browse-player.spec.ts`, run with `npm run test:browser` and the harness environment variables.

**Results:**
- `npm test` 113/113 (15 new; seen failing first).
- Offline security and tools: 107 pass, 0 fail, 27 skipped.
- Lint (4 CSS specificity warnings), type check and build pass.
- `npm run test:browser`: 15/15 on phone Chromium (390), phone WebKit (iPhone 14) and desktop Chromium (1440). Evidence is in `docs/testing/evidence/browse-player/2026-11-18/`.
- Live security suites, local instance: 44 pass, 20 fail. Every failure stops at a route not yet built:
  - `PUT /attempts/{id}/answers` and submit: ticket 08.
  - Exam mode: 501, ticket 13.
  - The retention job: 501, ticket 17.
  - SESS-09 fails only because it lists attempts through ATT-02 (ticket 08).
- I replayed LEAK-02's pre-save scan with the suite's own helpers, on ITEM-01, ITEM-02 and ATT-03, as learner and as guest: no canary, no forbidden key, and the draft item gives 404.

**verify-user-flow** (commit db251cb, local):
- 1 PASS: the happy path to the end of the first listen, at 390 px and on desktop.
- 2 PASS: Browse cards, Start now, Back, Try again, and the language switch.
- 3 N/A: exam mode is ticket 13 (refused with 501).
- 4 PARTIAL: an attempt is resumed on reopen (server test). Reload during a listen restarts reading time, because the screen state is not stored.
- 5 PASS: audio missing ("could not load", plus a retry), map no longer published, empty tier, and the guest rate limit.
- 6 PASS: 360/390 px with no horizontal scroll (placing answers is ticket 08).
- 7 PASS: map and questions are side by side at 1280 and 1440.
- 8 PASS: RTL frame; English prompts and the map are LTR.
- 9 PARTIAL: Start now by keyboard, and focus moves to the status. The map has no keyboard or screen-reader letter list yet (proposed for 08).
- 10, 12 N/A: Answer Replay is ticket 09.
- 11 NOT VERIFIED: no axe dependency. The Impeccable browser scan found 0 issues on Browse and the player.
- Verdict: PARTIAL.

**Impeccable critique** (two isolated sub-agents; owner-approved): 24/40. The detector found 0 issues in source and in the browser (1 advisory straggler on onboarding). Both P1s are fixed and covered by browser tests:
- switching language killed the first listen;
- labels covered letter discs at phone width.

Fixed P2s:
- focus was lost after Start now;
- "audio stopped" showed when it never started.

Snapshot: `.impeccable/critique/2026-11-18T09-59-54Z__web-src-player-tsx.md`.

**NOT VERIFIED:**
- LEAK-01 to 04 and 06 to 08 as suites (they need tickets 08 and 09).
- The blocked-autoplay state in a real phone browser (headless runs allow autoplay).
- A real VoiceOver or TalkBack pass.
- axe.
- The new Arabic strings (CS 3.5, which needs a fluent reader).
- DESIGN.md (the finish review and impeccable-documenter have not run).
- The staff, onboarding and settings screens' Impeccable audit: they were seen only in the critique's walk.

**Open for the owner:**
- Browse naming: three "Map 01"s exist (one per tier). Should it become a tier-qualified code such as "2·01", used on the player too?
- The Boarding Pass world does not reach Home and onboarding yet; they only take the colours. Should that be redesigned now or with ticket 16 (Home recommendation)?
- Map spacing: should the content validator refuse letter discs closer than N px at a 360 px render? That needs the protected `tools/validate-content.mjs`.
- The dev database is shared with server tests, so Browse in dev shows hundreds of leftover test items. A separate test database would fix it.

### 2026-11-18, agent (code-review)
I ran a review on two axes (standards and spec). Neither found a blocking issue.

**Fixed:**
- The "Start the audio" prompt for blocked autoplay is now announced to screen readers.
- The admin attempt test is renamed to say what it asserts: an admin may start an attempt but not read it or play its audio.
- `shortcut:` tags added on the validator type cast and on the Media Session catch.
- The invalid `transform-origin: inline-start` line is removed.
- The duration formatter is renamed from `clock` to `minutesSeconds`.

**After the fixes:**
- `npm test`: 113/113.
- `npm run test:browser`: 15/15.
- Lint, type check and build pass.

**Left as is (judgement calls):**
- The UUID regex is now defined three times.
- `publishedContent` sits in the catalogue routes file, which the attempt routes import from.
- The five positional parameters on import and publish.
- `Player.tsx` mixes the timer, the audio rules and the layout. An audio hook would split them, ideally before ticket 08 adds answering.

**Open for the owner (from the spec review):**
- **Admin attempts:** the matrix lets an admin start an attempt (ATT-01) but not read it or play its audio (ATT-03, ATT-06). An admin who opens a map therefore gets the audio failure. Should ATT-01 deny admins?
- **Pilot items:** they are hidden from Browse, but `GET /items/{id}` and guided `POST /attempts` still accept a pilot item's id. Should they be refused before the check?
- **"Seen" flag:** the spec puts it on the catalogue, and it is deferred to ticket 12.
- **Reload during a listen:** it restarts reading time and the audio from 0 (verify row 4, PARTIAL).

### 2026-11-18, owner (via agent `implement` session)
Answers to the open questions (the agent's recommendations): (1) maps are named with a tier-qualified code, "2·01"; (2) admins are refused at attempt start (D20; a change to the security matrix, approved); (3) the server refuses pilot transfer items for practice, not only in Browse; (4) Home and onboarding get the full Boarding Pass design with ticket 16, not now; (5) the content validator rejects letter discs too close to read apart on a 360 px phone (a change to protected files, approved: `tools/validate-content.mjs`, its tests, and the synthetic security fixture for D20).

### 2026-11-18, agent (follow-up: owner answers)
- **Map codes:**
  - Each map is named "Map 2·01" / «خريطة 2·01», and the same code goes on the Browse stub and the player heading.
  - The code is wrapped in a left-to-right isolate, so Arabic shows "2·01", not "01·2". I checked this in a screenshot.
- **Admins (D20):**
  - `ATT-01` is now `deny` for admin in `authorization-matrix.json` and `.md`.
  - `POST /attempts` uses the same guard as the other attempt routes.
  - The synthetic fixture refuses admin on `POST /attempts`.
  - D20 is added to `docs/product/owner-decisions.md`.
- **Pilot items:**
  - `GET /items/{id}` and `POST /attempts` give 404 for a `pilot-transfer` item; the audio route uses the same lookup.
  - Ticket 13 must open them for the independent check.
- **Letter spacing (`target-spacing`):**
  - Two letter discs need centres at least 36 px apart on the map as drawn at a 360 px screen (measured at 326 px wide). That is two 15 px discs, each with a 1 px half-stroke, plus a 4 px gap. On a 1000-unit map this is 120 units.
  - New cases in `tools/validate-content.test.mjs` cover a crowded pair and the exact limit (the limit passes; one unit closer fails).
  - The property test's generator now spaces its letters 150 apart, which keeps "every generated item is valid" true.
- **Browser tests:**
  - They seed the validator's fixture map with the first challenge's recording.
  - They narrow Browse to the seeded map, so they no longer depend on publishing order. The server's test clock moves between runs.

**Results:**
- `npm test`: 115/115. Three tests changed or were added and were seen failing first; one was the admin test, which now expects 403.
- Offline security and tools: 109 pass, 0 fail, 27 skipped. This includes the matrix test (Markdown matches JSON) and the fixture proof.
- Lint, type check and build pass.
- `npm run test:browser`: 15/15.

**Needs the owner:**
- **First challenge spacing:** `docs/content/items/first-challenge-001.json` now fails `target-spacing`. C (the answer to question 1) and D are 100 units apart; at least 120 is needed. Moving C right to x=840 or more, together with its destination event `e7`, would pass. That changes reviewed content, so it needs your review again. I did not change it.

**NOT VERIFIED:**
- The PR needs the `protected-change-approved` label (agents do not set labels).
- The live AUTHZ-06 suite was not rerun for the admin cell (it stops at ticket 08).
