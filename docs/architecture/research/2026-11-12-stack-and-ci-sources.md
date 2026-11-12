# Stack and CI sources (primary-source research)

- Date: 2026-11-12
- Method: primary sources only (official docs sites, project GitHub repos/releases/source, GitHub REST API, Docker Hub API). All pages and API responses fetched on 2026-11-12. Pricing and plan limits are "as of fetch date" and can change.
- Scope: facts only. This file does not recommend a stack.
- Commit SHAs were resolved with `GET /repos/{o}/{r}/git/ref/tags/{tag}`. Where `object.type` was `tag` (annotated), it was dereferenced with `GET /repos/{o}/{r}/git/tags/{sha}`. No SHA in this file was guessed.

---

## A. Stack options

### A1. Next.js

- Current stable: `v16.4.6`, published 2026-11-09 (latest major = 16). Source: https://api.github.com/repos/vercel/next.js/releases/latest
- Route handlers (App Router): `route.js` files. "The following HTTP methods are supported: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`." Version history: in `v15.0.0-RC` "The default caching for `GET` handlers was changed from static to dynamic". Source: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Security headers without nonces: `async headers()` in `next.config.js` (the docs give `Strict-Transport-Security`, `X-Frame-Options` and similar examples). Sources: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers and https://nextjs.org/docs/app/guides/content-security-policy (section "Without Nonces").
- CSP with a nonce:
  - The nonce is generated in **Proxy** (`proxy.ts` / `export function proxy(request)`; the middleware file convention is now named proxy). The proxy sets `x-nonce` and `Content-Security-Policy` on the request headers and sets `Content-Security-Policy` on the response.
  - "Next.js parses the `Content-Security-Policy` header and extracts the nonce using the `'nonce-{value}'` pattern". It then attaches the nonce automatically to framework scripts, page bundles and Next-generated inline styles and scripts.
  - "you **must use dynamic rendering to add nonces**". With nonces, "Static optimization and Incremental Static Regeneration (ISR) are disabled" and "Partial Prerendering (PPR) is incompatible with nonce-based CSP". `await connection()` forces dynamic rendering.
  - Dev only: "`'unsafe-eval'` is required" in development and "is not required for production".
  - Alternative: experimental SRI (`experimental.sri.algorithm`) for hash-based CSP that keeps static generation (App Router only, experimental).
  - Source: https://nextjs.org/docs/app/guides/content-security-policy (lastUpdated 2026-03-20)
- `next build`: "creates an optimized production build of your application" in `.next` ("Development builds output to `.next/dev` instead of `.next`"). `next start` requires a prior `next build`. Source: https://nextjs.org/docs/app/api-reference/cli/next. With `output: 'standalone'`, "This will create a folder at `.next/standalone` which can then be deployed on its own without installing `node_modules`". The minimal `server.js` does not copy `public` or `.next/static` by default. Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Source maps in production: "During production builds, they are disabled to prevent you leaking your source on the client, unless you specifically opt-in" with `productionBrowserSourceMaps: true`. When enabled, "Next.js will automatically serve these files when requested." Source: https://nextjs.org/docs/app/api-reference/config/next-config-js/productionBrowserSourceMaps
- i18n (App Router): locale routing by sub-path or domain, redirecting "based on the locale inside Proxy". "ensure all special files inside `app/` are nested under `app/[lang]`". The root layout can sit at `app/[lang]/layout.js`. `next/root-params` exposes `lang` as a root param. The guide does not mention RTL or `dir`. RTL is set by the app on `<html dir="rtl">` (plain HTML, not a Next feature). Source: https://nextjs.org/docs/app/guides/internationalization

### A2. Fastify

- Current stable: `v5.12.8`, published 2026-11-02 (major 5). Source: https://api.github.com/repos/fastify/fastify/releases/latest
- LTS table: `5.0.0 | 2024-09-17 | End of LTS: TBD | Node.js 20, 22`. Source: https://github.com/fastify/fastify/blob/v5.12.8/docs/Reference/LTS.md
- Validation: Fastify uses "JSON Schema to validate routes and serialize outputs", with "Ajv v8 for request validation". Source: https://github.com/fastify/fastify/blob/v5.12.8/docs/Reference/Validation-and-Serialization.md
- Testing: "Fastify comes with built-in support for fake HTTP injection thanks to `light-my-request`" (`app.inject({...})`). "`.inject` ensures all registered plugins have booted up". Source: https://github.com/fastify/fastify/blob/v5.12.8/docs/Guides/Testing.md
- `@fastify/helmet`: latest `v13.2.0` (2026-10-13). It is "a wrapper around `helmet` that adds an `'onRequest'` hook and a `reply.helmet` decorator". CSP nonces: `{ enableCSPNonces: true }`, then "Retrieve the `nonces` through `reply.cspNonce`". Sources: https://api.github.com/repos/fastify/fastify-helmet/releases/latest and https://github.com/fastify/fastify-helmet/blob/main/README.md

### A3. FastAPI

- Current: `0.162.5`, published 2026-11-11 (still 0.x). Source: https://api.github.com/repos/fastapi/fastapi/releases/latest
- DI security: "deal with the security mechanisms at the **Dependency Injection** level, using `Depends`" (`get_current_user`). Source: https://github.com/fastapi/fastapi/blob/0.162.5/docs/en/docs/tutorial/security/get-current-user.md
- Password hashing in the official tutorial: `pwdlib`. "The recommended algorithm is 'Argon2'" (`uv add "pwdlib[argon2]"`). "pwdlib also supports the bcrypt hashing algorithm but does not include legacy algorithms". Source: https://github.com/fastapi/fastapi/blob/0.162.5/docs/en/docs/tutorial/security/oauth2-jwt.md
- Testing: `TestClient` comes from Starlette and "is based on HTTPX" (`uv add httpx`). Source: https://github.com/fastapi/fastapi/blob/0.162.5/docs/en/docs/tutorial/testing.md. Dependencies can be overridden with `app.dependency_overrides`: https://github.com/fastapi/fastapi/blob/0.162.5/docs/en/docs/advanced/testing-dependencies.md

### A4. Auth libraries (status as of 2026-11-12)

- **Lucia: deprecated.** README: "Lucia was deprecated on March 2025. See code/auth_session.ts for a complete, single-file replacement for the NPM package." The site (revised July 2026) says the same and points to the "Auth Book" as a learning resource. Sources: https://github.com/lucia-auth/lucia and https://lucia-auth.com/. The repo was not archived per the GitHub search API (`archived: false`, last push 2026-08-08): https://api.github.com/search/repositories?q=lucia+auth+in:name
- **Auth.js / NextAuth.js: now part of Better Auth (announced 2025-09-22).** The blog says "we'll keep addressing security patches and urgent issues as they come up" and "we strongly recommend new projects to start with Better Auth unless there are some very specific feature gaps" (notably "stateless session management without a database"). The repo README carries "Auth js is now part of Better Auth." Latest release: `next-auth@4.24.15` (2026-07-20). Sources: https://better-auth.com/blog/authjs-joins-better-auth, https://github.com/nextauthjs/next-auth, https://authjs.dev/getting-started/migrate-to-better-auth and https://api.github.com/repos/nextauthjs/next-auth/releases/latest
- **Better Auth**: latest `v1.7.22` (2026-11-12). Source: https://api.github.com/repos/better-auth/better-auth/releases/latest
  - Anonymous plugin: users get "an authenticated experience without" email, password or OAuth. `signIn.anonymous()` creates a user with a generated email (default `{id}@anonymous.placeholder.invalid`). When the user later signs in or up with another method, `onLinkAccount({ anonymousUser, newUser })` runs. The anonymous user is deleted automatically after linking unless `disableDeleteAnonymousUser: true`. The plugin "requires an additional field in the user table" (the field name was rendered by a component and not captured; see Unverified). Source: https://www.better-auth.com/docs/plugins/anonymous
  - Postgres: you pass a `pg` `Pool` as `database`, and "PostgreSQL is supported under the hood via the Kysely adapter". Schema commands: `npx auth@latest generate` and `npx auth@latest migrate`. Source: https://www.better-auth.com/docs/adapters/postgresql
  - Rate limiting: built in. In production the default is a 10-second window with 100 max requests. It is "disabled in development mode by default". Storage defaults to memory, with database, secondary or custom storage as options. `/sign-in/email` "Is limited to 3 requests within 10 seconds." Source: https://www.better-auth.com/docs/concepts/rate-limit
  - Password hashing: "Better Auth uses `scrypt` to hash passwords". You can override it with `emailAndPassword.password.{hash,verify}` (the docs give an Argon2 example via `@node-rs/argon2`). Default length is 8 to 128 characters. Source: https://www.better-auth.com/docs/authentication/email-password
- **FastAPI Users (Python)**: latest `v15.0.5` (2026-03-27). README: "**This project is now in maintenance mode.** While we'll continue to provide security updates and dependency maintenance, no new features will be added." A successor toolkit is "currently" in development. Hashing: `pwdlib[argon2,bcrypt]`, with `PasswordHash(Argon2Hasher(), BcryptHasher())` (Argon2 is the primary hasher). Sources: https://api.github.com/repos/fastapi-users/fastapi-users/releases/latest, https://github.com/fastapi-users/fastapi-users/blob/master/README.md and https://github.com/fastapi-users/fastapi-users/blob/master/fastapi_users/password.py

### A5. Managed Postgres and hosting regions (pricing as of 2026-11-12)

- **Neon Free**: 100 projects; "100 CU-hours/project"; up to 2 CU; "1 GB/project, 20 GB account total"; scale to zero "suspends after 5 min, cannot be turned off"; 5 GB public transfer per project; 6-hour history window. Going over storage blocks writes. Using up CU-hours or egress suspends compute until the next period. Cheapest paid plan is **Launch**, pay-as-you-go: "$0.106/CU-hour" and "$0.35/GB-month". Source: https://neon.com/pricing
- **Neon regions** (AWS): `aws-us-east-1`, `aws-us-east-2`, `aws-us-west-2`, `aws-eu-central-1` (Frankfurt), `aws-eu-west-2` (London), `aws-ap-southeast-1`, `aws-ap-southeast-2`, `aws-sa-east-1`. Azure regions are deprecated for new projects. No Middle East region. Source: https://neon.com/docs/introduction/regions
- **Supabase Free**: "500 MB database size"; "5 GB egress"; "50,000 monthly active users"; "Limit of 2 active projects"; "Free projects are paused after 1 week of inactivity". **Pro** is "from $25/month" with "$10/month in compute credits". Source: https://supabase.com/pricing
- **Supabase regions** include `eu-central-1` (Frankfurt), `eu-central-2` (Zurich), `eu-west-1/2/3`, `eu-north-1` and `ap-south-1` (Mumbai). No Middle East region. Source: https://supabase.com/docs/guides/platform/regions
- **Vercel**: there are 19 compute regions, including `fra1` (Frankfurt), `cdg1`, `lhr1`, `dub1`, `arn1` and `bom1`. No Middle East compute region. Functions "default to running in the `iad1`" region, and you change the default in project settings or with `vercel.json` `regions`. Plan limits: Hobby "Single region", Pro "5 regions". Sources: https://vercel.com/docs/regions and https://vercel.com/docs/functions/configuring-functions/region
- **Fly.io**: regions include `fra` (Frankfurt; Gateway and MPG ✓), `ams`, `cdg`, `lhr`, `arn` and `jnb`. No Middle East region. Source: https://docs.fly.io/reference/regions
- **Render**: regions are Oregon, Ohio, Virginia, Frankfurt and Singapore. The page does not say whether free instances work in every region. Source: https://render.com/docs/regions

### A6. Playwright

- Current: `v1.65.0`, published 2026-11-05. Source: https://api.github.com/repos/microsoft/playwright/releases/latest
- Requires "Node.js: latest 22.x, 24.x or 26.x." Source: https://github.com/microsoft/playwright/blob/v1.65.0/docs/src/intro-js.md
- Emulation: devices (e.g. `devices['iPhone 13']`) set userAgent, screen size, viewport and hasTouch. `locale` (e.g. `'en-GB'`; `'ar'` works the same way) and `timezoneId` can be set globally in `use:` or per test. Source: https://github.com/microsoft/playwright/blob/v1.65.0/docs/src/emulation.md (section "Locale & Timezone")
- Test runner: Playwright Test (`@playwright/test`) is its own runner. The `playwright` library can run under any runner, and the official example uses `node:assert`. The docs say: "Under most circumstances, for end-to-end testing, you'll want to use `@playwright/test`". There is no documented first-party `node --test` integration. Source: https://github.com/microsoft/playwright/blob/v1.65.0/docs/src/library-js.md

### A7. Node built-in test runner

- `node:test` is "Stability: 2 - Stable". Its history notes "v20.0.0: The test runner is now stable". The v22 and v24 docs both carry Stability 2. Some sub-features are still experimental: code coverage (`--experimental-test-coverage`), watch mode, and others marked 1.0 (tags, global setup, randomization). Sources: https://github.com/nodejs/node/blob/v24.x/doc/api/test.md and https://github.com/nodejs/node/blob/v22.x/doc/api/test.md
- LTS status on 2026-11-12 per the release schedule: v26 "Lithium" entered LTS 2026-10-28 (Active). v24 "Krypton" entered maintenance 2026-10-20 (ends 2028-04-30). v22 "Jod" is in maintenance (ends 2027-04-30). Latest builds: v26.13.1, v24.22.3, v22.23.5. Sources: https://github.com/nodejs/Release/blob/main/schedule.json and https://nodejs.org/dist/index.json

---

## B. CI scanners and GitHub Actions

| Tool | Tag | Commit SHA (40-hex, dereferenced) | Release date | Source URL |
|---|---|---|---|---|
| actions/checkout (latest) | v7.0.1 (moving `v7` currently points to the same commit) | 3d3c42e5aac5ba805825da76410c181273ba90b1 | 2026-07-20 | https://api.github.com/repos/actions/checkout/git/ref/tags/v7.0.1 |
| actions/checkout (v5 line) | v5.1.0 | fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 | NOT VERIFIED | https://api.github.com/repos/actions/checkout/tags |
| actions/checkout (v4 line) | v4.4.0 | 11d5960a326750d5838078e36cf38b85af677262 | NOT VERIFIED | https://api.github.com/repos/actions/checkout/tags |
| actions/setup-node | v7.1.0 (`v7` same commit) | 949feb2413d6458794dcd2491c4babbbce0c15c1 | 2026-10-08 | https://api.github.com/repos/actions/setup-node/git/ref/tags/v7.1.0 |
| gitleaks/gitleaks-action | v3.0.0 (`v3` same commit) | e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e | 2026-05-30 | https://api.github.com/repos/gitleaks/gitleaks-action/git/ref/tags/v3.0.0 |
| gitleaks CLI | v8.30.1 | 83d9cd684c87d95d656c1458ef04895a7f1cbd8e | 2026-03-21 | https://api.github.com/repos/gitleaks/gitleaks/releases/latest |
| google/osv-scanner-action | v2.7.1 (annotated tag obj 6bc832ee85d316ab9aeccf71929026841bd0e1ee) | 32d3cd482bdadfb38b186c0ad1b031902d55d932 | 2026-11-11 | https://api.github.com/repos/google/osv-scanner-action/git/ref/tags/v2.7.1 |
| osv-scanner CLI | v2.7.1 (annotated tag obj 7f97ec2cfa6a4aab0e042fa67e40958774d1ab8b) | 02f96a40691c2d155fdda799af436e111231e365 | 2026-11-09 | https://api.github.com/repos/google/osv-scanner/git/ref/tags/v2.7.1 |
| semgrep CLI / image | v1.185.0 (annotated tag obj 18866f410389ff28d02310adeb770e9b3c59da56) | 9240f708f8d7e2fbd38b67aa6cd17704b1f81e14 | 2026-11-10 | https://api.github.com/repos/semgrep/semgrep/git/ref/tags/v1.185.0 |
| zizmorcore/zizmor-action | v0.8.1 | 45d7276c9ca790aabd705e31ca99c6185c3e76dd | 2026-11-03 | https://api.github.com/repos/zizmorcore/zizmor-action/git/ref/tags/v0.8.1 |
| zizmor CLI | v1.32.0 | 21bd300700d43d9ba04b0c1fce72a89391ac80b4 | 2026-11-02 | https://api.github.com/repos/zizmorcore/zizmor/git/ref/tags/v1.32.0 |
| rhysd/actionlint | v1.7.12 | 914e7df21a07ef503a81201c76d2b11c789d3fca | 2026-03-30 | https://api.github.com/repos/rhysd/actionlint/git/ref/tags/v1.7.12 |

Container image digests (Docker Hub API):

| Image | Tag | Digest | Last updated | Source |
|---|---|---|---|---|
| semgrep/semgrep | 1.185.0 | sha256:67518c174185a2043fdbed16c70631b79209499b3671178e7194379b48295a0d | 2026-11-10 | https://hub.docker.com/v2/repositories/semgrep/semgrep/tags/1.185.0 |
| rhysd/actionlint | 1.7.12 | sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667 | 2026-03-30 | https://hub.docker.com/v2/repositories/rhysd/actionlint/tags/1.7.12 |

Note: `semgrep/semgrep:latest` returned a different digest (`sha256:cc1b6826...95ed`, updated 2026-11-10T08:36Z, earlier than the 1.185.0 tag). `latest` is not the same image as `1.185.0` at fetch time.

### B notes per tool

- **actions/checkout / setup-node**: usage docs are https://github.com/actions/checkout and https://github.com/actions/setup-node. The gitleaks-action v3 README says v3 moved to the Node 24 runtime and tells users to "update `actions/checkout` to v6 (the Node 24 release)". Source: https://github.com/gitleaks/gitleaks-action/blob/v3.0.0/README.md
- **gitleaks-action license key**: README quotes:
  - "`GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }} # Only required for Organizations, not personal accounts.`"
  - "If you are scanning repos that belong to an organization account, you will need to obtain a free license key". "If you are scanning repos that belong to a personal account, then no license key is required."
  - The action sends "data related to license key validation (namely `GITLEAKS_LICENSE`, repo name, and repo owner)" to keygen.sh. Since v2.0.0 the action is no longer MIT-licensed (custom LICENSE.txt).
  - Source: https://github.com/gitleaks/gitleaks-action/blob/v3.0.0/README.md
- **gitleaks CLI alternative** (v8.30.1): Linux x64 asset is `gitleaks_8.30.1_linux_x64.tar.gz` (API asset digest `sha256:551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb`). The checksums file is `gitleaks_8.30.1_checksums.txt`. Source: https://api.github.com/repos/gitleaks/gitleaks/releases/latest
- **osv-scanner-action**:
  - Reusable workflows: `.github/workflows/osv-scanner-reusable.yml` (full or scheduled scan), `.github/workflows/osv-scanner-reusable-pr.yml` (PR scan, reports only new vulns) and `osv-scanner-unified-workflow.yml`.
  - Composite/docker actions: `google/osv-scanner-action/osv-scanner-action` (runs `docker://ghcr.io/google/osv-scanner-action:v2.7.1`) and `.../osv-reporter-action`. The root `action.yml` has metadata only.
  - The reusable workflow requests `actions: read`, `contents: read` and `security-events: write`.
  - Inside the v2.7.1 tree, the reusable workflow references the sub-actions at `0e457b42d0120153c352875e9b758b1e5c58c7e5 # v2.7.1`. That is a different commit from the one the tag points to (`32d3cd48...`).
  - CLI Linux assets: `osv-scanner_linux_amd64`, with checksums file `osv-scanner_SHA256SUMS`.
  - Docs: https://google.github.io/osv-scanner/github-action/. Sources: https://github.com/google/osv-scanner-action/tree/v2.7.1 and https://api.github.com/repos/google/osv-scanner/releases/latest
- **semgrep in GitHub Actions**:
  - The official sample uses `container: image: semgrep/semgrep` ("Do not change this"). With a platform token it runs `semgrep ci` with `SEMGREP_APP_TOKEN`. The Community Edition tab runs `semgrep scan --config auto` with `permissions: contents: read`. Source: https://docs.semgrep.dev/semgrep-ci/sample-ci-configs#github-actions
  - CLI reference: `--config auto` "will log in to the Semgrep Registry with your project URL". "By default, Semgrep will report pseudonymous usage metrics ... if you pull your configuration from the Semgrep registry". `--metrics off` disables this. Source: https://docs.semgrep.dev/cli-reference
- **semgrep rule ids** (verified in https://github.com/semgrep/semgrep-rules at `develop` = `a5ad1714f00c9f7fde980cab0ea1d6dc6d414fd2`, 2026-11-10). The registry id is the path with dots plus the rule id. Registry pages returned HTTP 200 for the first two.

  | Purpose | Registry id | File | Languages |
  |---|---|---|---|
  | React dangerouslySetInnerHTML | `typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml` | typescript/react/security/audit/react-dangerouslysetinnerhtml.yaml | typescript, javascript |
  | innerHTML assignment | `javascript.browser.security.insecure-innerhtml.insecure-innerhtml` | javascript/browser/security/insecure-innerhtml.yaml | javascript, typescript |
  | innerHTML/outerHTML/document.write (related) | `javascript.browser.security.insecure-document-method.insecure-document-method` | javascript/browser/security/insecure-document-method.yaml | (not checked) |
  | SQL concat/template literal, node-postgres | `javascript.lang.security.audit.sqli.node-postgres-sqli.node-postgres-sqli` (patterns include `"$SQLSTR" + $EXPR` and `` `$SQLSTR${$EXPR}...` ``) | javascript/lang/security/audit/sqli/node-postgres-sqli.yaml | javascript, typescript |
  | SQL, user input to SQL string (Express taint) | `javascript.express.security.injection.tainted-sql-string.tainted-sql-string` | javascript/express/security/injection/tainted-sql-string.yaml | javascript, typescript |
  | Other JS SQL drivers | `...audit.sqli.node-mysql-sqli`, `node-knex-sqli`, `node-mssql-sqli` | javascript/lang/security/audit/sqli/ | javascript, typescript |

  Rules are under the "Semgrep Rules License v1.0" (https://semgrep.dev/legal/rules-license), not an OSI licence.
- **zizmor-action**:
  - README: "still in early development ... backwards incompatible changes may be made".
  - The recommended mode needs Advanced Security ("repository is public or ... Advanced Security as a paid feature on your private repository"). Otherwise set `advanced-security: false`. In that mode the action "will **not** fail when `zizmor` produces findings".
  - The `version` input defaults to `latest`, which resolves through hash-locked requirement files shipped in the action (`support/locks/zizmor-<ver>.txt`, `pip download --require-hashes`). v0.8.1 defaults to zizmor 1.32.
  - Sources: https://github.com/zizmorcore/zizmor-action/blob/v0.8.1/README.md, https://github.com/zizmorcore/zizmor-action/blob/v0.8.1/action.yml and https://github.com/zizmorcore/zizmor-action/blob/v0.8.1/action.sh
- **actionlint**:
  - "Preparing `actionlint` executable with the download script is recommended" (`bash <(curl https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash)`). The script takes a version as its first argument.
  - Docker alternative: `docker://rhysd/actionlint:latest`, or a pinned tag/digest as above. The image bundles shellcheck.
  - Release assets: `actionlint_1.7.12_linux_amd64.tar.gz` and `actionlint_1.7.12_checksums.txt`.
  - Sources: https://github.com/rhysd/actionlint/blob/v1.7.12/docs/usage.md, https://github.com/rhysd/actionlint/blob/v1.7.12/docs/install.md and https://api.github.com/repos/rhysd/actionlint/releases/latest

---

## C. GitHub settings the owner must enable

- **Plan availability (private repos)**:
  - Protected branches are "available in public repositories with GitHub Free and GitHub Free for organizations ... also available in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server." https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
  - Rulesets are "available in public repositories with GitHub Free and GitHub Free for organizations, and in public and private repositories with GitHub Pro, GitHub Team, and GitHub Enterprise Cloud". "Push rulesets are available for the GitHub Team plan in internal and private repositories". https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
  - Code owners: same wording as protected branches (Free = public only; Pro/Team/Enterprise = public and private). https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
  - Plans page: GitHub Pro adds "Required pull request reviewers", "Protected branches" and "Code owners" in private repositories. https://docs.github.com/en/get-started/learning-about-github/githubs-plans
- **Rulesets and branch protection rules**:
  - "Require a pull request before merging", optionally "require reviews from code owners".
  - "Require status checks to pass": you can "select an app as the expected source of status updates".
  - "Block force pushes" ("enabled by default").
  - "Restrict deletions".
  - Rulesets layer with branch protection, and "the most restrictive version of the rule applies".
  - Branch protection does not apply to admins by default ("You can enable this setting to apply the restrictions to admins").
  - Sources: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets and the about-protected-branches page above.
- **CODEOWNERS**:
  - Location is `.github/`, root or `docs/`, searched "in that order", and the first one found is used.
  - Syntax is gitignore-like, except that `!` and `[ ]` are not supported. "the last matching pattern takes the most precedence".
  - Owners "must have explicit `write` access".
  - The file must be under 3 MB.
  - Enable "Require review from Code Owners" in branch protection or a ruleset.
  - GitHub recommends owning the CODEOWNERS file itself (e.g. `/.github/CODEOWNERS @owner`).
  - Source: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- **Workflow approval for outside contributors**:
  - Public repos, setting "Approval for running fork pull request workflows from contributors". Options are "Require approval for first-time contributors who are new to GitHub", "Require approval for first-time contributors" and "Require approval for all external contributors". "By default, all first-time contributors require approval to run workflows." There is a warning that the first-time options can be gamed by getting a trivial change merged first.
  - `pull_request_target` runs "will always run, regardless of approval settings".
  - Private repos: section "Enabling workflows for forks of private repositories", with options "Run workflows from fork pull requests", "Send write tokens...", "Send secrets..." and "Require approval for fork pull request workflows".
  - Source: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository
- **Default GITHUB_TOKEN permissions**:
  - "Workflow permissions" offers "read and write access for all permissions (the permissive setting), or just read access for the `contents` and `packages` permissions (the restricted setting)".
  - "By default, when you create a new repository in your personal account, `GITHUB_TOKEN` only has read access for the `contents` and `packages` scopes". Organization repos inherit the org setting.
  - "Allow GitHub Actions to create and approve pull requests" is off by default for personal-account repos.
  - A repo setting "Require actions to be pinned to a full-length commit SHA" exists ("Reusable workflows can still be referenced by tag").
  - Source: same page as above.
- **Secret scanning and push protection**:
  - Secret scanning: "Public repositories: Secret scanning runs automatically for free." "Organization-owned private and internal repositories: Available with GitHub Secret Protection enabled on GitHub Team or GitHub Enterprise Cloud." "User-owned repositories: Available on GitHub Enterprise Cloud with Enterprise Managed Users." Source: https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning
  - Push protection for repositories "Requires GitHub Secret Protection to be enabled" and is "disabled by default".
  - Push protection for users "Is enabled by default" and "Stops you from pushing secrets to public repositories on GitHub".
  - Source: https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection
  - Read together, these pages list no secret scanning or repository push protection for a private repo owned by a personal account on Free or Pro.

---

## Unverified items

- Release dates for actions/checkout `v5.1.0` and `v4.4.0`: NOT VERIFIED. The unauthenticated GitHub API rate limit (60/h) was exhausted before the per-release lookups. Their commit SHAs come from `GET /repos/actions/checkout/tags` (which returns the commit SHA) and were not re-checked through `git/ref`.
- Better Auth anonymous plugin user-table field name (commonly `isAnonymous`): NOT VERIFIED. The docs page renders the schema table from a component that was not captured as text.
- Render free-instance availability per region: NOT VERIFIED (not stated on https://render.com/docs/regions).
- `insecure-document-method` rule languages: NOT VERIFIED (not opened).
- Whether a `semgrep/semgrep` image digest is multi-arch index vs single manifest: NOT VERIFIED. Docker Hub `digest` was recorded as returned.
- Lucia repo archive status: the GitHub search API reported `archived: false`. The direct repo API call was rate limited, so this was not confirmed via `GET /repos/lucia-auth/lucia`.
- No first-party `node --test` + Playwright integration doc was found. The statement in A6 is based on the Playwright Library page only.
