# Coding standards

The Standards axis of `code-review` checks diffs against this file, and `ielts-security-review` and `verify-user-flow` cite it. Rules are written to be checkable. Stack-specific rules (formatter, linter, framework) are added when the stack is chosen; **anything a tool enforces is not repeated here.** Status: Proposed.

## 1. Precedence
Approved spec > ADRs > this file > the agent's habits. A spec may not waive sections 2 to 4.

## 2. Security (non-negotiable)
The full security review is deferred to pre-launch (`docs/security/pre-launch-review.md`), but these rules are **design constraints now**: they are cheap to follow while building and expensive to retrofit.
1. Authorization is enforced on the server for every read and write of attempts, progress, settings and recommendations; the client is never the gate.
2. Correct answers, authored routes, transcripts and explanations are **not sent to the client** before an attempt is submitted, and never in exam/independent mode.
3. Exam-mode rules (one listen, no hint, no replay, timer) are enforced server-side.
4. No secrets in code, fixtures, logs, client bundles or CI output. Missing configuration stops the app; it never weakens a control.
5. All external input is validated at the boundary and rendered escaped. User text, imported files and AI output are untrusted.
6. Learner data is minimised, kept out of logs and analytics, and has a defined retention and deletion path.
7. A new dependency needs a stated reason, a pinned version, and a read of its install scripts. Prefer platform features and existing dependencies.

## 3. Content and answers
1. Only items with `validation.status = published` reach learners; only a human sets that value.
2. `node tools/validate-content.mjs <item> --assets <dir>` exits 0 before an item is committed as reviewed or published.
3. Original content only. No copied Cambridge/IELTS material. Every item shows the **Unofficial practice** label.
4. AI-drafted content is `draft` until a person has done the judgement checks in `validate-ielts-content`.
5. Arabic explanations are reviewed by a fluent reader before they ship.

## 4. Accessibility, RTL and responsive
1. Every interactive control is keyboard operable with a visible focus state and an accessible name.
2. UI works in `dir="rtl"` with logical CSS properties (start/end, not left/right); directional icons mirror; English practice content stays left-to-right.
3. Touch targets >= 44 px; no horizontal page scroll at 390 px width; the map answer flow needs no pinch-zoom.
4. Text contrast >= 4.5:1 (3:1 for large text). Colour is never the only signal.
5. Motion respects `prefers-reduced-motion`; Answer Replay still conveys the route without animation.
6. Listening review mode offers the transcript; exam mode does not.
7. Every state exists and is designed: loading, empty, error, offline, disabled.

8. Design: every UI change is critiqued and audited with Impeccable (`critique`, `audit`) and P0/P1 findings are fixed before review. `impeccable detect` runs clean in CI. Impeccable does **not** replace sections 4.1 to 4.7 and has no deterministic RTL rule (tested 2026-11-12): RTL is verified by `verify-user-flow` row 8 and an automated accessibility scan.

## 5. Testing
1. Pure learning logic (scoring, adaptive rules, replay timing, content validation) is built test-first with expected values from an independent source (spec, worked example, golden fixture), never recomputed with the code under test.
2. Prefer property-based tests (`property-based-testing`) for invariants such as monotonic timestamps and route-ends-at-answer.
3. Test behaviour through public interfaces at agreed seams; mock only at system boundaries.
4. Browser tests click real controls and assert outcomes and stored state; they are written after the behaviour works.
5. A bug fix ships with a regression test that failed before the fix.

## 6. Code quality
1. Smallest complete change; no speculative options, wrappers or config nobody asked for.
2. Names use glossary terms. A function or module that needs a comment to explain what it does should be renamed or split.
3. Errors are handled or surfaced; nothing is swallowed silently. A deliberate shortcut gets `shortcut: <limit>, <when to revisit>`.

## 7. Protected files (agents may not edit without an explicit human instruction in the current task)
`tools/validate-content.mjs`, `tools/validate-content.test.mjs`, `tools/fixtures/**`, golden scenario fixtures and scoring/adaptive-rule tests (`tests/golden/**` once created), `CODING_STANDARDS.md`, `.claude/settings.json`, `.claude/hooks/**`, `skills-manifest.src.json`, `skills-manifest.lock.json`, `scripts/**`, `third-party/**`. Reason: if an agent can edit the measurement, it can pass it. Enforce with CODEOWNERS plus a CI check that fails when these change in an `agent/*` branch without owner approval.
