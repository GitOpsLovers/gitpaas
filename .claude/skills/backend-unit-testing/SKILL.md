---
name: backend-unit-testing
description: Enable this skill when the user requests to work with the testing layer of the backend application.
---

# Backend unit testing skill

Conventions for `apps/backend` unit specs. Runner: **Jest + ts-jest** (`apps/backend/jest.config.js`).

The backend is layered (`domain/` → `infrastructure/` → `ui/`, with `application/` use cases). Each SUT type has its own construction and assertion rules. **Read the Common conventions first — they apply to every spec — then jump to the section for your SUT type.**

---

## Common conventions

Rules that apply to **all** backend specs, regardless of SUT type. Type-specific sections reference these instead of repeating them.

### Ground rules

- **Mock ports/collaborators as value providers:** `{ provide: <class>, useValue: <mock> }`, structurally mocked with `jest.fn()`. Type via `jest.Mocked<Pick<T, 'usedMethod'>>` (only what the SUT calls), `jest.Mocked<T>`, or `{} as jest.Mocked<T>`.
- **Keep mocks tight — don't over-mock.** Prefer `jest.Mocked<Pick<T, 'onlyCalledMethods'>>` and expose only the methods the SUT actually invokes. A narrower mock lets the compiler flag drift when the SUT starts calling something new, and keeps the spec honest about the collaboration.
- **`jest.clearAllMocks()` is the first statement of `beforeEach`.** It resets call history and configured returns so nothing leaks between tests. **Spy-based exception:** a spec built on `jest.spyOn(...)` (e.g. spying on `Logger.prototype` in `DiagnosticLoggerService`) must additionally call `jest.restoreAllMocks()` in `afterEach` to detach the spies and put the real implementations back — `clearAllMocks` clears call state but does not restore the original methods.
- **Behavior-focused `it` names reading as a contract:** `delegates…`, `returns…`, `propagates…`, `throws…`.
- **Path aliases work in specs:** `@core/*` / `@features/*` resolve via `moduleNameMapper` in `jest.config.js`. Import cross-feature collaborators by alias.

### Naming: the `mock`-prefix convention

- **Applies to every layer — controllers *and* services (and use-case/infra specs) alike.** Name every mocked collaborator with a `mock` prefix (camelCase): `mockServicesService`, `mockGithubAppProvider`, `mockDeploymentsRepository`. Keep it consistent across a spec so mocks read as distinct from real instances.
- **Use-case function mocks follow the same rule: `mock<UseCaseName>` (camelCase)** — e.g. `mockGetDeploymentsByServiceUseCase` for `getDeploymentsByServiceUseCase`. Not a `…Mock` suffix.
- **The SUT is always named `sut`** — never the real class name — so the subject under test reads distinctly from its mocked collaborators.

### Where to declare a mock — module `const` vs. `beforeEach`

Where a mock lives depends on whether it holds state the tests care about.

- **Stateful mocks → `let` at the `describe` scope, (re)created fresh inside `beforeEach`.** A mock is stateful when its `jest.fn()`s accumulate call history you assert on (`toHaveBeenCalledWith`, `toHaveBeenCalledTimes`) or get per-test return values (`.mockResolvedValue(...)`). Recreating it per test — together with [`jest.clearAllMocks()`] — guarantees isolation: no call counts or configured resolutions leak between tests. Example: `mockServicesService` in `services.controller.spec.ts`.
- **Stateless placeholders → a module-level `const` is fine.** When a dependency exists only to satisfy DI and the SUT never calls it (nothing recorded, never configured), one shared instance is safe — e.g. `const mockSomeProvider = {} as unknown as SomeProvider;`. Nothing to reset means no isolation risk.
- **Rule of thumb:** if a mock's behavior or expectations vary per test, recreate it in `beforeEach`; if it's a pure static placeholder, a module-level `const` is enough. The moment a placeholder starts being called or asserted on, move it to the `let` + `beforeEach` pattern.

```ts
// Stateless placeholder — never called → module-level const
const mockSomeProvider = {} as unknown as SomeProvider;

describe('SomeController', () => {
    // Stateful — asserted on / configured per test → let + fresh in beforeEach
    let mockSomeService: jest.Mocked<Pick<SomeService, 'findById' | 'delete'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSomeService = { findById: jest.fn(), delete: jest.fn() };
    });
});
```

### Mock a dependency through its real injection token

Register a collaborator's mock against its **real class token** — import the real class so the token is the actual class, then provide a mock for it:

- `Test.createTestingModule({ providers: [{ provide: RealClass, useValue: mockRealClass }] })`, or `.overrideProvider(RealClass).useValue(mockRealClass)`.
- Mock only the methods the SUT actually calls (as `jest.fn()`s). If it calls none, a minimal typed stub wired through the real token is enough: `const mockRealClass = {} as unknown as RealClass;`.
- **Anti-pattern:** redeclaring an empty local class as the token — `jest.mock('.../x.provider', () => ({ RealClass: class RealClass {} }))`. This bypasses real DI wiring and is not the [documented NestJS approach](https://docs.nestjs.com/fundamentals/testing).

```ts
// Hypothetical: a SUT that genuinely injects GithubAppProvider.

// Before — inline class redeclared as the token; real DI wiring bypassed
jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));
// ...providers: [SomeService] — the GithubAppProvider token is silently the empty stub

// After — import the real class, provide a mock against the real token
import { GithubAppProvider } from '@features/providers/infrastructure/github/github-app.provider';

const mockGithubAppProvider = {} as unknown as GithubAppProvider; // or { getClient: jest.fn() }
const moduleRef = await Test.createTestingModule({
    controllers: [SomeController],
    providers: [
        { provide: SomeService, useValue: mockSomeService },
        { provide: GithubAppProvider, useValue: mockGithubAppProvider },
    ],
}).compile();
```

### ESM-only third-party libs (`@octokit/*`) — stubbed centrally

`@octokit/rest` and `@octokit/auth-app` (and their transitive deps) are **ESM-only** — `"type": "module"` with no CommonJS build. ts-jest compiles the app's imports to `require()`, and requiring untransformed ESM from `node_modules` throws `SyntaxError: Cannot use import statement outside a module`. Any spec whose import graph transitively reaches these libs (e.g. through `github-app.provider`) hits this.

**Standard fix: stub them once, globally — never per spec.** `moduleNameMapper` in `apps/backend/jest.config.js` redirects each ESM package to a hand-written stub under `apps/backend/test/stubs/`. `rootDir` is `src`, so `<rootDir>/..` resolves to `apps/backend`:

```js
// apps/backend/jest.config.js
moduleNameMapper: {
    // ...existing @core / @features aliases...
    '^@octokit/rest$': '<rootDir>/../test/stubs/octokit-rest.stub.ts',
    '^@octokit/auth-app$': '<rootDir>/../test/stubs/octokit-auth-app.stub.ts',
},
```

```ts
// apps/backend/test/stubs/octokit-rest.stub.ts
export const Octokit = jest.fn().mockImplementation(() => ({
    paginate: jest.fn().mockResolvedValue([]),
    request: jest.fn().mockResolvedValue({ data: {} }),
}));

// apps/backend/test/stubs/octokit-auth-app.stub.ts
export const createAppAuth = jest.fn();
```

Because the stubbed `Octokit` / `createAppAuth` are real `jest.fn()`s, **specs need no `jest.mock('@octokit/...')` boilerplate** — and no empty-class stub of `github-app.provider` either. A spec can `import { Octokit } from '@octokit/rest'` and assert on it directly — e.g. `(Octokit as unknown as jest.Mock)` and `expect(Octokit).toHaveBeenCalledWith(...)` — and `jest.clearAllMocks()` in `beforeEach` resets them like any other mock.

**Adding a new ESM-only package that breaks tests:** add one `moduleNameMapper` entry plus a stub file under `test/stubs/` exporting the symbols the app uses as `jest.fn()`s. Do **not** add per-spec `jest.mock` calls for it.

### File placement

Specs in a `__tests__/` dir next to the SUT, `<name>.spec.ts`. Exception: root `app.controller.spec.ts` / `app.service.spec.ts` sit directly beside the code.

### Run

- Scoped: `pnpm --filter backend test -- <spec-name>`.
- Full suite: `pnpm --filter backend test`.
- Never run ESLint, install deps, or run Playwright/E2E.

---

## Use case testing

Use cases in `application/` are **pure functions** taking their ports as arguments.

- **Build:** call the function directly with fake ports (`jest.fn()`); **no testing module**.
- **Assert:** delegation to ports with correct arguments, the returned/composed value, and that a port's rejection propagates.
- Follow the naming convention and `jest.clearAllMocks()` from Common conventions.

```ts
const mockRepository = { findByService: jest.fn() };

it('delegates to the repository with the service id', async () => {
    mockRepository.findByService.mockResolvedValue([]);
    await getDeploymentsByServiceUseCase(mockRepository as never, 'svc-id');
    expect(mockRepository.findByService).toHaveBeenCalledWith('svc-id');
});
```

---

## Infrastructure implementation testing

Infrastructure adapters/providers (e.g. the GitHub provider, external clients wired as Nest providers).

- **Build via the NestJS testing module** when the adapter is a Nest provider: `Test.createTestingModule({ providers: [Adapter, { provide: Dep, useValue: mockDep }] }).compile()`, then `moduleRef.get(Adapter)`.
- Importing a real infrastructure provider can transitively pull in the ESM-only `@octokit/*` libs; these are stubbed globally — see ESM-only third-party libs. A spec may assert directly on the stubbed `Octokit` / `createAppAuth` `jest.fn()`s.

_TODO: full infrastructure-provider conventions (auth flows, pagination assertions) to be documented._

### Infra clients (`docker.client`, `redis.client`)

These are **not** Nest providers.

- **Build via plain instantiation:** `new Client(config)`, and `jest.mock` the transport module (`dockerode`, `ioredis`).
- **Assert:** the transport constructor is called with config-derived options; config fallbacks apply when env vars are absent.

```ts
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ disconnect: jest.fn() })));
const RedisMock = Redis as unknown as jest.Mock;
// new RedisClient(configWith({ REDIS_HOST, REDIS_PORT })) → assert RedisMock called with that host/port
```

### Repositories

_TODO: repository (TypeORM) testing conventions to be documented._

### Transformers / mappers & DTO validation

_TODO: transformer/mapper and DTO-validation testing conventions to be documented._

---

## Service testing

Domain/application services (UI services orchestrating use cases and repositories). Unlike a controller — a thin HTTP boundary — **a service owns and exercises orchestration logic**, so its spec asserts the branching, mapping, and error translation the service itself performs. Reference specs: `apps/backend/src/features/networks/ui/services/__tests__/networks.service.spec.ts` and `apps/backend/src/features/services/ui/services/__tests__/services.service.spec.ts`.

### Building the SUT

- **Build via `Test.createTestingModule` and resolve with `moduleRef.get(...)` (C1).** Register the SUT and every injected collaborator (as a mock value-provider through its real injection token) under `providers: [...]`; `beforeEach` is `async`. Going through the testing module exercises the real DI token bindings — the [documented NestJS approach](https://docs.nestjs.com/fundamentals/testing) — rather than hand-wiring the constructor.
  - **Carve-out — plain `new` only for a zero-dependency utility service.** A service that injects nothing and merely spies on a framework primitive (e.g. `DiagnosticLoggerService`, which only wraps `Logger.prototype`) may use `new SutClass()`. This is the exception, not a free choice: the moment a service injects a collaborator, build it through the testing module.
- **Always mock the delegated use case (C3).** When the service delegates to an `application/` use case, mock that use-case **module** — `jest.mock('../../../application/<name>.use-case')` — and type the reference as `jest.MockedFunction<typeof useCase>`, named `mock<UseCaseName>` per the naming convention. Assert delegation with the **real collaborators the service passes** (`toHaveBeenCalledWith(mockNetworksRepository, service, …args)`) and that the service returns the use case's result unchanged. Do **not** let the real use case run against a mocked repository — that tests the use case, not the service's orchestration, and drifts structurally-identical services apart.
- **Mock injected collaborators (repositories, other providers) through their real injection token**, exposing only the methods the SUT calls (`jest.Mocked<Pick<Repo, 'findById'>>`).

### What a service spec SHOULD assert (C6)

Per public method:

- **Delegation:** the use case / repository is called **once** with the exact real collaborators and arguments the service passes down — `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith(...)`.
- **Return / mapping:** the service returns (or maps) what the collaborator produced — `toBe(result)` for pass-through, `toEqual(...)` for a shape the service composes.
- **Edge cases:** empty list (`toEqual([])`), absent result (`toBeNull()`), config fallbacks.
- **Error propagation:** a collaborator rejection the service does not translate bubbles up unchanged — `rejects.toBe(error)` / `rejects.toThrow(error)`.
- **Error translation the service performs:** a domain error mapped to an `HttpException` (e.g. a missing entity → `NotFoundException`), plus the **short-circuit guard** — assert the downstream collaborator is **not** called on that branch (`expect(mockUseCase).not.toHaveBeenCalled()`).

Do **not** assert framework mechanics you don't own (DI resolution, pipes, validation).

```ts
import { Test } from '@nestjs/testing';

import { getDeploymentsByServiceUseCase } from '../../../application/get-deployments-by-service.use-case';
import { DeploymentsDatabaseRepository } from '../../../infrastructure/database/deployments-db.repository';
import { DeploymentsService } from '../deployments.service';

jest.mock('../../../application/get-deployments-by-service.use-case');

const mockGetDeploymentsByServiceUseCase = getDeploymentsByServiceUseCase as jest.MockedFunction<
    typeof getDeploymentsByServiceUseCase
>;

describe('DeploymentsService', () => {
    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsDatabaseRepository, 'findByService'>>;
    let sut: DeploymentsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockDeploymentsRepository = { findByService: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                DeploymentsService,
                { provide: DeploymentsDatabaseRepository, useValue: mockDeploymentsRepository },
            ],
        }).compile();

        sut = moduleRef.get(DeploymentsService);
    });

    it('delegates to the use case with the repository and service id', async () => {
        mockGetDeploymentsByServiceUseCase.mockResolvedValue([]);

        await sut.getAllByService('svc-id');

        expect(mockGetDeploymentsByServiceUseCase).toHaveBeenCalledTimes(1);
        expect(mockGetDeploymentsByServiceUseCase).toHaveBeenCalledWith(mockDeploymentsRepository, 'svc-id');
    });
});
```

---

## Controller testing

NestJS UI controllers (`ui/controllers/*.controller.ts`). Reference spec: `apps/backend/src/features/services/ui/controllers/__tests__/services.controller.spec.ts` (SUT: `ServicesController`).

A controller is a **thin HTTP boundary**: it delegates to a service and translates the result into an HTTP-facing outcome (return shape, status code, or an `HttpException`). Its spec must verify exactly that boundary — nothing deeper.

### Building the SUT

Use the NestJS testing module. Register the controller under `controllers: [...]` and every injected dependency as a mock value-provider under its real injection token. `beforeEach` is `async`; resolve with `moduleRef.get(...)`.

- **Mock collaborator services with `jest.fn()`s exposing only the methods the controller calls.** Type the mock as `jest.Mocked<Pick<Service, 'methodA' | 'methodB'>>` so the compiler enforces that you stub exactly what the handler invokes.
- Follow the `mock`-prefix naming convention (`mockServicesService`).
- Assign the mock fresh inside `beforeEach` and rely on `jest.clearAllMocks()` to reset call state between tests — this is the stateful case of the module `const` vs. `beforeEach` rule.

```ts
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ServicesService } from '../../services/services.service';
import { ServicesController } from '../services.controller';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const service = { id: serviceId, name: 'api-gateway' } as never;

describe('ServicesController', () => {
    let mockServicesService: jest.Mocked<Pick<ServicesService, 'findById' | 'delete'>>;
    let sut: ServicesController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockServicesService = {
            findById: jest.fn(),
            delete: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ServicesController],
            providers: [
                { provide: ServicesService, useValue: mockServicesService },
            ],
        }).compile();

        sut = moduleRef.get(ServicesController);
    });

    it('delegates to the service with the received id', async () => {
        mockServicesService.findById.mockResolvedValue(service);

        await sut.findById(serviceId);

        expect(mockServicesService.findById).toHaveBeenCalledTimes(1);
        expect(mockServicesService.findById).toHaveBeenCalledWith(serviceId);
    });

    it('throws a NotFoundException when the service does not exist', async () => {
        mockServicesService.findById.mockResolvedValue(null);

        await expect(sut.findById(serviceId)).rejects.toBeInstanceOf(NotFoundException);
    });
});
```

### What a controller spec SHOULD assert

- **Delegation:** the handler calls the collaborator service method **once** with the exact arguments it received (route params, query params, DTO body) — `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith(...)`.
- **Return shape / mapping:** the handler returns what the service produced (`toBe(service)` for pass-through, `toEqual([service])` / `toEqual([])` for lists).
- **HTTP-facing translation the controller itself performs:**
  - Absent result (`null`/`false`) → the controller throws `NotFoundException` (`rejects.toBeInstanceOf(NotFoundException)`), and the thrown message includes the id (`rejects.toThrow(\`Service ${id} not found\`)`).
  - A no-content handler (`@HttpCode(204)`, `Promise<void>`) resolves with no value (`resolves.toBeUndefined()`) on success.
  - Where a controller wraps daemon/adapter errors, assert the mapped exception (e.g. `ServiceUnavailableException`), and that a pre-thrown `HttpException` is rethrown unchanged. Such error-branch tests legitimately emit `logger.error` output — expected, not a failure.
- **Error propagation:** a rejection from the service that the controller does not translate bubbles up unchanged (`rejects.toBe(error)`).

### What a controller spec should NOT do

- **Do not exercise real service logic.** The injected service is always a mock; repository access, use-case orchestration, and validation belong to service tests and lower layers.
- **Do not assert on framework mechanics** you don't own — `ParseUUIDPipe` parsing, routing, and `class-validator` DTO validation run in the HTTP pipeline, not in a controller unit test. Pass already-valid arguments directly to the handler method.

### Testing `@Sse` / `Observable`-returning handlers

A `@Sse`-decorated handler returns an `Observable<MessageEvent>` (not a `Promise`): it pipes the service's domain-event stream through `map` into the SSE shape `{ data: JSON.stringify(event) }`. Test the delegation and the mapping — not RxJS itself. Reference spec: `apps/backend/src/features/logs/ui/controllers/__tests__/logs.controller.spec.ts` (`LogsController.streamLogs`).

- **Mock the collaborator to return an observable, not a promise.** Use `mockReturnValue(of(...events))` (or `mockReturnValue(EMPTY)` for the empty case) — NOT `mockResolvedValue`, which would hand the handler a `Promise` it never awaits.
- **Assert delegation synchronously.** Because the handler returns an `Observable` rather than a `Promise`, the delegation test does not `await`: call `sut.streamLogs(id)` and assert `expect(service.streamLogs).toHaveBeenCalledWith(id)` directly.
- **Verify the SSE mapping by collecting the stream as a Promise.** For a finite/completing stream, pipe through `toArray()` and `await firstValueFrom(...)`, then assert the whole emitted array equals the expected SSE messages.

```ts
import { EMPTY, firstValueFrom, of, toArray } from 'rxjs';
// ...
it('wraps each log event into an SSE message with JSON-encoded data', async () => {
    const events: LogEvent[] = [
        { type: 'line', data: 'building…' },
        { type: 'end', status: 'success' },
    ];
    service.streamLogs.mockReturnValue(of(...events));

    const received = await firstValueFrom(sut.streamLogs(deploymentId).pipe(toArray()));

    expect(received).toEqual([
        { data: JSON.stringify(events[0]) },
        { data: JSON.stringify(events[1]) },
    ]);
});
```

Two RxJS-specific rules for these specs:

- **Empty stream → use `EMPTY`, not `of()`.** The zero-argument `of<T>()` overload is deprecated in RxJS; represent an empty observable with `EMPTY` from `rxjs`. Argument-bearing `of(a, b, …)` is fine and not deprecated.
- **Return a Promise; do not use Jest's `done` callback.** The `jest/no-done-callback` rule flags `it('…', (done) => { … })`. With `done`, a failing `expect` inside a `subscribe`/`complete` callback doesn't fail cleanly — it times out, and an un-handled stream `error` hangs the test. Prefer an `async` test that `await`s `firstValueFrom(obs.pipe(toArray()))` so assertions fail directly and stream errors reject the Promise. (If a mechanical conversion is ever unavoidable, wrap the subscription in a returned `new Promise((resolve, reject) => …)` with try/catch → `reject` in the `complete`/`error` callbacks — but the `toArray()` form is preferred for finite streams.)

### Controller-specific gotchas

- **Provide exactly the dependencies the controller injects — no more, no fewer.** Check the controller's constructor. Every token it injects must be provided or Nest fails to instantiate it; conversely, do NOT register a provider/mock for a class the controller does not inject — that's dead wiring that misleads the next reader. Most UI controllers inject only their sibling service: `ServicesController` injects only `ServicesService`, and `LogsController` only `LogsService`, so each spec provides just that one token. A genuinely-injected-but-uncalled dependency still gets a minimal `{} as unknown as X` stub through its real token — see real injection token. Never substitute an anonymous inline `class {}` (or a `jest.mock('.../x.provider', () => ({ X: class X {} }))`) for the token.
- **Transitive ESM imports.** Importing a controller (or a provider it depends on) can pull in the ESM-only `@octokit/*` libs and break the spec with `Cannot use import statement outside a module`. This is already handled globally — see ESM-only third-party libs. Do not add per-spec `jest.mock('@octokit/...')` and do not stub the product provider with an empty class.

---

## Guards & Passport strategies

- **Build via plain instantiation:** `new Guard(reflectorMock)` / `new Strategy(...mockedPorts)` with a fake `ExecutionContext`.
- For a guard extending Passport's `AuthGuard`, stub the base `canActivate` (spy on the prototype's prototype) so no real strategy runs; drive the `@Public()` branch via the mocked `Reflector`.
