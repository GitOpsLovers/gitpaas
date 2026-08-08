---
name: backend-unit-testing
description: Enable this skill when the user requests to work with the testing layer of the backend application.
---

# Backend unit testing skill

Conventions for `apps/backend` unit specs, derived from the suite as it exists today. Runner: **Jest + ts-jest**, configured in `apps/backend/jest.config.js`.

The backend is layered — `domain/` → `infrastructure/` → `ui/`, with thin `application/` use-case functions. Those layers appear inside each feature (`src/features/<feature>/`) and inside the two sibling folders `src/core/` and `src/shared/`, each of which creates only the layers it uses. Every SUT type has its own construction rules. **Read "Common conventions" first — they apply everywhere — then jump to your SUT type's section.**

---

## Running the suite

`apps/backend/package.json` defines exactly two test scripts: `test` (`jest`) and `test:e2e` (`jest --config ./test/jest-e2e.json`).

```bash
# Full backend suite (run from apps/backend)
rtk pnpm test

# Scoped run — Jest treats the trailing argument as a testPathPattern regex
rtk pnpm test -- projects
rtk pnpm test -- src/features/services/infrastructure/database

# Every app's unit tests, from the repo root (turbo run test)
rtk pnpm test
```

Project-wide constraints a test writer must respect:

- **Prefix every shell command with `rtk`.** No exceptions, including `git`/`gh`.
- **Never run ESLint** — that is the user's responsibility.
- **Never run `test:e2e` or anything Playwright-based.**
- **Never install dependencies.** Surface the missing package instead.

---

## Common conventions

- **One spec per source file, mirrored under `__tests__/`.** The spec lives in a `__tests__/` directory next to the file it covers and is named `<source-file-name>.spec.ts` — so `db-projects.repository.ts` is covered by `__tests__/db-projects.repository.spec.ts`. Two exceptions exist: `src/app.controller.spec.ts` and `src/app.service.spec.ts` sit directly beside their sources; `src/bootstrap.ts` is covered by `src/__tests__/bootstrap.spec.ts`.
- **File names follow `docs/backend-architecture.md`.** Infrastructure names are `<technology>-<name>`, not `<name>-<technology>`: `db-projects.repository.ts`, `db-projects.transformer.ts`, `db-project.entity.ts`, `docker-containers.repository.ts`, `docker-container-runtime.adapter.ts`, `dockerode-docker-executor.adapter.ts`. Specs inherit those names verbatim.
- **`jest.clearAllMocks()` is the first statement of `beforeEach`** in almost every spec with a `beforeEach`. A spec with no shared mutable state and no `beforeEach` need not add one just to hold the reset.
- **Specs that call `jest.spyOn` also restore.** `clearAllMocks()` does not detach a spy, so pair it with `jest.restoreAllMocks()` in `afterEach` (see `core/ui/services/__tests__/diagnostic-logger.service.spec.ts` and `features/users/ui/services/__tests__/users.service.spec.ts`).
- **Class-instance SUTs are named `sut`.** Function SUTs (use cases, extracted decorator factories) are invoked by their imported name — no alias.
- **Mocked collaborators carry a `mock` prefix**: `mockProjectsRepository`, `mockServicesService`, `mockContainerRuntime`, `mockDiagnostics`. Mocked use-case functions are `mock<UseCaseName>` (e.g. `mockCreateProjectUseCase`).
- **Type mocks as narrowly as the SUT needs**: `jest.Mocked<Pick<T, 'onlyTheMethodsCalled'>>` is the dominant form, so the compiler flags drift when the SUT starts calling something new. `{} as jest.Mocked<T>` is used only for a collaborator the SUT merely forwards (see the "UI services" section).
- **`it` names read as a behavior contract**: `delegates…`, `returns…`, `maps…`, `propagates…`, `throws…`, `never…`.
- **Spec-local fixtures and helpers are `const` arrow expressions with a TSDoc line**, taking a `Partial<T>` overrides argument where useful:

  ```ts
  /** Builds a project database-entity fixture, overriding only the fields under test. */
  const projectEntity = (overrides: Partial<DbProjectEntity> = {}): DbProjectEntity => ({
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      name: 'gitpaas',
      services: [],
      ...overrides,
  });
  ```

  Arrows do not hoist, so declare them before first use.
- **Path aliases work in specs.** `@core/*`, `@features/*` and `@shared/*` are mapped in `jest.config.js`, mirroring `tsconfig.json`. Use a relative path inside the feature under test and an alias for anything in `core`, `shared` or another feature — exactly as the product code does.
- **ESM-only Octokit packages are stubbed centrally.** `@octokit/rest` and `@octokit/auth-app` are ESM-only and would throw `SyntaxError: Cannot use import statement outside a module` under ts-jest. `moduleNameMapper` redirects both to hand-written stubs in `apps/backend/test/stubs/` (`octokit-rest.stub.ts`, `octokit-auth-app.stub.ts`) that export the used symbols as `jest.fn()`s. Specs therefore need **no** `jest.mock('@octokit/...')`; they may import `Octokit` and assert on it directly, and `clearAllMocks()` resets it. If a new ESM-only package breaks the suite, add one `moduleNameMapper` entry plus a stub file — never per-spec `jest.mock`.

### No injection tokens — and what it means for mocking

The codebase never declares a DI symbol/string token. A Nest class injects the **concrete infrastructure class** as the token while typing the field as the **port interface**:

```ts
@Injectable()
export class DockerServerPrunerAdapter implements ServerPruner {
    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}
}
```

Two consequences for specs:

1. **In a testing module, provide the concrete class as the token**: `{ provide: DockerContainerRuntimeAdapter, useValue: mockContainerRuntime }`. Never redeclare a local empty class to stand in for the token, and never invent a string token.
2. **Under plain instantiation, type the mock against the concrete class and cast once at the constructor call.** The declared `Pick` keeps the mock typed while the cast satisfies the constructor parameter:

   ```ts
   let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'pruneImages'>>;
   sut = new DockerServerPrunerAdapter(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
   ```

   Use-case ports arrive as plain function arguments (no DI at all), so the same single `as unknown as Port` cast applies there.

---

## Use case testing

Use cases in `application/` are **framework-agnostic functions taking ports as arguments**. Spec them in isolation: import the function, call it with fake ports, assert observable behavior. No testing module, no value providers, no HTTP concerns. Canonical reference: `features/projects/application/__tests__/create-project.use-case.spec.ts`.

**Building the SUT.** Declare each port as `jest.Mocked<Pick<Port, 'onlyCalledMethods'>>` in `beforeEach`, then pass it at the call site with a single `as unknown as Port` cast:

```ts
describe('createProjectUseCase', () => {
    const createDto: CreateProjectDto = { name: 'GitPaaS' };

    let mockProjectsRepository: jest.Mocked<Pick<ProjectsRepository, 'create'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockProjectsRepository = { create: jest.fn() };
    });

    it('delegates creation to the repository with the provided DTO', async () => {
        mockProjectsRepository.create.mockResolvedValue(createdProject);

        await createProjectUseCase(mockProjectsRepository as unknown as ProjectsRepository, createDto);

        expect(mockProjectsRepository.create).toHaveBeenCalledTimes(1);
        expect(mockProjectsRepository.create).toHaveBeenCalledWith(createDto);
    });
});
```

When a use case takes several ports and the call is repeated across tests, wrap it in a spec-local `run()` arrow that applies the casts once (see `features/authentication/application/__tests__/refresh.use-case.spec.ts`).

Ports whose implementations are trivial value objects may be built by a small factory instead of a `Pick`; `features/server/application/__tests__/check-readiness.use-case.spec.ts` builds `jest.Mocked<HealthProbe>` stubs from `upProbe(name, up)` / `throwingProbe(name, error)` arrows because the port has one method and a `name` field.

**What to assert** — only what a caller observes:

- **Delegation**: each port method called once with exact args — `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith(...)`.
- **Return / mapping**: `toBe(result)` for a pass-through, `toEqual({...})` for a composed shape.
- **Edge cases**: absent → `toBeNull()`, empty list → `toEqual([])`, empty input → the port receives `[]`.
- **Error propagation is expected for CRUD-style use cases**: `mockRejectedValue(error)` → `rejects.toThrow(error)`, or `rejects.toBeInstanceOf(DomainError)` where the use case translates (e.g. `InvalidRefreshTokenError`, `UserInactiveError` from `features/authentication/domain/errors/authentication.errors`).
- **Guards / short-circuits**: assert the downstream port is not reached — `expect(mockRefreshTokensRepository.revoke).not.toHaveBeenCalled()`.
- **Ordering**, when the use case's contract depends on it: push markers from `mockImplementation` into an `order: string[]` and assert `toEqual(['revoke', 'issue'])`.

**Composing use cases — mock the delegated sibling.** When a use case orchestrates another one, `jest.mock('../<sibling>.use-case')`, type it as `jest.MockedFunction<typeof siblingUseCase>`, name it `mock<UseCaseName>`, and assert the exact ports forwarded plus that the result comes back unchanged. Do not run the real sibling against a mocked repository — that tests the sibling. A trivial one-line pass-through wrapper may run the real sibling, since mocking would be tautological.

**Shared pure functions** in `src/shared/application/` (`getGitpaasLabels`, `getServiceSlug`) are use cases with no ports at all: no mocks, no `beforeEach`, just input → output assertions, including a "hands out a fresh object per call" test for anything returning a mutable structure.

---

## UI service testing

UI services in `features/*/ui/services/` orchestrate: they hold the injected repositories/adapters and hand them to `application/` use cases. Canonical reference: `features/projects/ui/services/__tests__/projects.service.spec.ts`.

**Building the SUT.** Use `Test.createTestingModule` with an `async beforeEach`, register the service plus every injected collaborator as a value provider under its concrete class, and resolve with `moduleRef.get(...)`:

```ts
jest.mock('../../../application/create-project.use-case');

const mockCreateProjectUseCase = createProjectUseCase as jest.MockedFunction<typeof createProjectUseCase>;

describe('ProjectsService', () => {
    let mockProjectsRepository: jest.Mocked<DatabaseProjectsRepository>;
    let sut: ProjectsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProjectsRepository = {} as jest.Mocked<DatabaseProjectsRepository>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ProjectsService,
                { provide: DatabaseProjectsRepository, useValue: mockProjectsRepository },
            ],
        }).compile();

        sut = moduleRef.get(ProjectsService);
    });
});
```

**Always mock the delegated use case.** Because the use case is mocked, the injected collaborators are never called by the spec — they are pure identity placeholders, which is why `{} as jest.Mocked<DatabaseProjectsRepository>` is the right shape here. The assertion is that the service forwards *those exact instances*:

```ts
expect(mockDeleteServiceUseCase).toHaveBeenCalledWith(
    mockServicesRepository,
    mockDeploymentsRepository,
    mockServiceRuntimeResources,
    mockLogStore,
    serviceId,
);
```

When the service calls a collaborator **directly** (rather than only forwarding it), switch that one to a `jest.Mocked<Pick<...>>` with real `jest.fn()`s — see `features/users/ui/services/__tests__/users.service.spec.ts`, which stubs `Argon2PasswordHasherAdapter`'s `hash` while still forwarding it to `seedAdminUseCase`.

**What to assert per public method:** delegation (once, with the exact collaborators and args), pass-through (`toBe`) or composed shape (`toEqual`), the empty-list and `null` edge cases, error propagation (`rejects.toThrow(error)`), and any error translation or short-circuit the service itself performs (`expect(mockUseCase).not.toHaveBeenCalled()`). Do not assert DI resolution, pipes or validation.

**Stateful, RxJS-driven services** (e.g. `DeploymentRunnerService`) need pending work drained before asserting. Use a `flush` helper with a **block-bodied** executor — an expression body would implicitly return the `setImmediate` handle and trip `no-promise-executor-return`:

```ts
/** Resolves after pending microtasks, letting the fire-and-forget run settle. */
const flush = (): Promise<void> =>
    new Promise<void>((resolve) => {
        setImmediate(resolve);
    });
```

Drive the stream by pushing through a real `Subject` exposed on the mocked queue (`dequeued$: dequeued.asObservable()`), then `await flush()` before asserting.

---

## Controller testing

Controllers in `features/*/ui/controllers/` are a **thin HTTP boundary**: delegate to the sibling service and translate the result into an HTTP outcome. Canonical reference: `features/services/ui/controllers/__tests__/services.controller.spec.ts`.

**Building the SUT.** Testing module, controller under `controllers`, each injected service as a value provider under its class; `async beforeEach`; the service mock is a `jest.Mocked<Pick<Service, …>>` of real `jest.fn()`s recreated per test:

```ts
mockServicesService = {
    getAllByProject: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
};

const moduleRef = await Test.createTestingModule({
    controllers: [ServicesController],
    providers: [{ provide: ServicesService, useValue: mockServicesService }],
}).compile();

sut = moduleRef.get(ServicesController);
```

Provide exactly the dependencies the controller injects — no more, no fewer.

**What to assert:**

- **Delegation**: the handler calls the service method once with the exact args received.
- **Return shape**: `toBe(service)` for a pass-through, `toEqual([service])` / `toEqual([])` for lists.
- **HTTP translation the controller performs**: absent result → `rejects.toBeInstanceOf(NotFoundException)` plus a separate test pinning the message (`rejects.toThrow(\`Service ${serviceId} not found\`)`); a `@HttpCode(204)` handler → `resolves.toBeUndefined()`; daemon/adapter failures mapped to `ServiceUnavailableException` (see the containers, networks and server controllers).
- **Error propagation**: an untranslated rejection bubbles up unchanged — `rejects.toBe(error)`.
- **Do not** exercise real service logic or framework mechanics (`ParseUUIDPipe`, routing, `class-validator`). Pass already-valid arguments straight to the handler.

**`@Sse` / `Observable`-returning handlers** (`LogsController.streamLogs`): mock the service with `mockReturnValue(of(...events))` or `mockReturnValue(EMPTY)` — never `mockResolvedValue`. Assert delegation **synchronously** (the handler returns an `Observable`, so do not `await` it), then verify the SSE mapping by collecting the stream:

```ts
const received = await firstValueFrom(sut.streamLogs(deploymentId).pipe(toArray()));

expect(received).toEqual([{ data: JSON.stringify(events[0]) }, { data: JSON.stringify(events[1]) }]);
```

Use `EMPTY` for an empty stream (the zero-arg `of<T>()` overload is deprecated) and never Jest's `done` callback.

---

## Database repository testing

Repositories in `features/*/infrastructure/database/db-<name>.repository.ts` are TypeORM adapters over a single injected `Repository<Db…Entity>`, mapping persistence rows into domain models through a `to<Name>` transformer. Canonical reference: `features/projects/infrastructure/database/__tests__/db-projects.repository.spec.ts`.

**Building the SUT.** Plain instantiation in `beforeEach`; no testing module, and — because every DB repository injects exactly one `Repository` — `getRepositoryToken` is not used anywhere in the suite today:

```ts
let mockRepository: jest.Mocked<
    Pick<Repository<DbProjectEntity>, 'find' | 'findOne' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'>
>;
let sut: DatabaseProjectsRepository;

beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
        find: jest.fn(), findOne: jest.fn(), findOneBy: jest.fn(),
        create: jest.fn(), merge: jest.fn(), save: jest.fn(), delete: jest.fn(),
    };
    sut = new DatabaseProjectsRepository(mockRepository as unknown as Repository<DbProjectEntity>);
});
```

**What to assert per method:**

- **Reads** (`find` / `findOne` / `findOneBy`): the TypeORM method called once with the **exact** options object (`{ id }`, `{ where: { projectId }, order: { id: 'DESC' } }`, or a bare `find()` asserted as `toHaveBeenCalledWith()`); the mapped domain result; absent → `toBeNull()`; empty list → `toEqual([])`.
- **Create**: `create` called with the DTO (including any mutation the SUT applies), `save` called with the created entity, mapped result asserted.
- **Update** (find → `merge` → `save`, or find → field mutation → `save`): assert the merge/mutation and the save argument, plus the not-found branch returning `null` with `merge`/`save` never called.
- **`delete` / `update` returning `{ affected }`**: cover all three cases — `affected: 1` → `true`, `0` → `false`, `undefined` → `false`. Stub with the full result shape the type demands (`{ affected: 1, raw: [] }`).
- **Bulk writes**: TypeORM's `create`/`save` overloads collapse to the single-entity signature under `jest.Mocked<Pick<…>>`, so array stubs need a localized cast, and only there:

  ```ts
  (mockRepository.create as jest.Mock).mockReturnValue(entities);
  (mockRepository.save as jest.Mock).mockResolvedValue(entities);
  ```

  See `features/logs/infrastructure/database/__tests__/db-logs.repository.spec.ts`.

**Not currently present:** QueryBuilder chains, `manager.transaction`, and `upsert` do not occur in any DB repository. Do not invent a convention for them; add one here only when a repository adopts one.

---

## Transformer testing

Every `*.transformer.ts` has its own spec (`db-projects.transformer.spec.ts`, `docker-container-runtime.transformer.spec.ts`, …). Transformers are pure functions, so the spec has no mocks, no `beforeEach` and no SUT alias: `describe('<functionName>')`, build a fully-typed input literal, assert `toEqual` on the mapped output.

```ts
describe('toService', () => {
    it('maps every service entity field into the domain model', () => {
        const entity: DbServiceEntity = { /* … */ };

        expect(toService(entity)).toEqual({ /* … */ });
    });
});
```

Cover the defaults and fallbacks the transformer encodes (empty-string columns, `null` handling, epoch/date conversion, absent optional fields) — one `it` per behavior.

---

## Container runtime & Docker adapter testing

There is **no `DockerClient` class**. The Docker boundary is a single port in Core, `ContainerRuntime` (`@core/domain/ports/container-runtime.port`), implemented once by `DockerContainerRuntimeAdapter` (`@core/infrastructure/docker/docker-container-runtime.adapter`). That adapter owns `dockerode`: it memoizes a `Docker` handle from `getClient()`, serialises a `RuntimeSelector` into the daemon's `filters` via `toLabelFilter`, and maps daemon payloads into the runtime models (`RuntimeContainerSummary`, `RuntimeNetworkSummary`, `RuntimeImageSummary`, `RuntimePruneReport`, `ContainerRuntimeInfo`). Everything Docker-facing in the features talks to that port — never to `dockerode`.

### Feature adapters over the runtime port

Feature-level Docker adapters and repositories (`features/*/infrastructure/docker/docker-*.adapter.ts` / `docker-*.repository.ts`) inject `DockerContainerRuntimeAdapter` and consume it as `ContainerRuntime`. Their specs never touch `dockerode`. References: `features/server/infrastructure/docker/__tests__/docker-server-pruner.adapter.spec.ts` (prune → `PruneResult`), `features/containers/infrastructure/docker/__tests__/docker-containers.repository.spec.ts` (list + map), `features/server/infrastructure/docker/__tests__/docker-orphan-containers.adapter.spec.ts` and `features/services/infrastructure/docker/__tests__/docker-service-runtime-resources.adapter.spec.ts` (teardown).

**Building the SUT.** Hold each runtime method as its own `jest.Mock`, assemble them into a `jest.Mocked<Pick<DockerContainerRuntimeAdapter, …>>`, and cast once at the constructor:

```ts
let mockListContainers: jest.Mock;
let mockRemoveContainer: jest.Mock;
let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'listContainers' | 'removeContainer'>>;
let mockDiagnostics: jest.Mocked<Pick<DiagnosticLoggerService, 'log' | 'warn'>>;
let sut: DockerOrphanContainersAdapter;

beforeEach(() => {
    jest.clearAllMocks();

    mockListContainers = jest.fn().mockResolvedValue([]);
    mockRemoveContainer = jest.fn().mockResolvedValue(undefined);
    mockContainerRuntime = { listContainers: mockListContainers, removeContainer: mockRemoveContainer };
    mockDiagnostics = { log: jest.fn(), warn: jest.fn() };
    sut = new DockerOrphanContainersAdapter(
        mockContainerRuntime as unknown as DockerContainerRuntimeAdapter,
        mockDiagnostics as unknown as DiagnosticLoggerService,
    );
});
```

Fixtures are `const` arrow builders returning the **runtime** models (`RuntimeContainerSummary`, `RuntimePruneReport`, …), imported with `import type` from `@core/domain/models/container-runtime.models`.

**Always assert the ownership marker in the selector.** Every list, prune and teardown must be scoped by `io.gitpaas.managed=true` — the marker produced by `getGitpaasLabels()` in `@shared/application/get-gitpaas-labels.use-case`. Narrowing to one stack adds `project` **on top of** the marker; it never replaces it. A spec that green-lights a marker-less selector would allow a query that reaches the control plane and unrelated third-party stacks on the host. Import the real constants from `@core/domain/constants/gitpaas-labels.constants` (`GITPAAS_MANAGED_LABEL`, `GITPAAS_MANAGED_VALUE`, `GITPAAS_PROJECT_LABEL`, `GITPAAS_CONTROL_PLANE_PROJECTS`) rather than re-declaring them, so a renamed key fails the spec:

```ts
expect(mockListContainers).toHaveBeenCalledWith(
    { labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE }, project: null },
    true,
);
```

**What to assert:**

- **List + map**: the runtime method called once with the exact selector (and `all: true` where the SUT asks for stopped resources); the mapped domain result; empty list → `toEqual([])`; the name/port/short-id fallbacks; and the `service-<id>` project fallback when the service name slugifies to empty.
- **Prune**: each prune called once with the managed selector; the `RuntimePruneReport` mapped into `PruneResult`; the zeroed case too.
- **Teardown**: the selector used for each listing; `removeContainer` / `removeNetwork` / `removeImage` called with the right id and options (`{ force: true, removeVolumes: true }`); the protected/skip branches asserting `not.toHaveBeenCalled()`; the returned counts/names; and the summary `mockDiagnostics.log(...)` line.
- **Error resilience**: a single removal failure is caught, `mockDiagnostics.warn` is called, and iteration continues — assert the survivor.
- **Selector honouring, for anything with data-loss risk.** The strongest teardown specs do not hand the SUT a pre-filtered list. They describe a realistic unfiltered host (third-party compose stacks, unlabelled `docker run` containers, the control plane, GitPaaS-managed containers) and make `mockListContainers` apply the requested `RuntimeSelector` itself through a spec-local `matchesSelector` helper, so a widened selector actually surfaces protected containers and fails the test. Copy this shape whenever the SUT removes things.

### The runtime adapter itself

`core/infrastructure/docker/__tests__/docker-container-runtime.adapter.spec.ts` is the only spec that knows `dockerode` exists. It module-mocks the constructor, then drives the daemon exactly as production does — through the adapter's own memoized `getClient()`:

```ts
jest.mock('dockerode', () => jest.fn());

const DockerMock = Docker as unknown as jest.Mock;

const buildSut = (): { sut: DockerContainerRuntimeAdapter; daemon: FakeDaemon } => {
    const sut = new DockerContainerRuntimeAdapter();
    const daemon = sut.getClient() as unknown as FakeDaemon;

    daemon.listContainers = jest.fn().mockResolvedValue([]);
    // …one jest.fn() per daemon method the adapter calls

    return { sut, daemon };
};
```

`FakeDaemon` is a hand-written interface of `jest.Mock`s (dockerode's types are too overloaded for a useful `Pick`). Cover: client construction options (`{ socketPath: '/var/run/docker.sock' }`) and that nothing else is passed; memoization (one construction per adapter instance); the serialised label filters for each selector shape; per-method mapping into the runtime models; removals delegating through `getContainer(id).remove(...)`; prune fallbacks to zeroed counters.

### The Compose executor

`features/deployments/infrastructure/docker/__tests__/dockerode-docker-executor.adapter.spec.ts` covers `DockerodeDockerExecutorAdapter`, which injects `DockerContainerRuntimeAdapter` + `DiagnosticLoggerService` and drives `dockerode-compose`, `tar` and `node:fs/promises`. Those three libs get per-spec `jest.mock(...)` (they are not the centrally stubbed Octokit packages). Build the SUT via an `executorWithDaemon(fakeDaemon)` arrow that hands a fake daemon back from `getClient()`.

The class keeps its logic in private helpers behind a single public `up()`, so the spec uses a **documented, deliberate exception** to public-boundary testing: a typed `ExecutorInternals` interface plus `const internals = (sut) => sut as unknown as ExecutorInternals`, with a comment at the cast explaining why. Tier 1 covers the deterministic helpers (duration parsing, build-arg normalization, path resolution, progress-stream following); tier 2 drives `up()` and asserts the emitted lifecycle-line order, `down`-before-`up` ordering via `mock.invocationCallOrder`, and temp-dir cleanup in the `finally` even when an early step throws.

---

## External-API provider testing

`features/providers/infrastructure/github/github-providers.adapter.ts` wraps Octokit behind the providers port: it lazily builds and memoizes an authenticated client, then maps SDK responses into domain models. Reference: `github-providers.adapter.spec.ts`.

**Building the SUT.** Plain instantiation — `new GithubProvidersAdapter(createConfig(), createDiagnostics())` — where `createConfig(values)` and `createDiagnostics()` are `const` arrow builders returning `ConfigService` / `DiagnosticLoggerService` stubs. The fake client is a narrow hand-written `FakeClient { paginate: jest.Mock; request: jest.Mock }`; Octokit's overloads make `jest.Mocked<Pick<Octokit, …>>` impractical, and the spec says so in a comment.

**Split the spec into two layers:**

- **Layer A — mapping, Octokit isolated.** Spy the private client getter to return the fake client:

  ```ts
  jest.spyOn(sut as unknown as { getClient: () => unknown }, 'getClient').mockReturnValue(mockClient);
  ```

  Then assert exact endpoints and params (`paginate('GET /installation/repositories')`, `request('GET /repositories/{id}', { id: 42 })`), multi-step ordering via `toHaveBeenNthCalledWith`, the domain-mapped result, decoding steps (base64 file content, archive `Buffer`), and error translation (`NotFoundException` for non-file content). Spying means the spec pairs `clearAllMocks()` with `jest.restoreAllMocks()` in `afterEach`.
- **Layer B — client creation and auth, against the stubbed `Octokit` constructor.** Drive a real domain call and assert: missing config → `ServiceUnavailableException` with the constructor never called; the exact construction args (auth strategy, decoded private key, numeric installation id); and memoization (constructed once across several calls).

---

## Stateful adapter testing (batching, timers, streams)

`features/logs/infrastructure/database/__tests__/db-log-store.adapter.spec.ts` is the most sophisticated spec in the repo and the model for any adapter that buffers, flushes on a timer, and multiplexes an RxJS stream. `DatabaseLogStoreAdapter` injects `LogsRepository`, `DiagnosticLoggerService` and `ConfigService`.

Techniques worth copying:

- **A hand-written in-memory fake instead of `jest.fn()` stubs.** The spec implements the full `LogsRepository` over an array, because the behavior under test (sequences, replay, retention trimming) depends on real stored state. Extend the fake with a test-only lever where a race must be driven deterministically — here `holdReads()` returns a release callback that stalls every read, so a test can prove no entry is duplicated when it becomes durable mid-replay.
- **A `createStore(retentionHours, maxLines)` arrow** that rebuilds the SUT over the shared fakes with overridden config, so retention tests change one number rather than rewiring DI. A brand-new store also stands in for a process restart.
- **Two waiting helpers, both block-bodied**: `settle()` (`setImmediate`) to drain microtasks between stream assertions, and `wait(ms)` (`setTimeout`) to let a real time-based flush fire. No fake timers are used.
- **Stream assertions two ways**: `await firstValueFrom(store.stream(id).pipe(toArray()))` for a finite, already-terminated stream; a manual `subscribe` pushing into a `received: LogEvent[]` array (always `unsubscribe()`ing at the end) when the test interleaves emissions with `append`/`complete` calls.
- **Cover the lifecycle contract, not the implementation**: batch held below the size limit, flush at the limit, flush on the interval, flush on `onModuleDestroy()`, monotonic per-deployment sequences resuming from the stored maximum, replay → live hand-off with no gap or duplicate, terminal event completing the stream, unsubscribe stopping delivery, purge dropping both durable rows and the in-flight batch, retention trimming by line cap and by age (including the disabled case), and failures logged through `diagnostics.error` instead of rejecting.

---

## Passport strategies, guards, filters and decorators

These are thin framework primitives. All of them use **plain instantiation** — no testing module — and a fake context built from `jest.fn()`s.

**Passport strategies** (`features/authentication/infrastructure/passport/`): construct with mocked ports, mock the delegated use case with `jest.mock`, and assert delegation plus the error translation the strategy owns — each domain error mapped to `UnauthorizedException`, and unexpected errors rethrown unchanged (`rejects.toBe(boom)`).

**Guards** (`features/authentication/ui/guards/`): `new JwtAuthGuard(mockReflector as unknown as Reflector)`. Stub the Passport base so no real strategy runs:

```ts
superCanActivate = jest
    .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype) as JwtAuthGuard, 'canActivate')
    .mockReturnValue(true);
```

Build the `ExecutionContext` from a `contextFor()` arrow whose `getHandler`/`getClass` are `jest.fn()`s returning a stable handler and a throwaway class. Assert: the `@Public()` branch returns `true`, reads `IS_PUBLIC_KEY` with `[handler, class]`, and never invokes the base; the `false` and `undefined` branches both delegate to the base with the context. Always bind the return value (`const result = sut.canActivate(context)`) rather than discarding the call. Spying means an `afterEach` with `restoreAllMocks()`.

A behavior-free `AuthGuard` subclass (`LocalAuthGuard extends AuthGuard('local') {}`) gets a **minimal smoke spec** only: instantiable, and exposes the Passport contract (`typeof sut.canActivate`, `handleRequest`, `logIn`). Do not assert private strategy names or fabricate behavior.

**Exception filters** (`core/ui/filters/`): `new AllExceptionsFilter(mockHttpAdapterHost)`, called directly as `sut.catch(exception, host)`. Build `ArgumentsHost` from a `hostFor(request, response)` arrow whose `switchToHttp` returns `{ getRequest, getResponse }`. Assert only the observable boundary: `reply` called once with `(response, envelope, statusCode)` — identity `toBe` on the response, `toEqual` with `timestamp: expect.any(String)` on the envelope; `HttpException` status and message preserved; a `BadRequestException` message array kept as an array; a plain `Error` mapped to a generic 500 with no stack leakage (assert `JSON.stringify(envelope)` does not contain it); and the logging split — 4xx warns once, 5xx errors once with the stack as second argument. The filter spies `Logger.prototype`, so restore in `afterEach`.

**Decorators** (`features/authentication/ui/decorators/`):

- *Param decorators.* NestJS keeps the `createParamDecorator` callback internal, so the factory is **extracted and exported** — `currentUserFactory` is passed by reference to `createParamDecorator`. The spec calls `currentUserFactory(undefined, context)` directly with a fake `ExecutionContext` and asserts the exact attached value (`toBe` on a `User` fixture), that both context mocks were called once, and the unauthenticated case (`toBeUndefined()`).
- *Metadata decorators.* Pin the key to its literal (`expect(IS_PUBLIC_KEY).toBe('isPublic')`), apply `Public()` to a throwaway class and a method, read the metadata back with a real `Reflector`, and cover the undecorated case. Read a method target off its descriptor — `Object.getOwnPropertyDescriptor(Class.prototype, 'handler')?.value as () => void` — never `Class.prototype.method`, which trips `@typescript-eslint/unbound-method`.

---

## Config, constants and bootstrap

Plain-function modules under `core/infrastructure/config/` and `core/infrastructure/database/` are tested as pure functions. `env-validation.config.spec.ts` is the model: import `'reflect-metadata'` first, build a `validEnv()` arrow returning a complete environment, then assert the happy path, one test per missing/invalid variable, the aggregated multi-error message, and the numeric coercions. It also pins **absences** — that no `DOCKER` variable is required and that leftover removed variables are tolerated as unvalidated extras — which is how a removed feature stays removed.

Constants files get a spec only when the value itself is a contract (e.g. `GITPAAS_CONTROL_PLANE_PROJECTS` must equal `['gitpaas', 'gitpaas-dev']`).

---

## Known inconsistencies — follow the dominant pattern

A handful of older specs diverge. When touching them, prefer the dominant convention; do not propagate the minority one into new specs.

| Topic | Dominant pattern (use this) | Minority exceptions |
| --- | --- | --- |
| SUT variable name | `sut` | `probe` (health probes), `hasher` (`argon2-password-hasher.adapter.spec.ts`), `strategy` (`local.strategy.spec.ts`), `store` (`db-log-store.adapter.spec.ts`) |
| Mocked collaborator name | `mock`-prefixed | unprefixed `query`, `dataSource`, `client`, `usersRepository`, `deploymentsRepository` in the health-probe, strategy and queue-adapter specs |
| Mocked use-case name | `mock<UseCaseName>` | `validateUserUseCaseMock` in `local.strategy.spec.ts` |
| Spec-local fixture builders | `const` arrow | `function entity(...)` / `function createRepository()` in `db-deployment-queue.adapter.spec.ts` and `db-log-store.adapter.spec.ts` |
| `jest.clearAllMocks()` first in `beforeEach` | yes | omitted in the health-probe, argon2 and queue-adapter specs |
| `restoreAllMocks()` when spying | `afterEach` restore | `db-log-store.adapter.spec.ts` spies without an explicit restore |
