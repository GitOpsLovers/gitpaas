# The research of the backend — complexity reduction

Scope: `apps/backend/src` alone. No file of `apps/` changed. The audit measures the code against
`.claude/rules/agent-rules.md`, `docs/architecture/backend/structure.md` and
`docs/architecture/backend/conventions.md`.

---

## 1. What the backend does today, and where

### The shape

`apps/backend/src` holds 14 116 lines over 283 non-test files, plus 186 spec files.

- `core/` — the structural elements. Four layers of its own: `application/` (2 use cases),
  `domain/{constants,dtos,errors,models,ports}`, `infrastructure/{config,crypto,database,docker,logging,redis,telemetry}`,
  `ui/{filters,middlewares,pipes,translators}`. It exports `DockerContainerRuntimeAdapter`,
  `NestLoggerAdapter`, `RedisConnection`, `SecretCipherAdapter`, `StdoutTelemetryWriterAdapter`
  (`core/core.module.ts:41-47`) and it is `@Global()`.
- `shared/` — eight files only: two use cases (`get-gitpaas-labels`, `get-service-slug`), one port
  (`password-hasher.port.ts`), one adapter (`argon2-password-hasher.adapter.ts`) and
  `shared.module.ts`.
- `features/` — twelve features: `authentication`, `containers`, `deployments`, `logs`,
  `namespaces`, `networks`, `projects`, `providers`, `server`, `service-environment`, `services`,
  `users`.

### The dependency direction — clean

This is the strongest result of the audit. A grep for an outward import returned nothing:

- No file under `features/*/domain` or `features/*/application` imports `infrastructure/` or `ui/`.
- No file of `core/` imports `@features/`.
- No `@nestjs` import exists in any `domain/` or `application/` folder. The two `@nestjs` imports of
  `shared/` sit in `shared/shared.module.ts` and `shared/infrastructure/security/argon2-password-hasher.adapter.ts`,
  where they belong.

Every use case that I read is a pure exported function that takes each collaborator as a positional
parameter (`features/deployments/application/run-deployment.use-case.ts:66-76`,
`features/containers/application/get-containers-by-service.use-case.ts:16-20`). I found no
`@Injectable()` use case.

### The wiring

`app.module.ts:29-60` imports `CoreModule`, `ScheduleModule`, `ThrottlerModule` and the twelve
feature modules. `app.module.ts:63-72` registers `AppService`, `AllExceptionsFilter` as `APP_FILTER`
and `ThrottlerGuard` as `APP_GUARD`. `AuthenticationModule` adds `JwtAuthGuard` as a second
`APP_GUARD` (`features/authentication/authentication.module.ts:46-49`).

Two module cycles exist, resolved with `forwardRef`: `services ↔ deployments`
(`features/services/services.module.ts:20` and `features/deployments/deployments.module.ts:24`).

### The size, by feature

`providers` 2 677 lines, `deployments` 2 124 lines, `authentication` ~1 214 lines, `logs` ~1 000
lines. The four largest files:

| File | Lines |
|---|---|
| `features/deployments/infrastructure/docker/docker-executor.adapter.ts` | 321 |
| `core/ui/filters/all-exceptions.filter.ts` | 296 |
| `features/deployments/infrastructure/docker/compose-recipe.transformer.ts` | 287 |
| `features/providers/ui/controllers/providers.controller.ts` | 277 |

### The tests

186 specs against 283 files. By layer: `application/` 59 specs for 60 files (near total),
`infrastructure/` 46 for 59, `ui/` 40 for 43, `domain/` 8 for 63 (the domain is mostly types, so
this is expected). Every feature carries specs; the thinnest is `users` with 5.

---

## 2. The findings

Ordered by the value returned for the effort taken.

### F1 — `containers` and `networks` are the same feature twice (High value, small change)

`features/networks/` and `features/containers/` are byte-identical modulo the noun. A `diff` of the
two ui services after renaming the noun returns **zero lines**. A `diff` of the two controllers
returns three lines, of which one is a trailing period in a message
(`features/containers/ui/controllers/containers.controller.ts:34` ends the sentence with `.`,
`features/networks/ui/controllers/networks.controller.ts:34` does not). A `diff` of the two Docker
repositories returns one behavioural line: `listContainers(selector, true)` versus
`listNetworks(selector)`.

Every pair repeats:

- `features/containers/ui/services/containers.service.ts:1-33` ↔ `features/networks/ui/services/networks.service.ts:1-33`
- `features/containers/ui/controllers/containers.controller.ts:1-39` ↔ `features/networks/ui/controllers/networks.controller.ts:1-39`
- `features/containers/application/get-containers-by-service.use-case.ts:16-28` ↔ `features/networks/application/get-networks-by-service.use-case.ts:16-28`
- `features/containers/infrastructure/docker/docker-containers.repository.ts:19-27` ↔ `features/networks/infrastructure/docker/docker-networks.repository.ts:19-27`
- `features/containers/domain/repositories/containers.repository.ts` ↔ `features/networks/domain/repositories/networks.repository.ts`
- the two `ui/transformers/*-response.transformer.ts`, and the six spec files of each side.

**Cost of keeping it:** every change to the "runtime resources of a service" road is made twice, and
the drift already started (the trailing period, the `true` argument). Two business pages
(`docs/business/containers.md`, `docs/business/networks.md`) describe the same road with different
words.

**Size of the change:** medium. Roughly 30 files. Either merge them into one feature with two
resources, or keep two features and share nothing (accept the copy as a deliberate decision).

### F2 — The `run<T>` telemetry wrapper is copied in four adapters (High value, small change)

The exact same 15-line private method exists four times:

- `core/infrastructure/docker/docker-container-runtime.adapter.ts:144-159` (`'docker'`)
- `features/deployments/infrastructure/docker/docker-executor.adapter.ts:306-321` (`'docker'`)
- `features/logs/infrastructure/redis/redis-log-store.adapter.ts:193-208` (`'redis'`)
- `features/providers/infrastructure/github/github-provider-client.adapter.ts:154-169` (`'github'`,
  the only one that maps the error, with `throw toProviderClientError(error)`)

All four call `recordDependencyCall` from `core/infrastructure/telemetry/telemetry-deps.ts:12`.

**Cost of keeping it:** a change of the telemetry of a dependency call is a four-file change, and
one of the four will be forgotten.

**Size of the change:** small. One exported function
`withDependencyCall(name, operation, mapError?)` next to `recordDependencyCall`, and four call
sites deleted. No behaviour changes.

### F3 — The telemetry emission block is copied between the middleware and the deployment runner (High value, small change)

`core/ui/middlewares/telemetry.middleware.ts:60-88` and
`features/deployments/ui/services/deployment-runner.service.ts:166-183` hold the same block: build
the event, call `shouldKeepTelemetryUseCase(event, slowMs, sampleRate, Math.random())`, and emit
with `'sampling.kept_reason'` and `'sampling.rate'` when kept. The constant
`NANOSECONDS_PER_MILLISECOND = 1_000_000` is declared twice
(`core/ui/middlewares/telemetry.middleware.ts:17` and
`features/deployments/ui/services/deployment-runner.service.ts:41`), and the two-line read of
`TELEMETRY_SLOW_MS` / `TELEMETRY_SAMPLE_RATE` from `ConfigService` is declared twice
(`telemetry.middleware.ts:37-38`, `deployment-runner.service.ts:79-80`).

**Cost of keeping it:** the sampling policy of the HTTP road and of the deployment road can drift
apart silently, and a background job added later becomes a third copy.

**Size of the change:** small. One `emitTelemetryEvent(writer, event, slowMs, sampleRate)` helper in
`core/`, and one shared constant.

### F4 — `deployment-runner.service.ts` holds two jobs (High value, medium change)

`features/deployments/ui/services/deployment-runner.service.ts` (221 lines) does the queue work —
subscribe, group by project, run, mark processing/completed/failed (lines 88-158) — **and** the
telemetry work — open the scope, time the run, build the error fields, decide the sampling, emit
(lines 124-183, plus `buildErrorFields` at 194-207 and `resolveMessage` at 217-219). It injects
twelve collaborators (lines 56-81), of which four exist only for the telemetry job
(`StdoutTelemetryWriterAdapter`, `NestLoggerAdapter`, `ConfigService`, and the two config fields).

This file is large because it holds two jobs, not because the domain is large.

**Cost of keeping it:** the runner cannot be tested without a telemetry writer, and a change of the
retry policy reads past 60 lines of telemetry code.

**Size of the change:** medium. Extract the telemetry job into a wrapper that F3 already needs.

### F5 — `core/ui/translators/http-error.translator.ts` centralises every feature's error codes (High value, medium change)

`core/ui/translators/http-error.translator.ts:25-55` holds a map of 26 string codes to HTTP
exceptions. Each code belongs to one feature (`NAMESPACE_NOT_FOUND`, `PROVIDER_RATE_LIMITED`,
`VARIABLE_NAME_TAKEN`…), and every feature that adds an error must edit a file of `core/`.

I verified the map: every one of the 26 codes has exactly one defining `*.errors.ts` under
`features/`, so no entry is dead. Two codes are defined and **not** mapped:

- `UNAUTHENTICATED` (`features/authentication/domain/errors/authentication.errors.ts:35`) — used as
  a `cause` only (`features/authentication/ui/guards/jwt-auth.guard.ts:80`), so it never reaches
  `translateError`. Correct today.
- `VARIABLE_NOT_DECRYPTABLE` (`features/service-environment/domain/errors/service-variable.errors.ts:26`) —
  raised in `features/service-environment/application/get-service-environment.use-case.ts:32`, whose
  only caller is `features/deployments/application/run-deployment.use-case.ts:88`, a background road
  with no HTTP edge. Correct today, but it would become a bare 500 the day an HTTP route calls it.

The coupling is confirmed; the two unmapped codes are **not** a bug today.

**Cost of keeping it:** `core/` knows the name of every business error of every feature. The map is
untyped (a typo in a code silently falls through to `return error`, which the filter turns into a
500).

**Size of the change:** medium. Either carry the HTTP status on the `DomainError` subclass, or let
each feature register its own translations. Both change many files, but each change is mechanical.

### F6 — Three different not-found patterns in the controllers (Medium value, small change)

`docs/architecture/backend/conventions.md` names the canonical pattern (throw the domain error in
the use case, `translateError` in the controller) and admits two deviations. The reality holds
three patterns:

1. Canonical — `features/projects/ui/controllers/projects.controller.ts` (per the doc).
2. Build the domain error in the controller — `features/namespaces/ui/controllers/namespaces.controller.ts:43,64,89`
   and `features/providers/ui/controllers/providers.controller.ts:70,188,214`
   (`throw translateError(new XNotFoundError(id))`). The doc names `namespaces` only; `providers`
   does the same and the doc does not say so.
3. Raw `NotFoundException` with no domain error —
   `features/services/ui/controllers/services.controller.ts:46,78,92` and
   `features/deployments/ui/controllers/deployments.controller.ts:52,91`. The doc names `services`
   only; `deployments` does the same and the doc does not say so.

**Cost of keeping it:** a reader must check the pattern of each feature; the message of a 404 is
built in two places.

**Size of the change:** small per controller, five controllers.

### F7 — `logs.module.ts` re-provides two repositories that other modules already own (Medium value, small change)

`features/logs/logs.module.ts:20-29` registers `DbPlatformSettingsEntity` and `DbDeploymentEntity`
in its own `forFeature`, and lists `DatabaseDeploymentsRepository` and
`DatabasePlatformSettingsRepository` in its own `providers`. Both classes are already providers of
their owning modules (`features/deployments/deployments.module.ts:32`,
`features/server/server.module.ts:27`). Nest therefore builds **two instances** of each class.

The copy exists to dodge a module cycle (`services → deployments → logs`), so it is a workaround and
not an oversight.

**Cost of keeping it:** two instances of the same repository, and a reader who cannot tell which one
a given consumer holds. The day a repository holds a cache, the two disagree.

**Size of the change:** small — import `DeploymentsModule` and `ServerModule` with `forwardRef` —
but it touches the cycle, so it carries a real risk of a boot failure. Verify with a start of the
application.

### F8 — Three exported providers that no consumer outside the feature uses (Medium value, tiny change)

Verified by a whole-repository grep for each symbol:

- `features/providers/providers.module.ts:32` exports `DatabaseProviderRegistrationsRepository`. Its
  only consumers are `features/providers/ui/services/providers.service.ts` and
  `features/providers/ui/jobs/remove-expired-provider-registrations.job.ts` — both inside the
  feature.
- `features/deployments/deployments.module.ts:37` exports `DatabaseDeploymentQueueAdapter`. Its only
  consumers are `deployment-runner.service.ts` and `deployments.service.ts` — both inside the
  feature.
- `features/authentication/authentication.module.ts:51` writes `exports: [UsersModule]`. Nothing
  imports `AuthenticationModule` except `app.module.ts`, so the re-export reaches nobody.
- `features/users/users.module.ts:16` exports `TypeOrmModule`. I found no consumer that injects a
  `Repository<DbUserEntity>` outside `users`.

**Cost of keeping it:** the public surface of a module is larger than its real contract, and a
future feature will inject a class that the owner never meant to publish.

**Size of the change:** tiny — delete four lines and start the application.

### F9 — `features/providers/` holds three sub-domains in one feature (Medium value, large change)

The feature is 2 677 lines. It is large because it carries three distinct jobs, not because one
domain is large:

1. **The provider record** — CRUD and credentials. `providers.controller.ts:56-219`,
   `db-providers.repository.ts`, `provider.errors.ts`, `create/update/delete/find/get-all` use cases.
2. **The registration of a GitHub App** — a four-step manifest flow, roughly 790 lines:
   `provider-registration.models.ts` (134), `db-provider-registrations.repository.ts` (104),
   `start-provider-registration.use-case.ts` (101), `complete-provider-registration.use-case.ts` (72),
   `provider-registrations.repository.ts` (59), `db-provider-registrations.transformer.ts` (58),
   `convert-provider-registration.use-case.ts` (49), `db-provider-registration.entity.ts` (43),
   `provider-registration.errors.ts` (40), `get-active-provider-registration.use-case.ts` (37),
   `remove-expired-provider-registrations.job.ts` (36), `provider-registration.constants.ts` (30),
   `provider-registration-response.transformer.ts` (25). Its three routes sit at
   `providers.controller.ts:99-160`.
3. **The browsing of Git** — repositories and branches. `providers.controller.ts:223-276`,
   `list-repositories.use-case.ts`, `list-branches.use-case.ts`, `git-repository.models.ts`,
   `git-branch.models.ts`.

`ProvidersService` (233 lines) serves all three, and repeats
`await getProviderCredentialsUseCase(this.repository, id)` three times
(`providers.service.ts:141, 153, 167`).

`providers.service.ts:64-71` also derives three URLs from `APP_BASE_URL` inside the constructor —
policy that belongs in `application/` or `domain/`, not in a `ui/` service.

**Cost of keeping it:** the largest feature of the backend has the largest controller and the
largest service, and a task about a branch list reads a registration flow.

**Size of the change:** large. Splitting the registration into its own feature moves ~13 files and
touches `app.module.ts` and `deployments.module.ts`.

### F10 — `server` owns the platform settings, and `logs` reaches across for them (Medium value, medium change)

`features/server/` holds four jobs: the readiness and the status
(`server.controller.ts:38-74`), the pruning (`:75-107`), the removal of the orphans (`:108-118`) and
the platform settings (`:119-150`). The settings are the retention of the logs, so `logs` must reach
into `server`:

- `features/logs/logs.module.ts:13-14, 20, 26`
- `features/logs/ui/jobs/remove-expired-logs.job.ts:11-12`
- `features/logs/application/remove-expired-logs.use-case.ts` imports
  `@features/server/application/get-platform-settings.use-case` and
  `@features/server/domain/repositories/platform-settings.repository`.

This is the only application-layer cross-feature import that crosses into a *different* business
domain rather than a parent one. (The other cross-feature application imports —
`containers → services`, `networks → services`, `deployments → services|providers|service-environment`,
`logs → deployments` — all follow a real containment relation and are legitimate.)

**Cost of keeping it:** the retention rule of the logs lives in the feature of the server.

**Size of the change:** medium. Either move the settings into their own feature, or accept the
coupling and write it down.

### F11 — The CRUD repository body repeats in five features (Low value, medium change, do not fix blindly)

`findById`, `update` and `delete` are the same eight lines in
`features/namespaces/infrastructure/database/db-namespaces.repository.ts:36-70`,
`features/projects/infrastructure/database/db-projects.repository.ts:33-79`,
`features/services/infrastructure/database/db-services.repository.ts:34-77`,
`features/deployments/infrastructure/database/db-deployments.repository.ts:51-110` and
`features/service-environment/infrastructure/database/db-service-variables.repository.ts:40-102`.

But the differences are real, not accidental: `services` wraps `create`/`update` in a `try` and
calls `toServicePersistenceError` (`db-services.repository.ts:44-71`); `namespaces` adds
`countProjects` with a raw SQL constant (`:16, :72-79`); `service-environment` splits `getByService`
from `getStoredByService`; `providers` adds `getCredentials` and `countServices`.

**Cost of keeping it:** about 120 duplicated lines, and five identical `(result.affected ?? 0) > 0`.

**Size of the change:** medium, and the risk outweighs the gain. A generic base repository would
hide the transformer call and the port shape, which the conventions make explicit on purpose.
Recommend leaving it, or sharing only the trivial `affected` check.

### F12 — Naming and placement drift (Low value, tiny change)

- `features/providers/application/find-missing-provider-permissions.ts` — in `application/` but not
  a `*.use-case.ts`. It is a pure helper over
  `domain/constants/provider-permissions.constants.ts`, so it belongs in `domain/utils/` per
  `structure.md:62-63`.
- `features/logs/infrastructure/redis/redis-log-reader.ts` (241 lines) — carries no convention
  suffix (`.adapter.ts`, `.repository.ts`, `.transformer.ts`, `.util.ts`). Its content is cohesive
  (one job: read a live stream, fall back to the archive), so it is large because the domain is
  intricate, not because it holds two jobs. Only the name is wrong.
- `features/deployments/infrastructure/docker/compose-recipe.transformer.ts` — named
  `.transformer.ts`, but only two of its exports build a value (`recipeServices`, `resolveBuild`);
  `normalizeHealthchecks:233`, `stampLabels:253` and `injectEnvironment:276` **mutate the compose
  object in place** and return `void`. The conventions say a transformer exports `to<Model>`
  functions. This file is a util set. It is large because the compose format is large (it declares
  seven shapes at lines 9-59 to cover the list-or-map forms), not because it holds two jobs.
- `features/deployments/domain/ports/deployment-queue.port.ts:9` declares `MAX_ATTEMPTS` inside the
  port file; `structure.md` puts a policy constant in `domain/constants/`.
- `features/users/ui/services/users.service.ts` imports
  `'@features/users/domain/repositories/users.repository'` — an alias into its own feature, where
  the conventions require a relative path.
- `features/server/ui/services/server.service.ts:39` types the pruner as the concrete
  `DockerServerPrunerAdapter` while `features/server/domain/ports/server-pruner.port.ts` exists.
  Every other field of the same constructor uses the port type (`:40-51`). A one-line fix.

### F13 — One dead export and a set of test-only exports (Low value, tiny change)

- `features/providers/ui/transformers/provider-registration-response.transformer.ts:12` —
  `toProviderRegistrationResponse` has exactly one reference in the repository, its own spec. Dead
  in production.
- `resetServiceVersionCache` (`core/infrastructure/telemetry/resolve-service-version.ts:86`),
  `toNanoseconds` and `normalizeBuildArgs` (`compose-recipe.transformer.ts:157, 189`) are exported
  for the tests and used only inside their own file. Acceptable, but worth noting.

I ran a whole-source sweep for exported symbols with no consumer outside their own file: apart from
the entry above, every hit was a type used one line below its declaration (`ContainerPort`,
`ProviderConnectionOutcome`, `RuntimeProgressEvent`, `PROVIDER_TYPES`, `SequencedLogEvent`,
`DockerLabelFilter`, `EnvironmentVariables`, `currentUserFactory`). They are over-exported, not
dead.

### F14 — `all-exceptions.filter.ts` is 296 lines of fourteen private methods (Low value, medium change)

`core/ui/filters/all-exceptions.filter.ts` holds `catch:30`, `buildEnvelope:55`, `extractCode:96`,
`extractDetails:115`, `extractMessage:137`, `extractError:163`, `statusName:182`,
`resolveStack:204`, `resolveCauseChain:229`, `resolveType:254`, `resolveMessage:269`,
`enrichWithError:283`. Every one of them is a pure function of its arguments; only `catch` needs
`this.httpAdapterHost`.

It is large because the job is large (one envelope for every kind of thrown value), but eleven pure
functions sit inside a class for no reason. Moving them to a sibling
`core/ui/translators/error-envelope.translator.ts` would leave a filter of ~40 lines and make each
rule testable without a `ArgumentsHost`.

### F15 — `app.controller.ts` / `app.service.ts` duplicate the readiness road (Low value, tiny change)

`app.controller.ts:20-24` serves `GET /` with `AppService.getHealth()`, which returns the literal
`{ status: 'ok' }` (`app.service.ts:17-19`). `features/server/ui/controllers/server.controller.ts:38-40`
serves `GET server/readiness` with a real probe of Postgres and of Docker
(`features/server/application/check-readiness.use-case.ts`). Two health roads, one of which proves
nothing. Confirm against `docs/business/server.md` before removing either.

---

## 3. The options and their cost

### Option A — The cheap sweep (F2, F3, F8, F12, F13, and the F6 alignment)

Take the findings whose change is small and whose risk is near zero: the four copies of `run<T>`,
the two copies of the telemetry emission, the four useless exports, the naming drift, the dead
transformer, and one not-found pattern for all five controllers.

- **Cost:** roughly one phase. About 25 files, each change mechanical. The tests of the affected
  features cover the code already.
- **Gain:** ~150 duplicated lines removed, and the four conventions of `conventions.md` hold again.
- **Risk:** low. F8 needs a start of the application to prove the container still resolves.
- **What it does not fix:** the two large features stay large.

### Option B — The cheap sweep, plus the two structural cuts (A + F1 + F4 + F7)

Add the merge (or the deliberate separation) of `containers` and `networks`, the split of the
telemetry job out of the deployment runner, and the removal of the duplicated providers of
`logs.module.ts`.

- **Cost:** two or three phases. F1 alone touches ~30 files and two business pages. F7 touches a
  module cycle.
- **Gain:** one whole duplicated feature gone, the runner testable, one instance of each repository.
- **Risk:** medium. F7 can break the boot; F1 changes route ownership, so
  `docs/business/containers.md` and `docs/business/networks.md` must still be true word for word.
- **What it does not fix:** `providers` stays at 2 677 lines, and `core/` still knows every error
  code.

### Option C — Everything, including the redistribution (B + F5 + F9 + F10 + F14)

Add the removal of the central error map, the split of `providers` into the record, the registration
and the browsing, the move of the platform settings out of `server`, and the extraction of the
envelope builder.

- **Cost:** four or five phases. F5 and F9 each touch every feature or every file of one feature.
- **Gain:** the largest feature drops by ~30 %, `core/` stops holding business knowledge, and each
  feature owns its own HTTP mapping.
- **Risk:** high for F5 — it changes how every error becomes a status code, and every status code is
  a rule of a business page. A silent regression here is invisible until a client sees a 500.
- **Note:** F9 and F10 both create a new feature folder. `TODO.md` forbids over-engineering; the
  orchestrator must judge whether the split removes real duplication or only moves files.

### The option that I do not recommend

F11 (a shared base repository). The five repositories look alike, but each one carries a real
difference — a persistence error map, a count query, a stored/decrypted split. A base class would
hide the transformer call, which `conventions.md` requires to be visible.

---

## 4. What the user must decide

1. Do `containers` and `networks` become one feature, or do they stay two features that we accept as
   copies? (F1)
2. If they merge, what is the name of the merged feature, and what happens to the two business
   pages `docs/business/containers.md` and `docs/business/networks.md`?
3. Is the trailing period of the daemon message
   (`containers.controller.ts:34` versus `networks.controller.ts:34`) a rule of the business, or an
   accident that a merge may unify?
4. Does the registration of a GitHub App leave `providers` and take its own feature folder, or does
   the size of `providers` stay as it is? (F9)
5. Does `core/ui/translators/http-error.translator.ts` keep the central map, or does the HTTP status
   move onto the `DomainError` subclass of each feature? (F5)
6. Do the platform settings leave `server` and take their own feature, so `logs` stops reaching
   across? (F10)
7. Do we accept a `forwardRef` between `logs`, `deployments` and `server` in order to delete the
   duplicated providers of `logs.module.ts:25-26`, or do we keep the second instance? (F7)
8. Which not-found pattern becomes the single one — the domain error thrown in the use case, as
   `conventions.md` states — and do we then update `conventions.md`, which names only two deviations
   while the code holds four? (F6)
9. Does `GET /` (`app.controller.ts:21`) stay, now that `GET server/readiness` probes the real
   dependencies? Check `docs/business/server.md` before answering. (F15)
10. `features/service-environment/` has no page under `docs/business/`. Is that a gap to fill before
    the refactor starts, so a change to that feature can be proved not to break a rule?
11. Does the sweep of Option A run as one phase, or does each finding take its own Pull Request?

---

## Not covered

- `packages/contracts/` — I listed its twelve folders and `index.ts` but read no schema, so I make no
  claim about duplication between a Zod schema and a domain model.
- `apps/backend/test/` (the E2E configuration and the stubs) — not read.
- `core/infrastructure/config/`, `core/infrastructure/database/` and `core/infrastructure/logging/`
  — read only at the level of the file list and the module wiring.
- `features/authentication/` — read at the level of the file list, the module, the cross-feature
  imports and the guards. I did not read `authentication.service.ts` (102 lines) or the two Passport
  strategies line by line, so F-numbers hold no finding of that feature beyond its wiring.
- `features/logs/infrastructure/redis/redis-log-reader.ts` — read to line 120 of 241.
- `docs/business/` — I listed the thirteen pages and checked which features they cover. I did **not**
  compare a rule against the code, because this feature changes no behaviour. Any refactor of
  Option B or C must do that comparison before it lands.
