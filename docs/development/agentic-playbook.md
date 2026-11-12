# Adaptive IELTS App — Agentic Development & Vibe-Coding Playbook

**Version:** 0.1 — discussion consolidation  
**Date:** 27 October 2026  
**Status:** Development philosophy agreed; technology stack, exact tooling, and agent configurations **not yet selected**.  
**Companion document:** `ielts_adaptive_learning_product_blueprint.md`  
**Purpose:** Preserve our decisions and recommendations on building the IELTS app primarily with AI coding agents (especially Codex and Claude Code), without sacrificing reliability, security, maintainability, or learning quality. This is a planning document, not evidence that the infrastructure exists or has passed tests.

---

## 1. Executive approach

We will build this product through **specification-driven, agent-assisted development**, not one-shot prompts that attempt to generate the whole app. AI can write most implementation code, but finished work must be defined by **observable, verified behavior**, not by an agent claiming success or by an attractive screenshot.

**Guiding loop:** Specify → plan → implement a small complete slice → test → independently review → integrate → observe users → refine the specification.

Non-negotiable principles:

1. **Specify before implementing.** Every feature needs behavior, interaction states, inputs/outputs, failure paths, and acceptance criteria.
2. **Build vertically and incrementally.** Prefer one working end-to-end user journey over many half-built screens.
3. **Treat testing as executable evidence.** Unit, integration, browser, content, and security checks must verify actual outcomes.
4. **Security from day one.** Least privilege, separation of environments, threat modeling, secure defaults, and independent review.
5. **Keep agent changes bounded, reviewable, and reversible.** Short-lived branches or worktrees, small tasks, clear ownership, safe rollback.
6. **Keep project knowledge in the repository.** Agents read approved documentation; they don't reconstruct requirements from long conversations.
7. **Allow agent judgment inside constraints.** Routine implementation decisions may be delegated; architecture, privacy, security, learning rules, and deployment require explicit approval.
8. **Improve the harness when patterns of failure recur.** Add a test, constraint, tool, or clearer specification rather than repeating “be careful.”

**Not the goal:** maximizing the number of agents, the number of installed skills, or the percentage of generated code.  
**Actual goal:** reliably delivering secure, maintainable, educationally accurate software with AI doing most routine implementation work.

## 2. Project assumptions and stage boundaries

Product context (see companion blueprint for full details): free-first IELTS prep initially focused on **Academic Reading and Listening** for Arabic-speaking learners, principally around IELTS Band 5.5–7.0. Core experience combines interactive skill practice, guided freedom, adaptive recommendations, and visual answer evidence. Mobile and desktop matter. Optional AI tutoring and speaking features may come later.

We will **not** attempt a complete app generation in one prompt. The initial vertical slice is likely **Listening Map Labelling**, including question presentation, audio, answer submission, review, animated route replay, an adaptive next-step recommendation, and reliable state handling.

**Important scope discipline:** The private prototype and first public version are intended to be free. Monetization, subscription gating, and paid AI services are deferred. Do not implement speculative billing infrastructure during the initial build.

**What remains undecided:** framework, language, hosting, backend, database, auth provider, audio storage/delivery, test frameworks, CI provider, observability products, exact AI providers, and any cloud/vendor-specific implementation.

## 3. The repository as the source of truth

Create and maintain a small, navigable collection of project documents. Prefer short index documents linking to focused specifications instead of a giant instruction file.

Suggested future structure (illustrative, not a locked architecture):

```text
ielts-app/
├── README.md
├── AGENTS.md                      # Codex-compatible top-level guidance
├── CLAUDE.md                      # Claude Code top-level guidance
├── docs/
│   ├── product/                   # Vision, PRD, features, user journeys
│   ├── curriculum/                # Reading/Listening skill trees, mastery
│   ├── content/                   # Question schema, validation and editorial QA
│   ├── experience/                # UX flows, screen states, accessibility
│   ├── architecture/              # ADRs, interfaces, technology decisions
│   ├── security/                  # Threat model, data policies, controls
│   ├── development/               # Task briefs, checklists, handoffs
│   └── testing/                   # Test plan, golden scenarios, QA evidence
├── .claude/
│   ├── agents/                    # Claude Code specialist definitions
│   └── skills/                    # Claude Code skill entry points
├── .agents/
│   └── skills/                    # Codex skill entry points
├── tests/                         # Automated test suites
└── src/                           # Final structure depends on stack
```

**Document types to complete before substantive implementation:**

- **Product Requirements Document (PRD):** feature inventory, scope by release, scenarios, interactions, edge cases, done criteria.
- **Curriculum & Content Specification:** full Reading/Listening skill trees, question types, difficulty dimensions, adaptive logic, evidence and answer schemas, content quality standards.
- **Agentic Development Playbook:** this document, expanded into executable workflows once stack and tooling are chosen.
- **Feature contracts:** one focused brief per implementable feature.
- **Architecture Decision Records (ADRs):** dated rationale for irreversible or cross-cutting technical choices.

Do not prepare hundreds of exercises before validating the question schema and player. Prepare **enough original, reviewed content to test end-to-end**, then scale the bank using the validated format.

### Documentation change control

- Mark decisions **Agreed**, **Proposed**, **Open**, or **Deferred**.
- Reference stable feature IDs and exact source documents in tasks and PRs.
- If implementation reveals a flaw, update the spec through an explicit decision rather than silently changing product behavior.
- Maintain a short task handoff: objective, files changed, decisions made, tests run, defects, and next action.

## 4. Feature contracts and acceptance criteria

Every meaningful implementation task should include:

```markdown
# Feature: [ID / name]
Status: Approved / Draft
Goal and user benefit:
In scope / out of scope:
Relevant documentation and dependencies:
User journey and UI states:
Inputs, outputs, persistence and data rules:
Error, loading, empty, interruption and recovery behavior:
Security and privacy implications:
Accessibility and responsive requirements:
Acceptance criteria (observable, testable):
Required automated tests:
Required manual checks:
Definition of done:
```

**Example — Listening audio player acceptance checks:**

- Loads and plays the recording associated with the current exercise.
- Controls respond correctly across supported mobile and desktop browsers.
- Replay works when learning-mode rules permit it.
- Exam-mode rules prohibit user-initiated replay when that assessment requires one listen.
- Loading failure has a usable error/retry state; interruptions are handled explicitly.
- Navigation/resume behavior follows an approved attempt policy.
- Relevant rule and interaction tests pass.

An attractive component with a nonfunctional button is **not done**. Every visible interactive control must work as advertised, or be clearly disabled/omitted pending implementation.

## 5. Roles: agents versus skills

**Agent:** an execution or review role with task context, tools, and permissions.  
**Skill:** reusable instructions/scripts for a task procedure that many agents can invoke.  
**Tools:** capabilities such as repository access, browser automation, test runners, scanners, or content validators.  
**Harness:** instructions + context + tools + permissions + execution environment + feedback and quality gates.

Start lean, not with ten agents touching the same code.

| Role | Responsibility | Default permissions |
|---|---|---|
| Lead/orchestrator | Read spec, break down work, implement scoped vertical slices, coordinate handoffs | Scoped code edits and local tests; no autonomous merge/deploy |
| Independent QA reviewer | Check actual user behavior, regression, responsive/accessibility and failure states | Read-only code review; run safe tests |
| Security reviewer | Threat analysis, authorization, secrets, injection, risky dependency or config changes | Read-only review; safe scans |
| IELTS learning/content reviewer | Validate question answers, explanations, route/transcript alignment and adaptive rules | Review data and propose changes; edits separately approved |
| Human owner (you) | Approve changes in scope, learning design, risky actions, and release readiness | Final approval for merge/deploy and high-impact decisions |

These are **logical roles**, not necessarily different subscriptions or AI models. One tool may orchestrate specialist subagents. A second tool may serve as independent reviewer. Independent reviews are useful but do not replace real tests or human security checks.

**Why not split all frontend/backend work at first?** A small vertical feature often crosses UI, storage, and application logic; over-delegation creates costly handoffs and integration bugs. Add specialists when work becomes truly parallelizable.

## 6. Six initial reusable skills

Develop or selectively adopt these after the corresponding specs/tools exist. Each skill should document triggers, inputs, steps, outputs, exclusions, and success criteria.

| Skill | Purpose | Expected output |
|---|---|---|
| `spec-to-task` | Convert approved spec into implementable, bounded tasks, dependencies, checks | Task plan + risks + acceptance criteria |
| `implement-feature` | Make small scoped changes consistent with project architecture | Code + tests + concise change log |
| `verify-user-flow` | Exercise real browser interactions against requirements | Pass/fail report + reproduction steps + evidence |
| `security-review` | Check threats, credentials, authorization, inputs, dependencies and permissions | Findings by severity + follow-up actions |
| `validate-ielts-content` | Validate question, answer, evidence, audio, transcript, route and explanation consistency | Content quality report + unresolved ambiguity |
| `pre-merge-review` | Check scope, tests, regressions, integration, docs and outstanding risk | Merge recommendation, never automatic authorization |

Potential later additions, **only if needed**: content-generation skill; Listening audio/map synchronizer; Reading evidence annotator; accessibility audit; database migration safety; CI diagnosis; deployment validation; incident response; task-evaluation suite.

Avoid overlapping skills that duplicate the same workflow. Prefer self-contained scripts and repeatable tests over pages of prose.

## 7. Harness setup for Codex and Claude Code

We intend the project to be **tool-portable**. Keep requirements, feature contracts, security standards, and tests vendor-neutral in `docs/`.

### Codex

- `AGENTS.md` should contain short repository guidance, how to locate the approved spec, safety boundaries, test expectations, and required completion reports.
- Project skills can use `.agents/skills/<name>/SKILL.md` with supporting references/scripts where appropriate.
- Use Codex's supported agent delegation/configuration for independent roles if available in the selected version.

### Claude Code

- `CLAUDE.md` should likewise stay concise and point to shared specifications.
- Project skills can live under `.claude/skills/<name>/SKILL.md`.
- Specialist instructions can live under `.claude/agents/` as supported by the installed Claude Code version.
- Hooks and MCP tools can automate formatting, checks, and tool access once properly configured and audited.

### Consistency rule

Do **not** let `CLAUDE.md` and `AGENTS.md` become two conflicting PRDs. They should be thin adapters referencing **the same canonical files**. If necessary, keep canonical skill sources in a common directory and generate/install tool-specific copies via a reviewed script; don't assume symlinks or all skill capabilities behave identically in every tool version.

Do not mix simultaneous uncoordinated edits in the same working tree. For parallel implementation, use isolated Git branches/worktrees with exclusive file ownership or clear interface contracts.

### Example task prompt

```text
Implement [FEATURE-ID] from its approved specification.
Read the relevant project rules, contracts, and architecture decisions.
Use spec-to-task and implement-feature workflows.
Before coding, list dependencies, edge cases and tests.
Implement only the bounded feature scope.
Run the required automated checks and relevant browser tests.
Request independent QA and security review when applicable.
Provide changed files, test evidence, known issues and risks.
Do not merge, deploy or access production resources automatically.
```

The task prompt should be **short** because the detailed behavior belongs to stable repo documentation.

## 8. Feature lifecycle and change gates

1. **Define:** approved behavior, scope, edge cases, security and accessibility requirements.
2. **Plan:** affected modules, dependencies, test plan, missing approvals.
3. **Implement:** scoped change in isolated branch/worktree; appropriate tests added.
4. **Self-check:** formatting, lint, type checks, unit/integration tests, build.
5. **Functional verification:** browser automation exercises real actions and state transitions; check mobile and desktop.
6. **Independent review:** QA plus security or learning review according to risk.
7. **Integration gate:** CI passes; regressions and critical findings resolved; documentation current; human approval where required.
8. **Deploy carefully:** staging first; monitored rollout and rollback plan when public deployment exists.
9. **Learn:** analyze defects and user feedback, update spec/tests/harness.

An agent must never claim tests passed without running them and reporting results. If a check could not run, record it explicitly as **not verified**.

## 9. Automated quality strategy

The final tools depend on the chosen stack, but the categories are already decided:

- Formatter, linter, static/type checks, production build.
- Unit tests for pure learning and scoring rules.
- Integration tests for state, persistence, APIs, mode restrictions, and authorization.
- End-to-end browser tests for complete student journeys.
- Responsive/mobile browser and real-device smoke tests as feasible.
- Accessibility checks plus manual keyboard/screen-reader review on critical flows.
- Dependency, secrets, and static security scanning.
- **Domain checks** for IELTS question correctness, asset integrity, timestamp alignment, and route/evidence consistency.

Browser automation (e.g., Playwright if compatible with our stack) should click functional controls and assert outcomes, not merely check that elements render.

### Example regression cases

| Risk | Executable verification |
|---|---|
| Decorative button | Click, assert correct destination/state/content load |
| Wrong scoring | Exercise fixture with known answer, assert score and feedback |
| Lost progress | Complete attempt, reload, assert authorized persisted state |
| Exam-mode replay loophole | Attempt replay, assert restriction enforced at relevant boundaries |
| Wrong map replay | Route coordinates/timestamps must match validated exercise fixture |
| Incorrect Reading evidence | Assert cited passage range exists and supports stored key; editorial review for meaning |
| Cross-user access | Attempt to retrieve other user's resources; assert denied server-side |
| Mobile UI failure | Run responsive test matrix and interactive smoke test |
| Missing audio | Asset validation plus user-visible recovery behavior |

### Golden learning scenarios

Create deterministic fixtures with known passage/recording/map, answers, evidence, and expected recommendations. These protect the adaptive engine and content renderer from regressions.

**Educational validity matters:** a technically correct app can still teach wrong content. Automated consistency checks must be supplemented with human review, especially for ambiguity, realism and purported IELTS difficulty.

## 10. Security and privacy baseline

Security is a prerequisite for each feature, not an audit saved for launch. We can use the OWASP Application Security Verification Standard as a reference when specifying and testing requirements; exact controls will be tailored to the chosen architecture.

Core requirements:

- **Least privilege:** constrain agent filesystem, tools, network, tokens, and environment access.
- **Separate environments:** local/dev/test/staging/prod; use synthetic student data in tests.
- **Authentication and sessions:** established mechanisms, secure token/session storage, clear logout/expiry behavior.
- **Server-side authorization:** enforce ownership and access to progress, attempts, accounts, admin tools and content—not just UI hiding.
- **Input validation and safe rendering:** resist common injection classes; treat external content and AI outputs as untrusted.
- **Secret management:** never hardcode API keys, never publish credentials, block accidental commits and logs containing secrets.
- **Dependencies:** review source and permissions; pin and scan; update deliberately.
- **Privacy:** minimize collection, define retention/deletion and data access, protect learning histories and future voice recordings.
- **Operational resilience:** backups, migration safety, incident logging, monitoring and rollback without unsafe sensitive-data collection.
- **AI integrations later:** server-side credentials, quotas/rate limits, prompt-injection defenses, constrained tool access, cost and abuse monitoring.
- **Human approval:** production deploys, destructive database operations, credential access, security-policy changes and high-risk migrations.

Use threat modeling before implementation for account and progress flows, public APIs, administrative functions and any eventual AI capabilities. Automated security review is an aid—not a guarantee or a substitute for qualified human assessment of high-risk changes.

## 11. IELTS-specific content engineering

Build a **structured content system** before scaling the exercise library. Every item needs appropriate fields, such as:

- Stable ID, question type, target skills, difficulty dimensions, intended support policy.
- Original passage or audio script; actual media asset; map or passage annotations.
- Correct answer and rationale; reasonable distractor explanations.
- Listening: timestamped transcript cues, landmark positions, ordered route coordinates and corresponding answer locations.
- Reading: precise evidence spans and mappings for paraphrased or contradicted claims.
- Validation status, reviewer, version, and known limitations.

**Answer Replay:** reconstruct the **authored, verified** correct route in sync with relevant audio/transcript segments. AI may explain the verified evidence but must not make up the route or answer at review time.

**Evidence Reveal:** highlight the specific verified passage span(s) supporting the Reading answer. Do not pretend to know a student's internal reasoning from a wrong choice alone.

**Question generation:** AI can draft original IELTS-style materials, but only validated items enter the published bank. Verify answer-key consistency, naturalness, non-ambiguity, assets, and difficulty; use learners to calibrate difficulty. Label unofficial practice honestly and avoid copying copyrighted Cambridge/IELTS material without appropriate rights.

## 12. Agent evaluation and continuous harness improvement

Maintain a compact **agent evaluation suite** of representative tasks (e.g., broken button, mis-saved progress, audio failure, authorization bug, adaptive rule error, map-route inconsistency). When changing agent prompts, skills or tools, rerun relevant tasks and compare:

- Correctness and test pass rate.
- Scope compliance and unnecessary edits.
- Regressions and security findings.
- Ability to explain failures honestly.
- Reviewer agreement and unresolved defects.

If an agent repeatedly fails, investigate the root cause: missing specification, inadequate test, excess permissions, misleading examples, or weak tooling. Change the harness, not merely the wording of the next ad hoc prompt.

**Context handoffs:** each completed or interrupted task leaves a persistent record: what was requested, decisions, changed files/commits, verified checks, failed checks, outstanding risks and exact next action. This limits damage from long or interrupted agent sessions.

## 13. Observability and rollback

Before wider public exposure, provide:

- App and API error tracking with privacy-conscious logs.
- Key reliability metrics (failed audio loads, crashes, save failures, request latency).
- UX analytics sufficient to detect confusing or abandoned exercises without collecting unnecessary personal data.
- Versioned deployments and rollback procedure.
- Backups and restore tests for saved learner data.
- Safe migration and feature-flag strategy where warranted by deployment complexity.

A green CI pipeline does not prove real-world behavior. Monitor the application after release and retain a human-controlled way to disable faulty features quickly.

## 14. Existing harnesses, public skills and Google's ecosystem

**Our position:** borrow proven concepts and vetted components; do not replace our development process with a giant third-party skill pack.

Potential resources to assess later:

- **Codex official skill/documentation ecosystem:** https://github.com/openai/skills
- **Claude Code official skill guidance:** https://code.claude.com/docs/en/skills
- **Google skill collection:** https://github.com/google/skills
- **Gemini CLI:** https://github.com/google-gemini/gemini-cli
- **Google Antigravity:** official environment documentation, if evaluating it as an alternative IDE/agent platform.
- **Community skill directories:** https://skills.sh/ (discovery only, not endorsement).

**“Google's harness” may refer to** Google's agentic development environment (Antigravity), its Gemini CLI, or general “harness engineering” practices—not necessarily one package that must be installed. We can apply harness principles inside Codex and Claude Code.

### Third-party skill adoption rule

Before installation:

1. Does it serve an approved need and the selected stack?
2. Is the maintainer/source trustworthy and the version inspectable/pinnable?
3. Have `SKILL.md`, scripts, dependencies, outbound requests, and permission demands been reviewed?
4. Can it be tested without production credentials or real learner data?
5. Does it duplicate a simpler in-house check or existing official capability?

Prefer official, focused skills after choosing our stack. **Avoid bulk-installing unreviewed skills.** Skill instructions are not security isolation; enforce boundaries through actual tool permissions, sandboxing and CI.

## 15. Suggested phased roadmap

### Phase A — Product and curriculum completeness (next)
- Finish PRD and full Reading/Listening skill trees, progression, interfaces and exercise types.
- Specify first journey and acceptance criteria.
- Maintain deferred technical and business decisions as placeholders.

### Phase B — Content system and trial set
- Design schemas and authoring/validation process.
- Prepare a *small*, original, reviewed Map Labelling set across difficulty dimensions.
- Validate data model by demonstrating review/replay requirements before mass content creation.

### Phase C — Stack selection and minimal harness
- Compare frameworks, backend, auth, data store, audio/media, hosting, test runner and CI.
- Create the canonical repository structure, root instructions, task templates, minimal skills and branch policies.
- Add lint/type/build checks, first security baseline and first browser test.

### Phase D — One complete vertical slice
- Build Listening Map Labelling from onboarding/challenge to answer review, visual replay, next recommendation and saved progress.
- Verify student flows on desktop/mobile; fix failures.
- Introduce specialized QA/security/content review as needed.

### Phase E — Expand carefully
- Add Reading, other Listening question types, mastery views and examination practice in verified increments.
- Scale content only after schema/editorial pipeline proves effective.
- Add AI services only when there is a justified use case and cost/security plan.

### Phase F — Private trial → free initial public version
- Invite selected testers; capture usability, reliability and educational feedback.
- Measure transfer to unseen tasks, not just enjoyment or in-app accuracy.
- Fix high-impact defects, verify security/privacy, gradually widen access.
- Monetization remains out of scope until later strategic discussion.

## 16. Decision register

| Topic | Status | Current position |
|---|---|---|
| Primary approach | **Agreed** | Spec-driven, incremental agent-assisted development; no one-shot build |
| Security priority | **Agreed** | Secure-by-design with human control of high-impact actions |
| First technical vertical slice | **Proposed** | Listening Map Labelling + replay + basic adaptation |
| Main tools | **Preferred, not locked** | Codex and/or Claude Code; one primary orchestrator per task |
| Agent architecture | **Proposed** | Lead + independent QA, security, and learning-content review |
| Initial skills | **Proposed** | Six focused reusable workflow skills |
| Skill sourcing | **Agreed principle** | Selectively adopt reviewed official skills; avoid bulk packs |
| Project documentation | **Agreed principle** | Version-controlled Markdown specs as canonical source |
| Content creation | **Agreed principle** | Original, AI-assisted drafts allowed; validated before publication |
| Stack, deployment, auth, DB, testing tools | **Deferred** | Decide after specifications are mature |
| Future AI provider/features | **Deferred** | Add when product and cost/security needs justify |
| Prototype and first release price | **Agreed** | Free; possible monetization later, not part of early development |
| Exact approval policies and release checklist | **Open** | Finalize once architecture and team/process realities are known |

## 17. Practical anti-patterns to avoid

- “Build the whole app” prompts, huge unreviewable PRs, or long-running agent sessions without checkpoints.
- Treating successful generation or a screenshot as proof that functionality works.
- Decorative dead buttons; fake or hardcoded data presented as real student progress.
- Asking implementation agents to be their sole final reviewers.
- Too many agents editing shared files without ownership or interface contracts.
- Unrestricted autonomous merge, production deploy, secret access, or destructive commands.
- Installing unvetted third-party skills based on stars/popularity alone.
- Copying whole external exams or using unverified AI answers as authoritative content.
- Building expensive AI orchestration before a useful, validated non-AI learning loop exists.
- Freezing a large speculative specification so rigidly that user feedback cannot improve it.

## 18. Definition of done — feature level (proposed)

A feature is not done until:

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

---

## What happens next

**Do not build a full harness or start coding yet solely because this playbook exists.** Our next planning work is the comprehensive product requirements and Reading/Listening curriculum. These will determine the exact checks, schemas, architecture and tools we need. Then turn this playbook into executable repository rules, skills, scripts, CI, agent definitions, and a first working vertical slice.

*This file is deliberately a consolidation of our discussion rather than a final technology selection or a claim of guaranteed security.*
