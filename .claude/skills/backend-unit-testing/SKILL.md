---
name: backend-unit-testing
description: Enable this skill when the user requests to work with the testing layer of the backend application.
---

# Backend unit testing skill

Conventions for `apps/backend` unit specs. Runner: **Jest + ts-jest** (`apps/backend/jest.config.js`).

The backend is layered (`domain/` → `infrastructure/` → `ui/`, with `application/` use cases). Each SUT type has its own construction and assertion rules. **Read the Common conventions first — they apply to every spec — then jump to your SUT type's section.**

---

## Common conventions

Apply to **all** specs; type-specific sections reference these instead of repeating them.

- **Mock ports/collaborators as value providers:** `{ provide: <class>, useValue: <mock> }`, structurally mocked with `jest.fn()`. Keep mocks tight — type via `jest.Mocked<Pick<T, 'usedMethod'>>` (preferred), exposing only the methods the SUT calls so the compiler flags drift when it starts calling something new; fall back to `jest.Mocked<T>` or `{} as jest.Mocked<T>` only when necessary.
- **`jest.clearAllMocks()` is the first statement of `beforeEach` in every spec** — resets call history and configured returns so nothing leaks.
- **Spy-based specs also restore:** any spec using `jest.spyOn` does BOTH `clearAllMocks()` first in `beforeEach` AND `jest.restoreAllMocks()` in `afterEach` to detach spies and restore originals — `clearAllMocks` alone does not undo a `spyOn`. See `diagnostic-logger.service.spec.ts`.
- **`it` names read as a behavior contract:** `delegates…`, `returns…`, `propagates…`, `throws…`.
- **Spec-local helpers/fixtures are `const` arrow expressions, not `function` declarations** — factories, async-flush helpers, `run(...)` wrappers alike. Arrows don't hoist, so declare before first use (watch for TDZ errors when converting a hoisted `function`).
- **Class-instance SUTs are always named `sut`** (never the real class name). Function SUTs (use cases, extracted decorator factories) are the exception — invoke them by their imported name, no `sut` alias.
- **Path aliases work in specs:** `@core/*` / `@features/*` resolve via `moduleNameMapper` in `jest.config.js`.

**Naming.** `mock`-prefix (camelCase) on every mocked collaborator, all layers: `mockServicesService`, `mockDeploymentsRepository`. Use-case function mocks use `mock<UseCaseName>` (e.g. `mockGetDeploymentsByServiceUseCase`) — not a `…Mock` suffix.

**Where to declare a mock — module `const` vs. `beforeEach`.** Stateful mocks → `let` at `describe` scope, recreated in `beforeEach`. Stateful = its `jest.fn()`s accumulate asserted call history (`toHaveBeenCalledWith/Times`) or get per-test returns (`.mockResolvedValue`); recreating per test + `clearAllMocks()` guarantees isolation (e.g. `mockServicesService` in `services.controller.spec.ts`). Stateless placeholders → module-level `const` is fine (e.g. `const mockX = {} as unknown as X;`) — a DI-only dependency the SUT never calls has nothing to reset. Rule of thumb: the moment a placeholder is called or asserted on, move it to `let` + `beforeEach`.

**Mock a dependency through its real injection token** (import the real class): `Test.createTestingModule({ providers: [{ provide: RealClass, useValue: mockRealClass }] })`, or `.overrideProvider(RealClass).useValue(...)`. Mock only the methods the SUT calls; if it calls none, a minimal `{} as unknown as RealClass` through the real token is enough. **Anti-pattern:** redeclaring an empty local class as the token (`jest.mock('.../x.provider', () => ({ RealClass: class RealClass {} }))`) — bypasses real DI wiring and is not the [documented NestJS approach](https://docs.nestjs.com/fundamentals/testing).

**ESM-only third-party libs (`@octokit/*`) — stubbed centrally.** `@octokit/rest` / `@octokit/auth-app` (and transitive deps) are ESM-only; ts-jest compiles app imports to `require()`, and requiring untransformed ESM throws `SyntaxError: Cannot use import statement outside a module`. Any spec whose import graph transitively reaches them (e.g. via `github-app.provider`) hits this.

- **Fix: stubbed once, globally — never per spec.** `moduleNameMapper` in `apps/backend/jest.config.js` redirects each package to a hand-written stub under `apps/backend/test/stubs/` (e.g. `octokit-rest.stub.ts`, `octokit-auth-app.stub.ts`) exporting the used symbols as `jest.fn()`s. Because they are real `jest.fn()`s, specs need **no** `jest.mock('@octokit/...')` boilerplate and no empty-class stub of `github-app.provider`; a spec may import and assert on them directly (e.g. `expect(Octokit).toHaveBeenCalledWith(...)`), and `clearAllMocks()` resets them like any mock.
- **Adding a new ESM-only package that breaks tests:** add one `moduleNameMapper` entry plus a `test/stubs/` file exporting the used symbols as `jest.fn()`s. Do **not** add per-spec `jest.mock`.

**File placement.** Specs live in a `__tests__/` dir next to the SUT, named `<name>.spec.ts`. Exception: root `app.controller.spec.ts` / `app.service.spec.ts` sit directly beside the code.

**Run.** Scoped: `pnpm --filter backend test -- <spec-name>`. Full suite: `pnpm --filter backend test`. Never run ESLint, install deps, or run Playwright/E2E.

---

## Use case testing

Use cases in `application/` are **framework-agnostic pure functions** taking ports as arguments — no DI container, no HTTP boundary. Spec them with NestJS **isolated testing**: import the function, call it with fake ports, assert observable behavior. Reference specs: `create-log.use-case.spec.ts` (CRUD delegation), `refresh.use-case.spec.ts` (guards + error branches), `remove-orphaned-containers.use-case.spec.ts` (composition/mapping). Plus all Common conventions.

**Building the SUT.** Call the function directly with fake ports — never a testing module (no `Test.createTestingModule`, no value-providers, no `moduleRef.get`, no HTTP concerns); collaborators are plain **function arguments**, invoked by imported name (`createLogUseCase(...)`, `refreshUseCase(...)`), no `sut`. Canonical port mock: declare each port as `jest.Mocked<Pick<Port, 'onlyCalledMethods'>>` (object literal of `jest.fn()`s), then pass it at the call site with a single **`as unknown as Port`** cast (drop the older `as never`). The cast exists because ports arrive as plain args, not a typed DI token, so there's no provider machinery to accept the `Pick`; the mock variable stays fully typed, so the compiler still flags drift. Uniform regardless of method count (e.g. `refreshUseCase` casts all three ports this way); a full `jest.Mocked<Port>` is a rare fallback — prefer the tight `Pick`. **`clearAllMocks` carve-out:** with a `beforeEach`, `clearAllMocks()` stays its first statement; a spec that builds every fixture inline, shares no mutable state, and has **no `beforeEach`** need not add one just to hold the reset.

**What to assert** — only what a caller observes; no internals, no DI/HTTP verification.

- **Delegation:** each port method called **once** with exact args — `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith(...)`.
- **Return / mapping / composition:** `toBe(result)` for pass-through; `toEqual({...})` for a composed/mapped shape (e.g. `refreshUseCase` → `{ accessToken, refreshToken }`; `removeOrphanedContainersUseCase` mapping to compose-project names).
- **Edge cases:** `null` (`toBeNull()`), empty list (`toEqual([])`), empty input (port receives `[]`).
- **Error propagation is MANDATORY for CRUD-style use cases:** a `propagates errors…` test with `mockRejectedValue(error)` → `rejects.toThrow(error)` (or `.rejects.toBeInstanceOf(DomainError)` for a translated error).
- **Guards / short-circuits:** on a guarded branch, assert the downstream port/sibling is **not** reached — `expect(mockPort.method).not.toHaveBeenCalled()` (e.g. `refreshUseCase` never calls `revoke` when verification fails or the record is missing).

**Composing use cases — mock the delegated sibling.** When a use case orchestrates **another** use case, mock the sibling and assert only this use case's orchestration (mirrors the Service-layer "always mock the delegated use case" rule; keeps structurally-identical orchestrations from drifting — see `refresh.use-case.spec.ts`). `jest.mock('<path>/<sibling>.use-case')`, type as `jest.MockedFunction<typeof siblingUseCase>`, name `mock<UseCaseName>`. Assert the sibling is called with the exact ports/args forwarded and that this use case returns the sibling's result unchanged; do **not** run the real sibling against a mocked repository (that tests the sibling). **Carve-out:** a trivial one-line pass-through wrapper (e.g. `loginUseCase` → `issueTokensUseCase`) may run the real sibling, since mocking yields a near-tautological test — reserve for genuine one-liners with no orchestration of their own.

---

## Infrastructure implementation testing

Infrastructure adapters/providers wrap external systems (SDKs, TypeORM, the Docker daemon) behind a domain port. Verify exactly the call + mapping boundary — never the real external system. Plus all Common conventions.

### External-API providers

External-API providers (`infrastructure/<provider>/*.provider.ts`, e.g. `github-app.provider.ts`) are Nest-provider adapters wrapping a third-party SDK client (e.g. `Octokit`) that is **lazily built and memoized**, authenticated via an auth strategy, exposing domain methods that map SDK responses into domain models. Verify exactly that endpoint/params + mapping boundary and the client-creation/auth wiring. Reference spec: `github-app.provider.spec.ts`.

**Building the SUT.** Plain instantiation — `new GithubAppProvider(mockConfig, mockDiagnostics)`, NOT a testing module (needs no DI wiring beyond its constructor collaborators). Collaborators come from `const` arrow factory builders: `createConfig(values)` returns a `ConfigService` stub whose `get` returns the seeded values; `createDiagnostics()` returns a no-op `DiagnosticLoggerService` stub. The fake SDK client is `mockClient`. The ESM-only SDK (`@octokit/*`) is globally stubbed (see Common) — reference the stubbed constructor directly (`const OctokitMock = Octokit as unknown as jest.Mock`). The SDK client is heavily overloaded, so a narrow hand-written `FakeClient` interface of `jest.Mock`s (`paginate`, `request`) is the pragmatic fallback over `jest.Mocked<Pick<Octokit, …>>`.

**What to assert — two-layer structure.** Split the spec into two `describe` layers: mapping isolated from the SDK, then creation/auth against the stubbed SDK.

- **Layer A — API method mapping (SDK isolated):** spy the private client-getter to hand back the fake client — `jest.spyOn(sut as unknown as { getClient(): unknown }, 'getClient').mockReturnValue(mockClient)` — so tests exercise pure endpoint/params + mapping + pagination + error logic with no real SDK (spying → apply the Common spy-reset pairing). Assert: each SDK call made with the EXACT endpoint + params (e.g. `paginate('GET /installation/repositories')`, `request('GET /repositories/{id}', { id })`); multi-step call ordering via `toHaveBeenNthCalledWith`; the domain-mapped result (`toEqual`); decode/transform steps (base64 file content, archive `Buffer`); and error translation (`NotFoundException` for non-file content) — parametrize related error cases with `it.each`. **Pagination:** assert the adapter delegates to the SDK's `paginate` helper with the endpoint + params and returns all items mapped; do NOT simulate real page-boundary fetching (the SDK's responsibility).
- **Layer B — client creation / auth wiring (real `createClient`, stubbed SDK constructor):** drive `createClient` through a real domain call and assert against the globally-stubbed `Octokit`. Assert: missing config → `ServiceUnavailableException` AND the SDK constructor **never** called (`expect(OctokitMock).not.toHaveBeenCalled()`); correct construction args (auth strategy + decoded/parsed secrets — e.g. base64-decoded private key, numeric installation id); and **memoization** (constructor called once across multiple domain calls).

### Infra clients

Infra clients (`docker.client`, `redis.client`) are **not** Nest providers. Reference specs: `redis.client.spec.ts`, `docker.client.spec.ts`. **Building the SUT:** plain instantiation (`new Client(config)`), and `jest.mock` the transport module (`dockerode`, `ioredis`). **What to assert:** the transport constructor is called with config-derived options; config fallbacks apply when env vars are absent.

### Repositories

Database repositories (`infrastructure/database/*-db.repository.ts`) are TypeORM adapters implementing a domain repository port. Each is a **thin single-collaborator adapter** over an injected `Repository<XxxDbEntity>`, delegating to `Repository` methods and mapping persistence entities into domain models via a `toXxx` transformer. Verify exactly that delegation + mapping boundary. Reference specs: `users-db.repository.spec.ts` (simplest read/create), `services-db.repository.spec.ts` (merge-update + delete), `deployments-db.repository.spec.ts` (field-mutation update), `refresh-tokens-db.repository.spec.ts` (`update` → `{ affected }`), `logs-db.repository.spec.ts` (bulk `createMany`).

**Building the SUT.** Plain instantiation — `const sut = new XxxDatabaseRepository(mockRepository as unknown as Repository<XxxDbEntity>)` in `beforeEach`, NOT a testing module; a single injected `Repository` needs no `getRepositoryToken`, and the structural mock is simpler and keeps the layer uniform. **Fallback:** if a repository ever injects more than the one `Repository`, switch to `Test.createTestingModule` with `getRepositoryToken(Entity)` value-providers. Mock the injected `Repository` as `mockRepository`, typed `jest.Mocked<Pick<Repository<XxxDbEntity>, '<only the methods the SUT calls>'>>`, `let` at `describe` scope, recreated fresh in `beforeEach`. Entity fixtures are `const` arrow helpers returning the Db entity type (`XxxDbEntity`, the shape TypeORM hands back) with a `Partial<XxxDbEntity>` overrides param; assert expected results as the mapped domain model.

**What to assert (per method).**

- **Reads** (`findOneBy` / `find` / `findOne`): the TypeORM method called once with the EXACT options object (`{ email }`, `{ where, relations, order }`, or the no-arg `find()`); result mapped to the domain model (`toEqual<Domain>({...})`); single-fetch **absent → `toBeNull()`**; list **empty → `toEqual([])`**.
- **Create:** `create` called with the input (including any DTO mutation the SUT performs — e.g. deployments injecting `status: 'pending'`), `save` called with the created entity, mapped result asserted. **Bulk create** (`createMany`): the DTO array is passed straight through `create` and `save`. **Overloaded `create`/`save` typing:** TypeORM's `Repository.create` (`create(entityLike): Entity` and `create(entityLikeArray): Entity[]`) and `Repository.save` (`save(entity): Promise<Entity>` and `save(entities): Promise<Entity[]>`) are overloaded identically. Under `jest.Mocked<Pick<Repository<Entity>, 'create' | 'save' | …>>` each overload set collapses to the single-entity signature, so single-entity stubs type cleanly, but array-returning bulk stubs must localize a cast: `(mockRepository.create as jest.Mock).mockReturnValue(entities)` and `(mockRepository.save as jest.Mock).mockResolvedValue(entities)`. Keep single-entity stubs fully typed; do NOT broaden the mock's declared type — the cast stays localized to the bulk stubs. Reference spec: `logs-db.repository.spec.ts`.
- **Update** (find → `merge` → save, or find → direct field-mutation → save as in deployments, including terminal-status setting `finishedAt`): find called, merge/mutation applied, `save` called with the merged entity, mapped result; preserve the not-found branch (returns `null`, `merge`/`save` not called).
- **`delete` / `update` returning `{ affected }`:** the three uniform cases — `affected: 1` → `true`/count, `0` → `false`/0, `undefined` (`{}`) → `false`/0. When typing the mock, the `{ affected }` stub may need the full `UpdateResult` / `DeleteResult` shape (`raw`, `generatedMaps`) to satisfy the `jest.Mocked<Pick<...>>` typing.
- **Mapping:** assert the mapped domain shape wherever the SUT runs a `toXxx` transformer; where a method returns the raw persistence entity, assert that actual shape — don't assume mapping.

**Not currently present.** QueryBuilder chains, `manager.transaction`, and `upsert` do not occur in the current DB repositories, so the convention above targets the plain `Repository`-method style. Add a QueryBuilder/transaction pattern here only if and when a repository adopts one — do not invent one now.

_TODO: repository sub-topics (QueryBuilder / transaction / upsert conventions) if adopted._

### Docker repositories

Docker repositories (`infrastructure/docker/*.repository.ts`) are adapters over the shared `DockerClient` wrapper: each calls `this.client.getClient()` to obtain a `dockerode` `Docker` handle, invokes daemon operations on it, and maps results into domain models. They list/prune/tear-down resources scoped by the `com.docker.compose.project` label. Verify exactly that daemon-call + map/teardown boundary. Reference specs: `docker-containers.repository.spec.ts` and `docker-networks.repository.spec.ts` (list + map), `docker-server-pruner.repository.spec.ts` (prune → `PruneResult`), `docker-service-footprint.repository.spec.ts` (teardown: list + nested per-id `remove`, error resilience), `docker-orphan-containers.repository.spec.ts` (teardown: known-project skip, per-removal error resilience). `DockerClient` itself — including the daemon/cert `ServiceUnavailableException` on a missing handle — is tested separately as an infra client (see Infra clients); the Docker *repositories* assume a live handle and never re-test that failure.

**Building the SUT.** Plain instantiation — `const sut = new DockerXxxRepository(mockDockerClient[, mockDiagnostics])` in `beforeEach`, NOT a testing module. Mock the injected `DockerClient` as `mockDockerClient`, typed `jest.Mocked<Pick<DockerClient, 'getClient'>>`, whose `getClient` is a `jest.fn()` returning a **mocked `dockerode` handle** typed `jest.Mocked<Pick<Docker, '<only the daemon methods the SUT calls>'>>` (e.g. `listContainers`, `listNetworks`, `listImages`, `pruneImages`/`pruneVolumes`/`pruneContainers`, `getContainer`/`getNetwork`/`getImage`), cast `as unknown as Docker` when returned. Use a **type-only import** of `Docker` (`import type Docker from 'dockerode'`) — no spec imports `dockerode` at runtime. `mock`-prefix every collaborator and hoisted daemon-op mock: `mockDockerClient`, `mockDiagnostics` (`jest.Mocked<Pick<DiagnosticLoggerService, 'log' | 'warn'>>`), and each daemon op as its own `jest.Mock` — `mockListContainers`, `mockPruneImages`, `mockRemove`, `mockGetContainer`, etc.; `let` at `describe` scope, recreated fresh in `beforeEach`. **Nested per-id handle stubbing:** `getX(id)` returns a resource handle, so stub `mockGetContainer = jest.fn().mockReturnValue({ remove: mockRemove })` (same for `getNetwork`/`getImage`); for distinct handles per id, use `mockReturnValueOnce`/`mockImplementation((id) => …)`. Fixtures are `const` arrow builders returning the dockerode response type — `containerInfo(overrides): Docker.ContainerInfo`, `networkInfo(overrides): Docker.NetworkInspectInfo`, prune-info builders returning `Docker.Prune*Info`; a minimal inline literal is fine for a genuine one-off (e.g. an empty `{}` prune response).

**What to assert.**

- **list + map** (containers/networks): the list method called **once** with the EXACT args (the `com.docker.compose.project` label filter, `all: true` where used); result mapped to the domain model (`toEqual`); empty list → `toEqual([])`; the name/port/short-id/`createdAt` fallbacks and the compose-project `service-<id>` slug fallback when the service name slugifies to empty.
- **prune** (pruner): each `prune*` called; `{ XDeleted, SpaceReclaimed }` mapped to the `PruneResult` shape; both the populated case AND the empty/undefined-response fallback (counts/space defaulting to 0).
- **teardown** (footprint/orphans): list called with the right filters; the nested `getX(id).remove(...)` called with the right options (`{ force: true, v: true }`, `{ force: true }`, etc.); the known-project skip (`getX` not called, count/names stay empty); returned counts/names; the summary log. Plus the **error-resilience branches** — a single resource/removal failure is caught, `mockDiagnostics.warn` is called, and iteration continues (assert the survivor); footprint's "daemon unreachable while listing" branch resolves and warns once per list op. Daemon/cert unavailability itself is a `DockerClient` concern, not re-tested here.

**`COMPOSE_PROJECT_LABEL` / slug helper are private, duplicated consts.** The `COMPOSE_PROJECT_LABEL` string and the `composeProjectName` slug helper are currently **private, duplicated consts inside each Docker SUT with no shared export**, so specs **re-declare the label locally** (see `docker-orphan-containers.repository.spec.ts`). If they are ever extracted to a shared exported module, specs should import the real symbols rather than re-declare them.

### Docker executors

Docker executors (`infrastructure/docker/*.executor.ts`) are **I/O-bound infrastructure orchestrators** that drive `dockerode` + `dockerode-compose` + `tar`/`node:fs` to build/pull/run a stack, streaming progress. Each injects `DockerClient` (→ `getClient()` daemon handle) and `DiagnosticLoggerService`, and keeps its logic almost entirely in **private helpers** behind a single public `up()` orchestration. Reference spec: `dockerode-docker.executor.spec.ts`.

**Building the SUT.** Plain instantiation — `new DockerodeDockerExecutor(mockDockerClient, mockDiagnostics)`, NOT a testing module. Use a `const` arrow builder (e.g. `executorWithDaemon(fakeDaemon)`) returning a `sut` backed by a **fake daemon exposing only the members a given test needs** (`buildImage`, `pull`, `modem.followProgress`, container `inspect`/`logs`) via `mockDockerClient.getClient()`, plus a `mockDiagnostics` logger stub. Module-mock the external I/O libs — `jest.mock('node:fs/promises')`, `jest.mock('tar')`, `jest.mock('dockerode-compose')` — and reference the mocked fns via `X as jest.Mock`; these are NOT the centrally-stubbed `@octokit/*` libs, so a per-spec `jest.mock` is the correct tool. `clearAllMocks()` is the first statement of the top-level `beforeEach`; a nested `beforeEach` (e.g. for the `up()` tests) then seeds module-mock return values — it runs after the outer reset.

**What to assert — two-tier strategy.**

- **Tier 1 — private-helper unit tests (justified private access):** the class is all-private + I/O-bound, so its deterministic helpers are reached directly through a typed `ExecutorInternals` interface + a `const internals = (sut) => sut as unknown as ExecutorInternals` cast. This is an **accepted, documented exception** to public-boundary-only testing, justified by the class shape (all-private logic + I/O); keep an explanatory comment at the cast. Cover: the pure transforms (duration → nanoseconds parsing incl. compound and unparseable inputs, build-arg list/map normalization, build-path resolution, recipe-service extraction, healthcheck normalization); the progress-stream helpers (`followPull`/`followBuild` resolve on `onFinished()` / reject on `onFinished(error)`, and emit discrete status lines while skipping byte-level progress frames and status-less events, driven by a fake `modem.followProgress(stream, onFinished, onProgress)`); the pull de-dup / skip-built / skip-imageless logic; and the best-effort `captureStartupLogs` (swallows errors without emitting or throwing).
- **Tier 2 — public `up()` orchestration:** with the I/O libs module-mocked and a fake `dockerode-compose` instance shaped per test (recipe + stubbed `down`/`up`), assert the emitted lifecycle-line order, the `down`-before-`up()` ordering (via `mock.invocationCallOrder`), and temp-dir cleanup in the `finally` — including that when an early step (e.g. archive extraction) throws, the temp dir is still removed and the error propagates.

### Transformers / mappers & DTO validation

_TODO: transformer/mapper and DTO-validation testing conventions._

---

## Service testing

Domain/application services (UI services orchestrating use cases and repositories). Unlike a controller (a thin HTTP boundary), **a service owns orchestration logic**, so its spec asserts the branching, mapping, and error translation the service performs. Reference specs: `networks.service.spec.ts`, `services.service.spec.ts`, `deployments.service.spec.ts` (delegated-use-case mocking). Plus all Common conventions.

**Building the SUT.** Build via `Test.createTestingModule` + `moduleRef.get(...)`; `beforeEach` is `async`. Register the SUT and every injected collaborator (mock value-provider through its real token) under `providers` — going through the module exercises real DI token bindings, the [documented NestJS approach](https://docs.nestjs.com/fundamentals/testing), not a hand-wired constructor. **Carve-out — plain `new` only for a zero-dependency utility service** that injects nothing and merely spies on a framework primitive (e.g. `DiagnosticLoggerService`, which only wraps `Logger.prototype`); the moment a service injects a collaborator, use the testing module. **Always mock the delegated use case:** `jest.mock('../../../application/<name>.use-case')`, type as `jest.MockedFunction<typeof useCase>`, name `mock<UseCaseName>`; assert delegation with the **real collaborators the service passes** (`toHaveBeenCalledWith(mockRepo, service, …args)`) and that the service returns the result unchanged — do **not** run the real use case against a mocked repository. Mock injected collaborators through their real token, exposing only called methods.

**What to assert (per public method).**

- **Delegation:** use case/repository called **once** with the exact real collaborators and args passed down.
- **Return / mapping:** `toBe(result)` for pass-through, `toEqual(...)` for a composed shape.
- **Edge cases:** empty list (`toEqual([])`), absent result (`toBeNull()`), config fallbacks.
- **Error propagation:** an untranslated collaborator rejection bubbles up unchanged (`rejects.toBe/toThrow(error)`).
- **Error translation the service performs:** a domain error mapped to an `HttpException` (e.g. missing entity → `NotFoundException`), plus the **short-circuit guard** — downstream collaborator **not** called on that branch (`expect(mockUseCase).not.toHaveBeenCalled()`).
- Do **not** assert framework mechanics you don't own (DI resolution, pipes, validation).

**Flushing async work in stateful-service specs.** A stateful/async service (e.g. an RxJS-driven runner) may need pending micro/macrotasks drained before asserting. The common helper wraps a timer in a Promise — **write the executor with a block body, not an expression body** (see `deployment-runner.service.spec.ts`). Why: an expression body `(resolve) => setImmediate(resolve)` implicitly returns the handle; the `Promise` constructor ignores it and ESLint/TS flag `no-promise-executor-return`. Fix: a block body `{ setImmediate(resolve); }` returns nothing, satisfies the rule, and resolves on the next tick — same for `setTimeout(resolve, 0)` flush helpers.

---

## Controller testing

NestJS UI controllers (`ui/controllers/*.controller.ts`). A controller is a **thin HTTP boundary**: it delegates to a service and translates the result into an HTTP outcome (return shape, status code, or `HttpException`). Verify exactly that boundary — nothing deeper. Reference spec: `services.controller.spec.ts`. Plus all Common conventions.

**Building the SUT.** NestJS testing module: controller under `controllers: [...]`, every injected dependency as a mock value-provider under its real token; `beforeEach` is `async`; resolve with `moduleRef.get(...)`. Mock collaborator services exposing only called methods (`jest.Mocked<Pick<Service, 'methodA' | 'methodB'>>`), assigned fresh in `beforeEach`. **Provide exactly the dependencies the controller injects — no more, no fewer:** every injected token must be provided or Nest fails to instantiate; conversely, don't register a provider for a class it doesn't inject (misleading dead wiring). Most UI controllers inject only their sibling service (e.g. `ServicesController`→`ServicesService`). A genuinely-injected-but-uncalled dependency still gets a minimal `{} as unknown as X` stub through its real token; never substitute an anonymous inline `class {}`. **Transitive ESM imports** (importing a controller/provider pulls in `@octokit/*`) are handled globally (see Common) — no per-spec `jest.mock('@octokit/...')`, no empty-class stub of the product provider.

**What to assert.**

- **Delegation:** the handler calls the service method **once** with the exact args received (route/query params, DTO body).
- **Return shape / mapping:** `toBe(service)` for pass-through, `toEqual([service])` / `toEqual([])` for lists.
- **HTTP-facing translation the controller performs:** absent result (`null`/`false`) → throws `NotFoundException` (`rejects.toBeInstanceOf(NotFoundException)`), message includes the id (`rejects.toThrow(\`Service ${id} not found\`)`); no-content handler (`@HttpCode(204)`, `Promise<void>`) resolves with no value (`resolves.toBeUndefined()`) on success; where it wraps daemon/adapter errors, assert the mapped exception (e.g. `ServiceUnavailableException`) and that a pre-thrown `HttpException` is rethrown unchanged (such error-branch tests legitimately emit `logger.error` output — expected, not a failure).
- **Error propagation:** an untranslated service rejection bubbles up unchanged (`rejects.toBe(error)`).
- **Do NOT** exercise real service logic (the injected service is always a mock; repository access, use-case orchestration, and validation belong to lower layers) or assert framework mechanics you don't own (`ParseUUIDPipe`, routing, `class-validator` DTO validation). Pass already-valid arguments directly to the handler.

**Testing `@Sse` / `Observable`-returning handlers.** A `@Sse` handler returns an `Observable<MessageEvent>` (not a `Promise`), piping the service's domain-event stream through `map` into `{ data: JSON.stringify(event) }`. Test delegation and mapping — not RxJS. Reference: `logs.controller.spec.ts` (`LogsController.streamLogs`).

- **Mock the collaborator to return an observable:** `mockReturnValue(of(...events))` (or `mockReturnValue(EMPTY)` for empty) — NOT `mockResolvedValue`, which hands back a `Promise` the handler never awaits.
- **Assert delegation synchronously** — the handler returns an `Observable`, so don't `await`: call `sut.streamLogs(id)` and assert `expect(service.streamLogs).toHaveBeenCalledWith(id)` directly.
- **Verify SSE mapping by collecting the stream:** pipe through `toArray()` and `await firstValueFrom(...)`, then assert the emitted array equals the expected SSE messages.
- **Empty stream → `EMPTY`, not `of()`** (the zero-arg `of<T>()` overload is deprecated; argument-bearing `of(a, b, …)` is fine).
- **Return a Promise; never use Jest's `done` callback** (`jest/no-done-callback`). With `done`, a failing `expect` inside `subscribe`/`complete` times out instead of failing cleanly, and an unhandled stream `error` hangs. Prefer an `async` test that `await`s `firstValueFrom(obs.pipe(toArray()))`. (If a mechanical conversion is unavoidable, wrap the subscription in a returned `new Promise((resolve, reject) => …)` with try/catch → `reject` in `complete`/`error` — but `toArray()` is preferred for finite streams.)

---

## Guards & Passport strategies

Guards (`ui/guards/`) are the same thin UI/framework-primitive family as decorators & filters. A guard owns no orchestration: it decides whether a request may proceed, typically by reading route metadata and/or deferring to a Passport strategy. Verify exactly that observable boundary — nothing about the auth pipeline or real strategy execution. Reference spec: `jwt-auth.guard.spec.ts` (global `JwtAuthGuard`). Passport strategies (`ui/strategies/`) are plain-instantiated with mocked ports — see `jwt.strategy.spec.ts`, `local.strategy.spec.ts`. Plus all Common conventions.

**Building the SUT.** Plain instantiation: `new JwtAuthGuard(mockReflector as unknown as Reflector)` — no `Test.createTestingModule` (mirrors filters & strategies); call `sut.canActivate(context)` directly. For a guard extending Passport's `AuthGuard`, stub the base `canActivate` by spying on the prototype's prototype — `jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate').mockReturnValue(true)` — so no real strategy runs; drive the `@Public()` branch through the mocked `Reflector` (spying → apply the Common spy-reset pairing). Fake `ExecutionContext` from `jest.fn()` mocks via a `const` arrow helper (e.g. `contextFor()`): `getHandler` / `getClass` are `jest.fn()`s returning a stable handler fn / throwaway class — mirrors the decorator/filter fake-context pattern. Mock the injected `Reflector` structurally, name `mockReflector`, typed `jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>`, `let` at `describe` scope and recreated in `beforeEach`.

**What to assert — observable boundary only.**

- **`@Public()` branch (flag `true`):** returns `true`, calls `reflector.getAllAndOverride` with `(IS_PUBLIC_KEY, [handler, class])`, and does NOT invoke the Passport base — `expect(baseCanActivate).not.toHaveBeenCalled()`.
- **Non-public route (flag `false`):** delegates to `super.canActivate(context)` (`toHaveBeenCalledWith(context)`) and returns its result.
- **Absent flag (`undefined`):** also enforces the base — same delegation as the non-public branch.
- **Always capture and assert `canActivate`'s return value.** `AuthGuard.canActivate` returns a `boolean | Promise<boolean> | Observable<boolean>` union, so bind it (`const result = sut.canActivate(context); expect(result).toBe(...)`) rather than calling it as a bare discarded statement — a discarded call trips `@typescript-eslint/no-floating-promises`.
- **Do NOT assert framework mechanics** — real Passport strategy execution, guard registration, or how Nest dispatches to `canActivate()`.

**Behavior-free `AuthGuard` subclass — minimal smoke spec.** A guard that only selects a strategy — no constructor, no overridden methods (e.g. `LocalAuthGuard extends AuthGuard('local') {}`) — has no logic of its own. Its spec is a **minimal smoke spec that verifies the guard is correctly wired as a Passport guard, not an attempt to run the real strategy** (reference spec: `local-auth.guard.spec.ts`). Follow the guard conventions: plain instantiation (`new LocalAuthGuard()`), `sut` naming, `clearAllMocks()` first in `beforeEach` (no spies → no `afterEach` restore needed). Assert only stable, observable facts: the guard is instantiable (`expect(sut).toBeInstanceOf(LocalAuthGuard)`); it inherits the Passport guard contract (`expect(typeof sut.canActivate).toBe('function')`, optionally `handleRequest` / `logIn`). Do NOT assert framework internals that aren't stably observable (e.g. the private strategy name), and do NOT fabricate behavior the class does not have.

---

## Exception filters

NestJS `@Catch()` exception filters (`ui/filters/*.filter.ts`) — the same thin UI/framework-primitive family as guards & decorators. A filter owns no orchestration: it shapes every thrown value into a JSON envelope and hands it to the platform adapter. Verify exactly that observable boundary — nothing about the HTTP pipeline. Reference spec: `all-exceptions.filter.spec.ts` (global `AllExceptionsFilter`). Plus all Common conventions.

**Building the SUT.** Plain instantiation: `new AllExceptionsFilter(mockHttpAdapterHost)` — no `Test.createTestingModule` (mirrors guards & strategies); call `sut.catch(exception, host)` directly. Fake `ArgumentsHost` from `jest.fn()` mocks via a `const` arrow helper (e.g. `hostFor(request, response)`): `switchToHttp` is a `jest.fn()` returning `{ getRequest, getResponse }`, each a `jest.fn()` handing back the fixture — mirrors the decorator spec's fake `ExecutionContext`. Mock the injected `HttpAdapterHost` structurally, names `mockHttpAdapterHost` / `mockReply` / `mockGetRequestUrl`, exposing only the methods the SUT calls (`getRequestUrl`, `reply`) via `jest.Mocked<Pick<HttpAdapterHost['httpAdapter'], …>>` with a single `as unknown as HttpAdapterHost` cast. The filter spies `Logger.prototype` → apply the Common spy-reset pairing.

**What to assert — observable boundary only.**

- **Reply call:** `httpAdapter.reply` called **once** with `(response, envelope, statusCode)` — identity `toBe(response)` for the response arg, `toEqual({...})` (with `timestamp: expect.any(String)`) for the envelope.
- **Status preserved for `HttpException`:** the subclass's status code and message survive into the envelope (e.g. `NotFoundException` → 404).
- **Validation arrays preserved:** a `BadRequestException` carrying a `message` array keeps it as an array in the envelope.
- **No leakage on unexpected errors:** a non-HTTP `Error` maps to a generic 500 with no internal detail — assert the stack/secret is absent (`JSON.stringify(envelope)` does not contain it).
- **Logging split:** 4xx logs `warn` **once** (`error` not called); 5xx logs `error` **once** with the stack as the 2nd arg (`warn` not called).
- **Do NOT assert framework mechanics** — filter registration, the HTTP pipeline, or how Nest dispatches to `catch()`.

**Product code.** Already fully unit-testable by calling `catch()` directly — no refactor needed (like the `Public` metadata decorator). A filter that could not be tested cleanly would follow the decorator's extract-a-testable-unit approach.

---

## Decorator testing

Custom decorators under `ui/decorators/` — param decorators (`createParamDecorator`) and metadata decorators (`SetMetadata` wrappers). Same thin UI/auth-primitive family as guards & strategies: no testing module, plain instantiation/direct calls. Reference specs: `current-user.decorator.spec.ts`, `public.decorator.spec.ts`. Plus all Common conventions.

**Param decorators (`createParamDecorator`) — test the extracted factory, not the wrapper.** NestJS keeps the factory callback passed to `createParamDecorator` internal, so the wrapper (`CurrentUser`) is unreachable from a spec. Convention: **extract the inline factory into a named, exported arrow** (`currentUserFactory`) and pass it by reference to `createParamDecorator`. This is behavior-preserving — the exported decorator keeps its name and behavior — and makes the extraction logic unit-testable, mirroring the guard/strategy approach (plain function + fake `ExecutionContext`).

- **Building the SUT:** fake `ExecutionContext` from `jest.fn()` mocks — `switchToHttp` returns `{ getRequest }`, where `getRequest` returns the fixture request. Call the factory directly (`currentUserFactory(undefined, context)`) — no testing module, no `sut` alias (it's a pure function, invoked by imported name).
- **What to assert:** returns the exact attached value — `toBe` on an inline fixture typed to the domain model (e.g. `request.user` is the `User`); reads through `switchToHttp().getRequest()` — both mocks called once (`toHaveBeenCalledTimes(1)`); the absent-value edge case — `toBeUndefined()` for an unauthenticated request shape (nothing attached).

**Metadata decorators (`SetMetadata` wrappers, e.g. `Public`) — assert the key and the attached metadata.** Already testable as-is — no refactor needed.

- **Pin the metadata key constant to its literal** — `expect(IS_PUBLIC_KEY).toBe('isPublic')`. Guards against silent drift that would break the guard/`Reflector` lookup reading it.
- **Assert the decorator attaches the metadata:** apply it to a throwaway class **and** a method handler in the spec, read it back with a `Reflector` (`reflector.get(KEY, target)`), assert the value (`true`). Cover the undecorated case (metadata `undefined`).
- **Method-handler target — read the function off its descriptor, never `Class.prototype.method`.** An unbound method reference passed to `reflector.get(...)` trips `@typescript-eslint/unbound-method`. Instead read the descriptor's value and type it at the boundary: `const handler = Object.getOwnPropertyDescriptor(Class.prototype, 'handler')?.value as () => void` — the same function object the metadata is attached to, so the assertion is unchanged. Optional-chaining `?.value` avoids a `!` non-null assertion (forbidden by `@typescript-eslint/no-non-null-assertion`), and casting to a concrete function type (`() => void`) keeps `handler` from being `any`, which avoids `@typescript-eslint/no-unsafe-argument` when it's passed to `reflector.get(...)`. See `public.decorator.spec.ts`.
