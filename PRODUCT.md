# Product

<!-- impeccable:product-schema 1 -->

Product truth lives in `.scratch/listening-map-prototype/spec.md`, `GLOSSARY.md` and `docs/product/`; this file only summarises what design work needs. Use glossary terms in all copy.

## Platform

web

## Users
Arabic-speaking adults (18+) preparing for IELTS Academic Listening, aiming at roughly Band 5.5 to 7.0. During the pilot: 15 to 30 invited testers over 3 weeks, practising **mostly on phones** (owner, 2026-11-18), sometimes on laptops.

## Product Purpose
Adaptive practice for one question type, Listening map labelling: learners answer **guided tour items**, then see why they went wrong through **Answer Replay** (the authored route traced on the map in step with the audio and transcript). Success in the pilot: testers engage, understand the review, and improve on unseen **independent checks**.

## Positioning
Visual answer reconstruction of where the speaker led, plus honest progress: support usage is recorded, and only an independent check reaches **secure independently**.

## Operating Context
Short practice sessions on a phone, with headphones. Guided practice: 30 s reading time (skippable), a **first listen** with no pause or seek, then replays and **hints**. Independent check: fixed reading time, one listen, no aids, server deadline. Interface Arabic right-to-left by default (English switch); practice content (map labels, questions, transcript) is English and stays left-to-right.

## Capabilities and Constraints
- No percentages, band estimates or scores beyond "N out of M" for independent checks; recommendation reasons are worded carefully ("you may be…").
- Gamification is out of scope (owner, 2026-11-18): no streaks, points/XP, badges, levels, leaderboards, or any cross-session counter that only goes up. They would confound the pilot's 7-day return measure and make hint-assisted success look equal to independent success.
- Delight comes from polished presentation of real events only: the "seen" tick, transitions, a satisfying Answer Replay (visual, no sound effects over the recording), skill states shown as four distinct named states.
- No third-party analytics. Content text is plain text.

## Brand Commitments
- Working name "Masar" (مسار), placeholder; the final name must not contain "IELTS".
- Every item shows the "Unofficial IELTS-style practice" label. The map task's structure follows the real question type (lettered places, numbered questions); colour, type, branding and iconography stay clearly distinct from Cambridge, IELTS and the British Council.
- Tone: a competent tutor's warmth for adults. Encouraging, plain copy; no mascots, nothing cute, no exclamation-heavy language.

## Evidence on Hand
One reviewed draft item with synthetic audio (`docs/content/items/first-challenge-001.json`). No real testers, testimonials or results yet; do not invent any.

## Product Principles
1. Honest over flattering: never make supported success look like independent success.
2. Calm guided practice: exam tension lives only in the independent check's rules, never in guided-practice visuals (no red timers or lockouts).
3. Guided freedom: recommend, never lock.
4. The real task format, the app's own identity.

## Accessibility & Inclusion
RTL with logical CSS; keyboard and screen-reader path for every control (the letter list is the map's accessible path); touch targets at least 44 px; works from 360 px with no pinch-zoom; contrast 4.5:1; colour never the only signal; `prefers-reduced-motion` gives a static numbered Answer Replay; audio status visible and announced.
