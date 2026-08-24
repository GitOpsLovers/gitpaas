# Research — the infrastructure and the monorepo

Scope: the workspace, the scripts, `packages/contracts/`, `iac/`, `.github/`, `scripts/`,
`.devcontainer/`, `.dev/`, the `.dockerignore` and the two production Dockerfiles.
Out of scope: `apps/backend/src/` and `apps/frontend/src/` (read only to prove a claim).

---

## 1. What the infrastructure does today, and where

### The workspace

`pnpm-workspace.yaml:1-3` declares `apps/*` and `packages/*`. Three packages exist:
`@gitpaas/backend`, `@gitpaas/frontend` and `@gitpaas/contracts`. `pnpm-workspace.yaml:5-15`
holds an `allowBuilds` allow-list of 9 native packages, and `:17-18` one `minimumReleaseAgeExclude`
entry. There is no `catalog:` block.

`package.json:3-9` gives five root scripts, each one a bare `turbo run <task>`.
`package.json:10-23` declares 13 devDependencies: the 7 plugins of semantic-release, the
conventionalcommits preset, `semantic-release`, `turbo`, `typescript` and
`typescript-language-server`. `package.json:24-27` pins `pnpm@11.1.3` and `node 26.1.0`.

`turbo.json:31-65` declares 9 tasks. Four of them (`watch`, `start`, `start:debug`, `start:prod`)
exist only so a hand-typed `turbo run …` works; no root script and no workflow calls them.
`turbo.json:4-29` lists `globalEnv` (`NODE_ENV`) and 24 `globalPassThroughEnv` entries.
`turbo.json` declares no `inputs` on any task, no `globalDependencies` and no `envMode`.

### The scripts

| Package | Scripts | Where |
|---|---|---|
| root | `build`, `dev`, `lint`, `test`, `check-types` | `package.json:3-9` |
| backend | `build`, `start`, `dev`, `start:debug`, `start:prod`, `lint`, `check-types`, `test`, `test:e2e` | `apps/backend/package.json:3-12` |
| frontend | `dev`, `build`, `watch`, `check-types`, `test`, `lint` | `apps/frontend/package.json:3-9` |
| contracts | `build`, `lint`, `check-types`, `test` | `packages/contracts/package.json:9-13` |

The frontend `check-types` is not a type-check but a full development build that **emits** into
`dist/check-types` (`apps/frontend/package.json:6`). The backend `check-types` is a true
`tsc --noEmit` (`apps/backend/package.json:9`).

### The package `@gitpaas/contracts`

23 TypeScript files under `packages/contracts/src/`, 1 000 lines in total, of which
`index.ts` is 127 lines of pure re-export. Two spec files
(`packages/contracts/src/logs/__tests__/log-archive.contract.spec.ts`,
`packages/contracts/src/projects/__tests__/project.contract.spec.ts`). One folder for one
backend feature: `authentication`, `containers`, `deployments`, `logs`, `namespaces`,
`networks`, `projects`, `providers`, `server`, `service-environment`, `services`, `shared`.

Each `*.contract.ts` file holds a Zod schema plus its `z.infer` type. The package builds to
`dist/` (`packages/contracts/package.json:4-8`, `tsconfig.build.json`), and both applications
consume it as `workspace:*` (`apps/backend/package.json:15`, `apps/frontend/package.json:12`).
176 source files across the two applications import it.

### `iac/`

`iac/development/docker-compose.yml` (98 lines, project `gitpaas-dev`) runs `postgres`, `redis`,
`pgadmin` and `redisinsight`, all bound to `127.0.0.1`, with the two UI seed files
`pgadmin/servers.json` and `redisinsight/databases.json`.

`iac/production/docker-compose.yml` (70 lines, project `gitpaas`) runs `postgres`, `redis`,
`backend` and `frontend`; the last two pull `ghcr.io/gitopslovers/gitpaas-*:${IMAGE_TAG:-latest}`.
`iac/production/` also holds `backend.Dockerfile` (89 lines), `frontend.Dockerfile` (60 lines),
`nginx.conf` (53 lines), `.env.example` and `migrations/` (13 numbered `.sql` files,
`001_extensions.sql` … `013_service_variables.sql`).

### `.github/`

Three workflows. `pr-verify.yml` (51 lines) runs checkout → pnpm → node → install → four separate
`turbo run … --affected` invocations. `pr-labeler.yml` (20 lines) applies a `kind/` label.
`release.yml` (146 lines) runs `semantic-release`, then a two-entry matrix that builds and pushes
the backend and frontend images to ghcr.io with QEMU, Buildx and a per-image `type=gha` cache.
`dependabot.yml` declares three ecosystems, each anchored at a single `directory`.

### `scripts/`, `.devcontainer/`, `.dev/`

`scripts/install.sh` is a 519-line POSIX installer with 27 named functions: it installs Docker,
resolves the release tag, downloads the tarball, generates `.env` with random secrets, starts the
data stores, applies `iac/production/migrations/*.sql` against a `schema_migrations` ledger
(`scripts/install.sh:360-405`), hashes and seeds the admin (`:411-456`) and brings the stack up.

`.devcontainer/Dockerfile` (5 lines) is `node:26.1.0-alpine3.23` + git + corepack.
`.devcontainer/devcontainer.json` mounts three named volumes for `node_modules` and runs
`pnpm install` on create. `.devcontainer/.dockerignore` (4 lines) duplicates a subset of the root one.

`.dev/` holds Docker TLS material (`ca/`, `client/`, `server/`, `.env`, 4 `key.pem` files). It is
git-ignored (`.gitignore:40`), and no file in `scripts/`, `iac/`, `.github/` or `docs/` refers to it.

---

## 2. The findings

Ordered by value returned for the effort spent.

### F1 — The two production Dockerfiles cannot build. **Critical.**

`iac/production/backend.Dockerfile:44-52` and `iac/production/frontend.Dockerfile:36-45` copy
`pnpm-lock.yaml`, `pnpm-workspace.yaml`, the root `package.json` and the application manifest —
and nothing else. `packages/contracts/package.json` is never copied, and `packages/contracts/`
is never copied.

Consequences, in order:

1. `pnpm install --frozen-lockfile --filter @gitpaas/backend...` resolves `@gitpaas/contracts`
   from `workspace:*`. The workspace member is absent from the context, so the install fails.
2. Even past that, `RUN pnpm --filter @gitpaas/backend build`
   (`backend.Dockerfile:52`, `frontend.Dockerfile:45`) runs the leaf build alone. It is not
   `turbo run build`, and it carries no `...` selector, so `packages/contracts/dist/` is never
   produced — and `main`/`types` of the package point at `./dist/index.js` and `./dist/index.d.ts`
   (`packages/contracts/package.json:4-5`).

The commit that created the package, `a631505 feat(request-model)!: initialize contracts package
(phase 1) (#112)`, touched both Dockerfiles but only renamed the pnpm filter from
`@gitopslovers/gitpaas/backend` to `@gitpaas/backend`. The `COPY` block was never extended.
`grep -rn "contracts" iac/` returns nothing.

- **Cost of keeping it:** every `release.yml` run fails in the `publish` job, so no image can ship.
  The one-line installer, which pulls those images, cannot install a new version.
- **Size of the change:** ~4 lines in each Dockerfile (copy `packages/contracts/package.json`
  before the install, copy `packages/contracts` before the build, and build with a selector that
  includes the dependency).

### F2 — `pr-verify.yml` cannot catch F1. **High.**

`.github/workflows/pr-verify.yml:4-13` filters on `apps/**`, `packages/**`, `package.json`,
`pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json` and the workflow itself. `iac/**`,
`scripts/**`, `.tool-versions` and `.dockerignore` are absent, and no job ever builds an image.
A change to a Dockerfile, to the compose stacks, to the installer or to the version pins reaches
`main` with zero verification, and the first failure appears in a manual release.

- **Cost of keeping it:** the release pipeline is the only test of the Dockerfiles, and it runs
  by hand, after the merge.
- **Size of the change:** 4 added paths, plus one `docker/build-push-action` job with
  `push: false` (~25 lines).

### F3 — `turbo.json` does not build `contracts` before `dev`. **High.**

`turbo.json:44-47` declares `dev` with `cache: false` and `persistent: true`, and **no**
`dependsOn`. `build`, `test` and `check-types` all carry `dependsOn: ["^build"]`
(`turbo.json:33, 37, 41`), so they are correct; `dev` is the one that is not. On a clean
checkout, `pnpm dev` starts the backend and the frontend against a `@gitpaas/contracts` whose
`dist/` does not exist. The same hole applies to `watch` (`:48-51`), `start` (`:52-55`) and
`start:debug` (`:56-59`).

- **Cost of keeping it:** every fresh clone, every `pnpm store prune`, every branch switch that
  changes a contract, produces a failure that the developer must diagnose by hand.
- **Size of the change:** one `dependsOn: ["^build"]` line on `dev` (and, if kept, on the other
  three).

### F4 — `globalPassThroughEnv` names a variable that does not exist and omits one that does. **High.**

`turbo.json:18` lists `PROVIDERS_ENCRYPTION_KEY`. No file under `apps/` mentions that name.
The variable the backend actually requires is `SECRETS_ENCRYPTION_KEY`
(`apps/backend/src/core/infrastructure/config/env-validation.config.ts:39`,
`apps/backend/src/core/infrastructure/crypto/secret-cipher.adapter.ts:30`,
`apps/backend/.env.example:23`, `scripts/install.sh:301`), and it is **not** in the list.

Turborepo 2 defaults to strict env mode, so a variable outside `globalEnv` /
`globalPassThroughEnv` is withheld from the task. The failure is masked today only because
`@nestjs/config` reads `apps/backend/.env` from disk.

The deeper issue: `turbo.json:5-29` is a hand-copied mirror of the Zod schema in
`env-validation.config.ts:28-52`. Two lists of the same 25 names, in two languages, with no check
that binds them. `PROVIDERS_ENCRYPTION_KEY` is the drift that already happened.

- **Cost of keeping it:** a silent, environment-dependent failure class, and a growing gap
  between the two lists.
- **Size of the change:** rename one entry (2 lines). Removing the duplication is larger — see
  the options in §3.

### F5 — CI throws away the Turborepo cache and repeats its setup. **High.**

`pr-verify.yml:20-51` and `release.yml:35-52` share an identical five-step block: checkout with
`fetch-depth: 0`, `pnpm/action-setup@v6` with `version: 11.1.3`, `actions/setup-node@v7` with
`node-version: 26.1.0` and `cache: 'pnpm'`, then `pnpm install --frozen-lockfile`. 22 duplicated
lines, and the two version literals appear in both files.

No workflow restores `.turbo/`. `pr-verify.yml:43-51` then runs four separate turbo invocations.
Because `check-types`, `test` and `build` each declare `dependsOn: ["^build"]`, the `contracts`
build is scheduled three times; only the in-run local cache saves it. Across runs, nothing is
reused: every push to a PR recompiles everything `--affected` reports.

`release.yml:120-146` builds the images with a `type=gha` Docker layer cache, but the Node build
inside those images shares nothing with the PR job that just built the same code.

- **Cost of keeping it:** every PR pays the full build; the setup block must be edited in two
  places whenever Node or pnpm moves.
- **Size of the change:** one `.github/actions/setup/action.yml` composite (~25 lines) used by
  both workflows, one `actions/cache` step keyed on `.turbo/`, and the collapse of four turbo
  calls into `turbo run check-types lint test build --affected`.

### F6 — `packages/contracts` exports 123 symbols; 46 are used by neither application. **Medium.**

Measured by matching each identifier re-exported from `packages/contracts/src/index.ts` against
`apps/backend/src` and `apps/frontend/src`:

| Consumed by | Count |
|---|---|
| both applications | 45 |
| exactly one application | 32 |
| neither application | 46 |

The 46 dead exports are almost entirely the **response** schemas: `projectSchema`,
`serviceSchema`, `deploymentSchema`, `userSchema`, `namespaceSchema`, `networkSchema`,
`containerSchema`, `providerSchema`, `providerTypeSchema`, `userRoleSchema`,
`deploymentStatusSchema`, `storedLogEventSchema`, `archivedLogEntrySchema` and their siblings.
Each one exists only so its `z.infer` type can be exported next to it; no application ever
validates a response with it. Verified: their only references are their own defining file and
`index.ts`.

The 32 single-application exports split cleanly. The backend alone uses `ProviderType` (15 files),
`ServiceVariable` (15), `ProviderRegistration` (14), `ProviderRegistrationStep` (13),
`SetServiceVariableDto` (9), `UpdateServiceVariableDto` (8), `StoredLogEvent` (6), `UserRole` (28),
and every `create*Schema` / `update*Schema` (one call site each, the validation pipe). The frontend
alone uses `errorEnvelopeSchema` (3 files), `logEventSchema`, `readinessResultSchema` and
`serverStatusSchema` — four schemas, and they are the only ones it validates at runtime.

So the shape is asymmetric: the backend consumes the *request* schemas as runtime validators and
the *response* types as return types; the frontend consumes the response **types** and four
runtime schemas. Three constants — `SERVICE_VARIABLE_NAME_MAX_LENGTH`,
`SERVICE_VARIABLE_NAME_MESSAGE`, `SERVICE_VARIABLE_NAME_PATTERN` — are exported and used nowhere,
which is the clearest sign the barrel grew by habit rather than by demand.

- **Cost of keeping it:** the 127-line barrel must be edited for every contract change; 37% of the
  public surface is noise a reader must skip; `zod` ships into the frontend bundle to serve four
  schemas.
- **Size of the change:** deleting the 46 unused exports is mechanical (~60 lines of `index.ts`,
  plus the schema constants whose only purpose was the type). Reshaping the package is larger.

### F7 — `contracts` lints as a jest package and tests with vitest. **Medium.**

`packages/contracts/eslint.config.mjs:6` calls
`multistack.configs.tsLibrary({ testRunner: 'jest' })`, but `packages/contracts/package.json:12`
runs `vitest run`, `vitest.config.ts` sets `globals: true`, and `tsconfig.json:6` sets
`types: ["vitest/globals"]`. The lint rules for the test files target the wrong runner.

- **Cost of keeping it:** the two spec files are linted against rules for globals they do not use,
  and the rules for the globals they do use are absent.
- **Size of the change:** one word.

### F8 — Three turbo tasks declare outputs that no command produces, and one produces an output it does not declare. **Medium.**

- `turbo.json:36-39`: `test` declares `outputs: ["coverage/**"]`. The backend runs bare `jest`
  (`apps/backend/package.json:11`) with no `--coverage`; the frontend runs
  `ng test --watch=false`; contracts runs `vitest run`. None emits coverage. The declared output
  is dead, so a cache hit restores nothing and a reader is misled about what the task produces.
- `turbo.json:40-42`: `check-types` declares no outputs, yet the frontend implementation
  (`apps/frontend/package.json:6`) writes a full development build into `dist/check-types`.
  That directory falls inside `build`'s output glob `dist/**` (`turbo.json:34`), so a `build`
  cache entry can absorb an artifact produced by a different task.
- `turbo.json:43`: `lint` is `{}` — no `inputs`, so any change inside a package (a `.md`, a
  fixture) invalidates its lint cache. Same for every other task, since no task declares `inputs`.

- **Cost of keeping it:** cache entries that are wrong rather than merely cold, and a `build`
  artifact that varies with whether `check-types` ran first.
- **Size of the change:** remove the `coverage/**` line, make the frontend `check-types` a real
  `tsc --noEmit` or declare its output, add `inputs` to `lint`. ~10 lines.

### F9 — The Node and pnpm versions are pinned in eight places, and the doc says one. **Medium.**

`docs/architecture/monorepo/conventions.md:3` states: *"The Node and pnpm versions are set in one
place (`.tool-versions`)."* The literals `26.1.0` and `11.1.3` in fact appear in:

| Location | Line |
|---|---|
| `.tool-versions` | 1-2 |
| `package.json` `packageManager` + `engines` | 24, 26 |
| `iac/production/backend.Dockerfile` `ARG` defaults | 17-18 |
| `iac/production/frontend.Dockerfile` `ARG` defaults | 17-18 |
| `.github/workflows/pr-verify.yml` | 31, 37 |
| `.github/workflows/release.yml` | 41, 47 |
| `.github/workflows/release.yml` `build-args` | 132-133 |
| `.devcontainer/Dockerfile` `FROM node:26.1.0-alpine3.23` | 1 |

Nothing reads `.tool-versions`. Related contradiction: both production Dockerfiles carry the
comment *"Node 26 no longer bundles corepack, so install the pinned pnpm via npm"*
(`backend.Dockerfile:27`, `frontend.Dockerfile:27`), while `.devcontainer/Dockerfile:5` does
`npm install --global corepack@latest && corepack enable pnpm` on the same Node 26 — two
different answers to the same question, in the same repository.

- **Cost of keeping it:** a version bump is an eight-file edit, and a missed one produces a
  build that differs from CI.
- **Size of the change:** the CI half is easy (read `.tool-versions` in the composite action of
  F5, pass it as `build-args`). The Dockerfile `ARG` defaults can stay as a fallback.

### F10 — The two compose stacks duplicate their data services. **Medium.**

`iac/development/docker-compose.yml:24-59` and `iac/production/docker-compose.yml:3-33` define
`postgres` and `redis` with the same `image` (`postgres:17.6-alpine3.22`, `redis:8.2-alpine`), the
same `container_name`, the same `restart`, the same redis `command`, the same two healthchecks
(identical `interval`, `timeout`, `retries`, `start_period`) and the same volume mounts. Roughly
36 lines repeat. The differences are real but few: development hardcodes the credentials and
publishes `127.0.0.1:5432` / `127.0.0.1:6379`; production reads `${POSTGRES_*}` and publishes
nothing.

Two more repetitions in the same area:

- The backend healthcheck command is byte-identical in `iac/production/docker-compose.yml:53`
  and `iac/production/backend.Dockerfile:87`.
- `container_name: gitpaas-postgres` and `gitpaas-redis` are shared by **both** stacks, so the
  development stack and the production stack cannot run on one host, even though the compose
  project names differ (`gitpaas-dev` vs `gitpaas`).

- **Cost of keeping it:** a Postgres or Redis version bump is a two-file edit that Dependabot
  covers in one file only (F12); the two stacks can silently diverge.
- **Size of the change:** a shared `iac/base/data-stores.yml` plus `extends:` in both stacks
  removes ~30 lines. Note that `extends` does not merge `ports`, so the split is not free.

### F11 — `.dev/` reaches the Docker build context, private keys included. **Medium.**

`.dev/` holds `ca/key.pem`, `client/key.pem`, `server/key.pem` and `.env`. `.gitignore:40` keeps
them out of git. The root `.dockerignore` does **not** list `.dev` — it lists `.devcontainer`
(`:22`) and `**/.env` (`:31`), which excludes `.dev/.env` but not the four private keys. The
production images build with `context: .` (`release.yml:128`), so those keys are uploaded into
every build context.

No `COPY` reaches them, so they do not land in a published layer — but they are transferred, they
are visible to every build stage, and the exclusion depends on nobody ever writing a broad `COPY`.

Two smaller inaccuracies nearby: `.dockerignore:27` ignores `skills-lock.json`, which does not
exist in the repository; `.devcontainer/.dockerignore` duplicates four rules of the root file for
a 5-line Dockerfile that copies nothing.

- **Cost of keeping it:** a hygiene rule that holds by accident rather than by declaration.
- **Size of the change:** one line.

### F12 — Dependabot watches one directory per ecosystem. **Medium — verify.**

`.github/dependabot.yml:4-16` declares the npm ecosystem at `directory: /` only. The three
workspace manifests live at `/apps/backend`, `/apps/frontend` and `/packages/contracts`, and they
hold every runtime dependency — the root holds only turbo, typescript and semantic-release.
`:31-42` declares the docker ecosystem at `/iac/production` only, so `.devcontainer/Dockerfile`
and the four images of `iac/development/docker-compose.yml` (postgres, redis, pgadmin,
redisinsight) are never proposed for an update.

I could not confirm from the repository whether Dependabot's pnpm-workspace support makes the
root `directory` cover the members; the docker gap is certain either way. Treat the npm half as a
hypothesis to verify against a real Dependabot run.

- **Cost of keeping it:** every dependency is exact-pinned (a strength — see §Strengths), so an
  un-watched manifest simply never moves.
- **Size of the change:** `directories: ["/", "/apps/*", "/packages/*"]` and two more docker
  entries. ~8 lines.

### F13 — Documentation drift. **Low.**

- `docs/architecture/monorepo.md:5`: *"There are no shared packages."* `packages/contracts`
  has existed since commit `a631505`, and 176 source files import it.
- `docs/architecture/monorepo/structure.md:5-24`: the tree has no `packages/` entry, and shows
  `.github/workflows/    # CI: pr-verify.yml, release.yml` while a third workflow,
  `pr-labeler.yml`, exists. It also lists `skills-lock.json`, which does not exist.
- `docs/architecture/monorepo/conventions.md:6`: *"The root declares only `turbo` and
  `typescript`."* `package.json:10-23` declares 13 packages.
- `docs/architecture/monorepo/conventions.md:3`: the one-place version claim — see F9.
- `docs/architecture/monorepo/operations.md:16-19`: the workflow table is correct, but the
  markdown table separator on line 15 is malformed (the leading `|` is missing), so the table does
  not render.

- **Cost of keeping it:** an agent that reads `monorepo.md` before touching the workspace is told
  the shared package does not exist.
- **Size of the change:** ~15 lines across four pages.

### F14 — Scripts and tasks that nothing calls. **Low.**

- `turbo.json:48-64`: `watch`, `start`, `start:debug`, `start:prod`. No root script and no
  workflow invokes any of them. `watch` exists only in the frontend
  (`apps/frontend/package.json:5`); the other three only in the backend
  (`apps/backend/package.json:5,7,8`).
- `apps/backend/package.json:12`: `test:e2e`. `apps/backend/test/jest-e2e.json` and
  `app.e2e-spec.ts` exist, but `turbo.json` declares no `e2e` task, no workflow runs it, and
  `CLAUDE.md` forbids running E2E tests. It is a script kept alive by its file, not by a caller.
- `scripts/install.sh:234`: `upsert_env() { set_env "$1" "$2"; }` — a pure alias. Both names are
  then used in the same function (`:284-285` and `:297-306`), which reads as if they differed.
- `apps/frontend/tsconfig.spec.json:5`: `outDir: "./out-tsc/spec"`, a directory that the vitest
  builder never writes and that `.gitignore` does not cover.

- **Cost of keeping it:** a reader must test each one to learn it is dead.
- **Size of the change:** ~20 lines removed across four files.

### F15 — `install.sh` hardcodes the frontend port it made configurable. **Low.**

`iac/production/docker-compose.yml:65` publishes `${FRONTEND_PORT:-8080}`, but
`scripts/install.sh:303-304` writes `CORS_ORIGIN` and `APP_BASE_URL` as
`http://${HOST_ADDR}:8080`. An operator who sets `FRONTEND_PORT` gets a stack whose CORS origin
and base URL point at the wrong port.

- **Cost of keeping it:** a configurable knob that breaks the install when it is turned.
- **Size of the change:** two lines.

---

## 3. The options and their cost

### On `@gitpaas/contracts` (F6)

**A — Prune only.** Delete the 46 exports that neither application uses, keep the folder-per-feature
layout and the single barrel. Cost: ~60 lines of `index.ts` and a handful of `export` keywords
removed; zero risk, one afternoon. Buys: a 37% smaller public surface. Does not address the
127-line barrel that every contract change must edit, nor the fact that `zod` reaches the frontend
bundle for four schemas.

**B — Prune, then split the barrel into per-feature entry points.** Add an `exports` map to
`packages/contracts/package.json` so a consumer imports `@gitpaas/contracts/projects` rather than
the root. Cost: touching 176 import sites (mechanical, but wide), plus the `exports` map and the
build config; note `apps/backend/tsconfig.json:10` sets `resolvePackageJsonExports: true`, so the
backend is ready, and the Angular builder handles subpath exports. Buys: no more barrel edits,
per-feature tree-shaking, and a compiler-enforced boundary between features. Risk: a wide diff
that collides with any in-flight branch.

**C — Split runtime from types.** Keep the schemas the backend validates with and the four the
frontend validates with; export everything else as a plain `type`, generated or hand-written,
with no `zod` value. Cost: highest — it changes what the package *is*, and the 46 dead schemas
become the source for types that must then be written by hand or derived. Buys: `zod` leaves the
frontend's dependency list; the request/response asymmetry becomes explicit in the package layout
instead of implicit in usage. Risk: the single source of truth is weakened if types and schemas
can drift.

### On the environment lists (F4)

**A — Fix the one name.** Rename `PROVIDERS_ENCRYPTION_KEY` to `SECRETS_ENCRYPTION_KEY` in
`turbo.json:18`. Two lines, immediate, leaves the duplication.

**B — Add a check.** Keep both lists and add a test in the backend that asserts every key of the
Zod schema appears in `turbo.json`'s `globalPassThroughEnv`. Cost: ~30 lines of spec, plus a read
of `turbo.json` from a test — which couples a backend test to a root file. Buys: the drift can
never recur silently.

**C — Generate one from the other.** Make `.env.example`, `turbo.json` and the Zod schema derive
from a single declaration. Cost: a generator script and a CI step that fails when the generated
files are stale. Buys: one source of truth. Risk: it is a new build step for 25 strings, and
"no over-engineering" is an explicit limit of this feature.

### On CI (F5, F2, F9)

**A — Composite action only.** Extract the shared five-step setup into
`.github/actions/setup/action.yml`, used by both workflows, reading the versions from
`.tool-versions`. ~25 lines added, 22 removed. Removes two of the eight version pin sites and the
duplicated block. Low risk.

**B — Composite action + Turborepo cache.** Add A, plus an `actions/cache` step on `.turbo/`
keyed by the lockfile and the SHA, and collapse the four turbo invocations into one. Buys: PR
runs reuse work across pushes. Risk: a cache key that is too loose serves a stale result — the
key must include the lockfile hash.

**C — B + a build-only image job.** Add a job that builds both Dockerfiles with `push: false`
when `iac/**` changes, and widen the `paths` filter. This is what makes F1 impossible to repeat.
Cost: ~35 lines and 2-4 minutes of CI on the PRs that touch `iac/`. Buys: the release pipeline
stops being the first test of the Dockerfiles.

### On the compose stacks (F10)

**A — Leave them.** 36 duplicated lines across two files that change rarely. The duplication is
honest: the two stacks genuinely differ in credentials, ports and membership.

**B — Shared base with `extends`.** One `iac/base/data-stores.yml` holding image, restart,
command, healthcheck and volume; both stacks extend it and add their own `environment` and
`ports`. Removes ~30 lines. Cost: `extends` does not merge `ports` or `depends_on`, so the base
must hold only what is truly common, and a reader must now open two files to understand one
service. Also fixes the version-bump-in-two-places problem.

**C — B plus distinct `container_name` per environment.** Adds the ability to run both stacks on
one host. Cost: one more line each, plus updating any doc or script that refers to
`gitpaas-postgres` by name.

---

## 4. What the user must decide

1. Is F1 a bug to fix now, on its own branch, outside this complexity-reduction feature? It is a
   broken release pipeline, not a complexity problem, and holding it inside a large refactor delays it.
2. For `@gitpaas/contracts`: option A (prune), B (prune + subpath exports) or C (split runtime
   from types)?
3. Should the 46 unused response **schemas** be deleted outright, or kept as the declared source
   of the types they infer even though nothing validates with them?
4. Should `zod` remain a frontend runtime dependency for its four validated schemas, or should the
   frontend stop validating responses?
5. For the environment lists: fix the one name (A), add a drift test (B), or generate (C)? Does a
   generator cross the "no over-engineering" limit of `TODO.md`?
6. Should `pr-verify.yml` build the Docker images on PRs that touch `iac/**`, accepting the extra
   CI minutes?
7. Should the CI adopt a Turborepo cache, and if so local (`actions/cache`) or remote?
8. Do the compose stacks get a shared base, or is 36 lines of honest duplication acceptable?
9. Should the development and production stacks be able to run on one host, which requires
   changing the shared `container_name` values?
10. Should the four unused turbo tasks (`watch`, `start`, `start:debug`, `start:prod`) be deleted,
    or are they a deliberate escape hatch for a hand-typed command?
11. Should `test:e2e` and `apps/backend/test/app.e2e-spec.ts` be deleted, or is an E2E suite
    planned that would make them live again?
12. Should `.tool-versions` become the single source that CI and the Dockerfiles read, or is the
    duplication accepted as the price of a self-contained Dockerfile?
13. Should the workspace adopt a pnpm `catalog:` for the eight versions declared identically in
    three or four manifests (eslint, typescript, the eslint config, zod, vitest, globals, rxjs)?
14. Does Dependabot's npm ecosystem already cover the workspace members from `directory: /`? If
    not, should `directories` be widened?
15. Should `docs/architecture/monorepo.md` and its three sub-pages be corrected as part of this
    feature, or does documentation drift take its own task?
