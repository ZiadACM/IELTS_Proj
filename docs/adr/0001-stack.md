# ADR 0001: Application stack

Status: **Accepted** (2026-11-12). Decided by the agent under explicit owner delegation on 2026-11-12.
Overrides the blueprint/playbook ordering (stack after product spec), by owner request.
Sources: `docs/architecture/research/2026-11-12-stack-and-ci-sources.md` (primary sources only, fetched 2026-11-12).

## Context
Adaptive IELTS practice for Arabic-speaking learners: Arabic/RTL web and mobile web UI; synced audio and map Answer Replay; server-side authorization, answer-key hiding and exam rules (CS 2.1–2.3, D6, D9, D10); guest sessions (D5); a small team building mostly with AI agents; free product, so low hosting cost. CI is GitHub Actions (D16).

## Options
- **A. TypeScript full-stack (Next.js + Postgres).** One deploy. Risks for us: data passed to client components is serialized into the page, so an answer key can leak through a server-component prop; a CSP nonce forces per-request rendering (turns off static generation); route discovery mixes pages and handlers.
- **B. TypeScript SPA + separate Node API (React + Vite, Fastify) + Postgres.** One hard boundary: the client receives only what an API handler returns, which is exactly what the security suites test. Fastify request schemas can reject unknown fields (mass assignment); `inject()` gives fast API tests.
- **C. Python API (FastAPI) + TypeScript frontend.** Strong API tooling, but two languages for a small agent-driven team, and FastAPI Users is in maintenance mode.

## Criteria and decision
**B.** React + Vite SPA (`web/`) and a Fastify API (`server/`), deployed as one Node service that serves the built SPA and the API; PostgreSQL. RTL: plain HTML `dir="rtl"` plus logical CSS (CS 4.2), no framework dependency. Audio and Answer Replay: client-side `<audio>` timing with server-issued, single-use exam grants (D9). Tests: `node --test` (security, unit), Fastify `inject()` (API), Playwright for browsers (added with the first UI ticket, not before).

## Auth approach
**Better Auth** (maintained; anonymous plugin for guest sessions with account linking on upgrade; Postgres; built-in rate limiting; scrypt password hashing). Auth.js recommends Better Auth for new projects; Lucia is deprecated. No home-grown crypto (SESS-07). Consequence: the matrix's AUTH-* rows are logical paths; when auth is wired up, map them to Better Auth's real routes in the matrix (the coverage gate fails until they match).

## Route conventions (so the coverage gate can see every endpoint)
Literal full paths only (`fastify.get('/items/:itemId', …)` or `route({ method, url })`), no `register` prefixes; test-support routes only under `server/**/test-support/` and never mounted in production. `tests/security/adapters/discover-endpoints.mjs` fails closed otherwise.

## Hosting region (D13)
One region: **Frankfurt (EU)**, the closest region that the shortlisted providers list to the target learners; no Middle East region is listed. No special residency requirement for the prototype; **OPEN for the public version** (legal review).

## Consequences
- Two packages (`web/`, `server/`) in one repo; one runtime language (TypeScript).
- Free database tiers suspend when idle (Neon: after 5 min; Supabase: pauses after 1 week). Acceptable for the prototype.
- Node: CI uses Node 24 (verified locally); Node 26 is now the active LTS; upgrade deliberately.

## Revisit when
Server-rendered pages become necessary for SEO or performance; Better Auth stops being maintained or cannot express a decision; hosting cost rises above the prototype budget; a legal residency requirement appears (D13); or a native mobile app is approved.
