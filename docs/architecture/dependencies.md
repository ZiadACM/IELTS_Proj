# Dependency register

Status: **Proposed** (2026-11-12). Required by `CODING_STANDARDS.md` 2.7: every dependency has a stated reason, a pinned version and a record of who read its install scripts and when. Test-plan DEP-03 will check this file against the manifests once the app has any.

## Application dependencies (`package.json`, `server/package.json`, `web/package.json`; ticket 03)

Exact versions (`.npmrc`: `save-exact`), locked by `package-lock.json`. `.npmrc` sets `ignore-scripts=true`, so no dependency runs install scripts. Install scripts checked 2026-11-16 by the agent: `npm view <pkg>@<version> scripts` for every direct dependency (none has `preinstall`, `install` or `postinstall`), and `npm query` over the whole installed tree (115 packages): no `preinstall`/`install`/`postinstall` anywhere; 15 transitive packages have only `prepare`, which npm does not run for registry installs. Policy: newest release at least 7 days old, so a just-published (possibly compromised) release is not picked up. Package source code was **not** reviewed. Playwright and Better Auth (ADR 0001) are not installed yet.

| Dependency | Why | Pinned to | Install scripts / notes | Read by / on |
|---|---|---|---|---|
| `fastify` | API server (ADR 0001) | 5.12.8 | none | agent, 2026-11-16 |
| `@fastify/static` | Serves the built SPA from the same service (ADR 0001) | 10.1.10 (10.1.11 skipped: 3 days old) | none | agent, 2026-11-16 |
| `pg` | PostgreSQL client (ADR 0001) | 8.23.1 | none. Optional `pg-native` not installed | agent, 2026-11-16 |
| `react`, `react-dom` | UI (ADR 0001) | 19.3.1 | none | agent, 2026-11-16 |
| `vite` | Build the SPA (ADR 0001) | 8.3.6 (8.3.8 skipped: 5 days old) | none; native bundler binaries arrive as optional platform packages | agent, 2026-11-16 |
| `@vitejs/plugin-react` | JSX in Vite | 6.2.1 (6.3.0 skipped: 7 days old) | none | agent, 2026-11-16 |
| `typescript` | Type check (`tsc --noEmit`); the server runs `.ts` with Node's built-in type stripping, so no build step | 7.0.2 | none | agent, 2026-11-16 |
| `@biomejs/biome` | Lint and format, one dev dependency instead of ESLint + plugins | 2.6.6 (2.6.8 skipped: 1 day old) | none; native binary via optional platform packages | agent, 2026-11-16 |
| `@types/node`, `@types/pg`, `@types/react`, `@types/react-dom` | Types only | 24.19.2, 8.23.1, 19.3.0, 19.3.0 | none | agent, 2026-11-16 |
| `postgres` image | Local database (`compose.yaml`) and CI service (`ci.yml`) | `postgres:18.7-alpine@sha256:b6972e11…da0f015` (multi-arch index) | Digest from Docker Hub registry, 2026-11-16. Local: trust auth bound to 127.0.0.1 | agent, 2026-11-16 |

## CI dependencies (`.github/workflows/security.yml`)

Pins and checksums come from primary sources fetched on 2026-11-12 (`docs/architecture/research/2026-11-12-stack-and-ci-sources.md`; release checksum files downloaded from each project's GitHub release).

| Dependency | Why | Pinned to | How it is installed, and what was read | Read by / on |
|---|---|---|---|---|
| `actions/checkout` | Check out the repo in every job | v7.0.1, commit `3d3c42e5aac5ba805825da76410c181273ba90b1` | `action.yml` read: `runs.using: node24`, `main/post: dist/index.js`. Used with `persist-credentials: false`. The bundled `dist/` JavaScript was **not** reviewed. | agent, 2026-11-12 |
| `actions/setup-node` | Node 24.16.0 for `node --test` and the protected-files check | v7.1.0, commit `949feb2413d6458794dcd2491c4babbbce0c15c1` | `action.yml` read: `node24`, `dist/setup/index.js`, post step `dist/cache-save/index.js`. Package-manager cache turned off. `dist/` **not** reviewed. | agent, 2026-11-12 |
| gitleaks (CLI) | Secret scan of the full git history (SECRET-01) | v8.30.1, `gitleaks_8.30.1_linux_x64.tar.gz`, SHA-256 `551f6fc8…f2470eb` | Static Go binary, no install scripts. Checksum verified in CI. The CLI is used instead of `gitleaks-action` because the action needs a licence key for organisations and sends the repo name and owner to keygen.sh. Ran locally (darwin arm64 build, checksum verified): no leaks in 6 commits; a synthetic token was detected (exit 1). | agent, 2026-11-12 |
| osv-scanner (CLI) | Dependency vulnerability audit (DEP-01) | v2.7.1, `osv-scanner_linux_amd64`, SHA-256 `fb7dab19…16f2ee8` | Static Go binary, no install scripts. Queries the OSV.dev API with package names and versions only. Exit 128 ("No package sources found") is reported as NOT VERIFIED. Ran locally: exit 128, as expected with no manifests. | agent, 2026-11-12 |
| Semgrep (container image) | SAST for raw-HTML sinks and string-built queries (XSS-04, INPUT-02) | `semgrep/semgrep:1.185.0`, digest `sha256:67518c17…48295a0d` | Runs with `--network none`, `--metrics off` and **local rules only** (`.semgrep/security.yml`), so nothing goes to the Semgrep registry. Registry rules were not used because they are under the Semgrep Rules License, which is not open source. **Not run locally** (the Docker daemon was not running). Whether the digest is multi-arch is NOT VERIFIED. | agent, 2026-11-12 |
| actionlint (CLI) | Workflow lint (CI-01) | v1.7.12, `actionlint_1.7.12_linux_amd64.tar.gz`, SHA-256 `8aca8db9…349a3d8` | Static Go binary, no install scripts. Ran locally on `.github/workflows/security.yml`: exit 0. | agent, 2026-11-12 |
| `zizmorcore/zizmor-action` + zizmor | Workflow security audit (CI-01) | action v0.8.1, commit `45d7276c9ca790aabd705e31ca99c6185c3e76dd`; zizmor `1.32.0` | `action.yml` and `action.sh` read: a composite action that installs zizmor from wheels pinned by hash (`pip download --require-hashes`). Used with `advanced-security: false` (no SARIF upload, so the job fails on findings) and `online-audits: false`. The action is "early development" upstream. **Not run locally.** | agent, 2026-11-12 |

## Risks
- **Very recent releases.** semgrep 1.185.0 (2026-11-10) and osv-scanner 2.7.1 (2026-11-09) were less than a week old when pinned. Pinning stops silent changes, but these releases have had little public use yet. Revisit at the first pin update.
- **Checksums from the same release as the binary.** The SHA-256 values come from the same releases as the binaries. They protect against a binary changed after 2026-11-12, but not against a release that was already compromised then.
