# Dependency register

Status: **Proposed** (2026-11-12). Required by `CODING_STANDARDS.md` 2.7: every dependency has a stated reason, a pinned version and a record of who read its install scripts and when. Test-plan DEP-03 will check this file against the manifests once the app has any.

**Application and test dependencies: none.** The security tests, fixture server, endpoint adapter and tools use only Node.js built-ins (`node:test`, `node:http`, `node:crypto`, `fetch`). There is no `package.json` yet. The app dependencies chosen in `docs/adr/0001-stack.md` (React, Vite, Fastify, Better Auth, pg, Playwright) are **not installed**; each gets a row here, with its install scripts read, when the first ticket adds it.

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
