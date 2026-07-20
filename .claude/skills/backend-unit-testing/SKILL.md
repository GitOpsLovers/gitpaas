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

### Ground rules

- **Mock ports/collaborators as value providers:** `{ provide: <class>, useValue: <mock> }`, structurally mocked with `jest.fn()`. Type via `jest.Mocked<Pick<T, 'usedMethod'>>` (preferred), `jest.Mocked<T>`, or `{} as jest.Mocked<T>`.
- **Keep mocks tight.** Expose only the methods the SUT calls (`Pick`). A narrow mock lets the compiler flag drift when the SUT starts calling something new.
- **`jest.clearAllMocks()` is the first statement of `beforeEach` in every spec** — resets call history and configured returns so nothing leaks. **Spy-based specs do BOTH:** `clearAllMocks()` first in `beforeEach` AND `jest.restoreAllMocks()` in `afterEach` to detach spies and restore originals — `clearAllMocks` alone does not undo a `spyOn`. See `diagnostic-logger.service.spec.ts`.
- **`it` names read as a behavior contract:** `delegates…`, `returns…`, `propagates…`, `throws…`.
- **Spec-local helpers/fixtures are `const` arrow expressions, not `function` declarations** — factories, async-flush helpers, `run(...)` wrappers alike. Caveat: arrows don't hoist, so declare before first use (watch for TDZ errors when converting a hoisted `function`).
- **Path aliases work in specs:** `@core/*` / `@features/*` resolve via `moduleNameMapper` in `jest.config.js`.

### Naming

- **`mock`-prefix (camelCase) on every mocked collaborator, all layers:** `mockServicesService`, `mockDeploymentsRepository`.
- **Use-case function mocks use `mock<UseCaseName>`** (e.g. `mockGetDeploymentsByServiceUseCase`) — not a `…Mock` suffix.
- **A class-instance SUT is always named `sut`** (never the real class name). Function SUTs are the exception — see Use case testing.

### Where to declare a mock — module `const` vs. `beforeEach`

- **Stateful mocks → `let` at `describe` scope, recreated in `beforeEach`.** Stateful = its `jest.fn()`s accumulate asserted call history (`toHaveBeenCalledWith/Times`) or get per-test returns (`.mockResolvedValue`). Recreating per test + `clearAllMocks()` guarantees isolation. Example: `mockServicesService` in `services.controller.spec.ts`.
- **Stateless placeholders → module-level `const` is fine** (e.g. `const mockX = {} as unknown as X;`) — a DI-only dependency the SUT never calls has nothing to reset.
- **Rule of thumb:** the moment a placeholder is called or asserted on, move it to `let` + `beforeEach`.

### Mock a dependency through its real injection token

Register a mock against the **real class token** (import the real class):

- `Test.createTestingModule({ providers: [{ provide: RealClass, useValue: mockRealClass }] })`, or `.overrideProvider(RealClass).useValue(...)`.
- Mock only the methods the SUT calls; if it calls none, a minimal `{} as unknown as RealClass` through the real token is enough.
- **Anti-pattern:** redeclaring an empty local class as the token (`jest.mock('.../x.provider', () => ({ RealClass: class RealClass {} }))`). This bypasses real DI wiring and is not the [documented NestJS approach](https://docs.nestjs.com/fundamentals/testing).

### ESM-only third-party libs (`@octokit/*`) — stubbed centrally

`@octokit/rest` / `@octokit/auth-app` (and transitive deps) are ESM-only; ts-jest compiles app imports to `require()`, and requiring untransformed ESM throws `SyntaxError: Cannot use import statement outside a module`. Any spec whose import graph transitively reaches them (e.g. via `github-app.provider`) hits this.

- **Fix: stubbed once, globally — never per spec.** `moduleNameMapper` in `apps/backend/jest.config.js` redirects each package to a hand-written stub under `apps/backend/test/stubs/` (e.g. `octokit-rest.stub.ts`, `octokit-auth-app.stub.ts`) that exports the used symbols as `jest.fn()`s.
- Because the stubs are real `jest.fn()`s, specs need **no** `jest.mock('@octokit/...')` boilerplate and no empty-class stub of `github-app.provider`. A spec may import and assert on them directly (e.g. `expect(Octokit).toHaveBeenCalledWith(...)`); `clearAllMocks()` resets them like any mock.
- **Adding a new ESM-only package that breaks tests:** add one `moduleNameMapper` entry plus a `test/stubs/` file exporting the used symbols as `jest.fn()`s. Do **not** add per-spec `jest.mock`.

### File placement

Specs live in a `__tests__/` dir next to the SUT, named `<name>.spec.ts`. Exception: root `app.controller.spec.ts` / `app.service.spec.ts` sit directly beside the code.

### Run

- Scoped: `pnpm --filter backend test -- <spec-name>`. Full suite: `pnpm --filter backend test`.
- Never run ESLint, install deps, or run Playwright/E2E.

---

## Use case testing

Use cases in `application/` are **framework-agnostic pure functions** taking ports as arguments — no DI container, no HTTP boundary. Spec them with NestJS **isolated testing**: import the function, call it with fake ports, assert observable behavior. Reference specs: `create-log.use-case.spec.ts` (CRUD delegation), `refresh.use-case.spec.ts` (guards + error branches), `remove-orphaned-containers.use-case.spec.ts` (composition/mapping).

Plus all [Common conventions].

### Building the SUT

- **Call the function directly with fake ports — never a testing module.** No `Test.createTestingModule`, no value-providers, no `moduleRef.get`, no HTTP concerns.
- **No `sut` alias.** The `sut` rule targets class instances; a use case is a function, so invoke it by its imported name (`createLogUseCase(...)`, `refreshUseCase(...)`).

### Canonical port mock

- Declare each port as `jest.Mocked<Pick<Port, 'onlyCalledMethods'>>` (object literal of `jest.fn()`s), then pass it at the call site with a single **`as unknown as Port`** cast (drop the older `as never`).
- **Why the cast:** ports arrive as plain function args, not a typed DI token, so there's no provider machinery to accept the `Pick`. The mock variable stays fully typed, so the compiler still flags drift. Uniform regardless of how many methods are exercised (e.g. `refreshUseCase` casts all three ports this way). A full `jest.Mocked<Port>` is only a rare fallback — prefer the tight `Pick`.
- `mock`-prefix naming per [Common].

### `clearAllMocks` carve-out

- Keep the invariant: with a `beforeEach`, `clearAllMocks()` is its first statement.
- **Carve-out:** a spec that builds every fixture inline, shares no mutable state, and has **no `beforeEach`** need not add one just to hold the reset.

### What to assert — observable behavior only

Assert only what a caller observes; no internals, no DI/HTTP verification.

- **Delegation:** each port method called **once** with exact args — `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith(...)`.
- **Return / mapping / composition:** `toBe(result)` for pass-through; `toEqual({...})` for a composed/mapped shape (e.g. `refreshUseCase` → `{ accessToken, refreshToken }`; `removeOrphanedContainersUseCase` mapping to compose-project names).
- **Edge cases:** `null` (`toBeNull()`), empty list (`toEqual([])`), empty input (port receives `[]`).
- **Error propagation is MANDATORY for CRUD-style use cases:** a `propagates errors…` test with `mockRejectedValue(error)` → `rejects.toThrow(error)` (or `.rejects.toBeInstanceOf(DomainError)` for a translated error).
- **Guards / short-circuits:** on a guarded branch, assert the downstream port/sibling is **not** reached — `expect(mockPort.method).not.toHaveBeenCalled()` (e.g. `refreshUseCase` never calls `revoke` when verification fails or the record is missing).

### Composing use cases — mock the delegated sibling

When a use case orchestrates **another** use case, mock the sibling and assert only this use case's orchestration (mirrors the Service-layer "always mock the delegated use case" rule; keeps structurally-identical orchestrations from drifting). See `refresh.use-case.spec.ts`.

- `jest.mock('<path>/<sibling>.use-case')`, type as `jest.MockedFunction<typeof siblingUseCase>`, name `mock<UseCaseName>`.
- Assert the sibling is called with the exact ports/args forwarded, and that this use case returns the sibling's result unchanged. Do **not** run the real sibling against a mocked repository — that tests the sibling.
- **Carve-out:** a trivial one-line pass-through wrapper (e.g. `loginUseCase` → `issueTokensUseCase`) may run the real sibling, since mocking yields a near-tautological test. Reserve for genuine one-liners with no orchestration of their own.

### Differs from service / controller specs

No DI container / testing module, no injection-token wiring, no HTTP translation — collaborators are **function arguments**, which is why the localized `as unknown as Port` cast exists and why there is no `sut`.

---

## Infrastructure implementation testing

Infrastructure adapters/providers (e.g. the GitHub provider, external clients wired as Nest providers). Plus all [Common conventions].

- **Nest-provider adapters:** build via the testing module — `Test.createTestingModule({ providers: [Adapter, { provide: Dep, useValue: mockDep }] }).compile()`, then `moduleRef.get(Adapter)`.
- Importing a real provider can transitively pull in ESM-only `@octokit/*` — stubbed globally (see ESM-only third-party libs); a spec may assert directly on the stubbed `Octokit` / `createAppAuth` fns.

_TODO: full infrastructure-provider conventions (auth flows, pagination assertions)._

### Infra clients (`docker.client`, `redis.client`)

**Not** Nest providers. See `redis.client.spec.ts`, `docker.client.spec.ts`.

- **Build via plain instantiation** (`new Client(config)`) and `jest.mock` the transport module (`dockerode`, `ioredis`).
- **Assert:** the transport constructor is called with config-derived options; config fallbacks apply when env vars are absent.

### Repositories

_TODO: repository (TypeORM) testing conventions._

### Transformers / mappers & DTO validation

_TODO: transformer/mapper and DTO-validation testing conventions._

---

## Service testing

Domain/application services (UI services orchestrating use cases and repositories). Unlike a controller (a thin HTTP boundary), **a service owns orchestration logic**, so its spec asserts the branching, mapping, and error translation the service performs. Reference specs: `networks.service.spec.ts`, `services.service.spec.ts`, `deployments.service.spec.ts` (delegated-use-case mocking).

Plus all [Common conventions].

### Building the SUT

- **Build via `Test.createTestingModule` + `moduleRef.get(...)`; `beforeEach` is `async`.** Register the SUT and every injected collaborator (mock value-provider through its real token) under `providers`. Going through the module exercises real DI token bindings — the [documented NestJS approach](https://docs.nestjs.com/fundamentals/testing) — not a hand-wired constructor.
  - **Carve-out — plain `new` only for a zero-dependency utility service** that injects nothing and merely spies on a framework primitive (e.g. `DiagnosticLoggerService`, which only wraps `Logger.prototype`). The moment a service injects a collaborator, use the testing module.
- **Always mock the delegated use case.** `jest.mock('../../../application/<name>.use-case')`, type as `jest.MockedFunction<typeof useCase>`, name `mock<UseCaseName>`. Assert delegation with the **real collaborators the service passes** (`toHaveBeenCalledWith(mockRepo, service, …args)`) and that the service returns the result unchanged. Do **not** run the real use case against a mocked repository.
- **Mock injected collaborators through their real token**, exposing only called methods (`jest.Mocked<Pick<Repo, 'findById'>>`).

### What a service spec SHOULD assert (per public method)

- **Delegation:** use case/repository called **once** with the exact real collaborators and args passed down.
- **Return / mapping:** `toBe(result)` for pass-through, `toEqual(...)` for a composed shape.
- **Edge cases:** empty list (`toEqual([])`), absent result (`toBeNull()`), config fallbacks.
- **Error propagation:** an untranslated collaborator rejection bubbles up unchanged (`rejects.toBe/toThrow(error)`).
- **Error translation the service performs:** a domain error mapped to an `HttpException` (e.g. missing entity → `NotFoundException`), plus the **short-circuit guard** — downstream collaborator **not** called on that branch (`expect(mockUseCase).not.toHaveBeenCalled()`).
- Do **not** assert framework mechanics you don't own (DI resolution, pipes, validation).

### Flushing async work in stateful-service specs

A stateful/async service (e.g. an RxJS-driven runner) may need pending micro/macrotasks drained before asserting. The common helper wraps a timer in a Promise — **write the executor with a block body, not an expression body.** See `deployment-runner.service.spec.ts`.

- **Why:** an expression body `(resolve) => setImmediate(resolve)` implicitly returns the handle; the `Promise` constructor ignores it and ESLint/TS flag `no-promise-executor-return`.
- **Fix:** a block body `{ setImmediate(resolve); }` returns nothing, satisfies the rule, and resolves on the next tick. Same for `setTimeout(resolve, 0)` flush helpers.

---

## Controller testing

NestJS UI controllers (`ui/controllers/*.controller.ts`). A controller is a **thin HTTP boundary**: it delegates to a service and translates the result into an HTTP outcome (return shape, status code, or `HttpException`). Verify exactly that boundary — nothing deeper. Reference spec: `services.controller.spec.ts`.

Plus all [Common conventions].

### Building the SUT

- **NestJS testing module:** controller under `controllers: [...]`, every injected dependency as a mock value-provider under its real token; `beforeEach` is `async`; resolve with `moduleRef.get(...)`.
- Mock collaborator services with `jest.fn()`s exposing only called methods (`jest.Mocked<Pick<Service, 'methodA' | 'methodB'>>`), `mock`-prefix naming, assigned fresh in `beforeEach` (the stateful case of the module-`const`-vs-`beforeEach` rule).

### What a controller spec SHOULD assert

- **Delegation:** the handler calls the service method **once** with the exact args received (route/query params, DTO body).
- **Return shape / mapping:** `toBe(service)` for pass-through, `toEqual([service])` / `toEqual([])` for lists.
- **HTTP-facing translation the controller performs:**
  - Absent result (`null`/`false`) → throws `NotFoundException` (`rejects.toBeInstanceOf(NotFoundException)`), message includes the id (`rejects.toThrow(\`Service ${id} not found\`)`).
  - No-content handler (`@HttpCode(204)`, `Promise<void>`) resolves with no value (`resolves.toBeUndefined()`) on success.
  - Where it wraps daemon/adapter errors, assert the mapped exception (e.g. `ServiceUnavailableException`) and that a pre-thrown `HttpException` is rethrown unchanged. Such error-branch tests legitimately emit `logger.error` output — expected, not a failure.
- **Error propagation:** an untranslated service rejection bubbles up unchanged (`rejects.toBe(error)`).

### What a controller spec should NOT do

- **Do not exercise real service logic** — the injected service is always a mock; repository access, use-case orchestration, and validation belong to lower layers.
- **Do not assert framework mechanics** you don't own (`ParseUUIDPipe`, routing, `class-validator` DTO validation run in the HTTP pipeline). Pass already-valid arguments directly to the handler.

### Testing `@Sse` / `Observable`-returning handlers

A `@Sse` handler returns an `Observable<MessageEvent>` (not a `Promise`), piping the service's domain-event stream through `map` into `{ data: JSON.stringify(event) }`. Test delegation and mapping — not RxJS. Reference: `logs.controller.spec.ts` (`LogsController.streamLogs`).

- **Mock the collaborator to return an observable:** `mockReturnValue(of(...events))` (or `mockReturnValue(EMPTY)` for empty) — NOT `mockResolvedValue`, which hands back a `Promise` the handler never awaits.
- **Assert delegation synchronously** — the handler returns an `Observable`, so don't `await`: call `sut.streamLogs(id)` and assert `expect(service.streamLogs).toHaveBeenCalledWith(id)` directly.
- **Verify SSE mapping by collecting the stream:** pipe through `toArray()` and `await firstValueFrom(...)`, then assert the emitted array equals the expected SSE messages.
- **Empty stream → `EMPTY`, not `of()`** (the zero-arg `of<T>()` overload is deprecated; argument-bearing `of(a, b, …)` is fine).
- **Return a Promise; never use Jest's `done` callback** (`jest/no-done-callback`). With `done`, a failing `expect` inside `subscribe`/`complete` times out instead of failing cleanly, and an unhandled stream `error` hangs. Prefer an `async` test that `await`s `firstValueFrom(obs.pipe(toArray()))`. (If a mechanical conversion is unavoidable, wrap the subscription in a returned `new Promise((resolve, reject) => …)` with try/catch → `reject` in `complete`/`error` — but `toArray()` is preferred for finite streams.)

### Controller-specific gotchas

- **Provide exactly the dependencies the controller injects — no more, no fewer.** Check the constructor: every injected token must be provided or Nest fails to instantiate; conversely, don't register a provider for a class it doesn't inject (misleading dead wiring). Most UI controllers inject only their sibling service (e.g. `ServicesController`→`ServicesService`, `LogsController`→`LogsService`). A genuinely-injected-but-uncalled dependency still gets a minimal `{} as unknown as X` stub through its real token. Never substitute an anonymous inline `class {}` (or `jest.mock('.../x.provider', () => ({ X: class X {} }))`).
- **Transitive ESM imports** (importing a controller/provider pulls in `@octokit/*`) are handled globally — see ESM-only third-party libs. No per-spec `jest.mock('@octokit/...')`, no empty-class stub of the product provider.

---

## Guards & Passport strategies

See `jwt-auth.guard.spec.ts`, `jwt.strategy.spec.ts`, `local.strategy.spec.ts`. Plus all [Common conventions].

- **Build via plain instantiation:** `new Guard(reflectorMock)` / `new Strategy(...mockedPorts)` with a fake `ExecutionContext`.
- For a guard extending Passport's `AuthGuard`, stub the base `canActivate` (spy on the prototype's prototype) so no real strategy runs; drive the `@Public()` branch via the mocked `Reflector`.

---

## Exception filters

NestJS `@Catch()` exception filters (`ui/filters/*.filter.ts`) — the same thin UI/framework-primitive family as guards & decorators. A filter owns no orchestration: it shapes every thrown value into a JSON envelope and hands it to the platform adapter. Verify exactly that observable boundary — nothing about the HTTP pipeline. Reference spec: `all-exceptions.filter.spec.ts` (global `AllExceptionsFilter`).

Plus all [Common conventions].

### Building the SUT

- **Build via plain instantiation:** `new AllExceptionsFilter(mockHttpAdapterHost)` — no `Test.createTestingModule` (mirrors guards & strategies). Call `sut.catch(exception, host)` directly.
- **Class-instance SUT is named `sut`** (Common rule).
- **Fake `ArgumentsHost` from `jest.fn()` mocks** via a `const` arrow helper (e.g. `hostFor(request, response)`): `switchToHttp` is a `jest.fn()` returning `{ getRequest, getResponse }`, each a `jest.fn()` handing back the fixture — mirrors the decorator spec's fake `ExecutionContext`.
- **Mock the injected `HttpAdapterHost` structurally**, `mock`-prefixed names (`mockHttpAdapterHost`, `mockReply`, `mockGetRequestUrl`), exposing only the methods the SUT calls (`getRequestUrl`, `reply`) via `jest.Mocked<Pick<HttpAdapterHost['httpAdapter'], …>>` with a single `as unknown as HttpAdapterHost` cast.
- **Spy-based reset pairing:** because the filter spies `Logger.prototype`, do BOTH — `jest.clearAllMocks()` first in `beforeEach` AND `jest.restoreAllMocks()` in `afterEach` (see the Common `clearAllMocks` + `restoreAllMocks` rule).

### What to assert — observable boundary only

- **Reply call:** `httpAdapter.reply` called **once** with `(response, envelope, statusCode)` — identity `toBe(response)` for the response arg, `toEqual({...})` (with `timestamp: expect.any(String)`) for the envelope.
- **Status preserved for `HttpException`:** the subclass's status code and message survive into the envelope (e.g. `NotFoundException` → 404).
- **Validation arrays preserved:** a `BadRequestException` carrying a `message` array keeps it as an array in the envelope.
- **No leakage on unexpected errors:** a non-HTTP `Error` maps to a generic 500 with no internal detail — assert the stack/secret is absent (`JSON.stringify(envelope)` does not contain it).
- **Logging split:** 4xx logs `warn` **once** (`error` not called); 5xx logs `error` **once** with the stack as the 2nd arg (`warn` not called).
- **Do NOT assert framework mechanics** — filter registration, the HTTP pipeline, or how Nest dispatches to `catch()`.

### Product code

Already fully unit-testable by calling `catch()` directly — no refactor needed (like the `Public` metadata decorator). A filter that could not be tested cleanly would follow the decorator's extract-a-testable-unit approach.

---

## Decorator testing

Custom decorators under `ui/decorators/` — param decorators (`createParamDecorator`) and metadata decorators (`SetMetadata` wrappers). Same thin UI/auth-primitive family as guards & strategies: no testing module, plain instantiation/direct calls. Reference specs: `current-user.decorator.spec.ts`, `public.decorator.spec.ts`.

Plus all [Common conventions].

### Param decorators (`createParamDecorator`) — test the extracted factory, not the wrapper

NestJS keeps the factory callback passed to `createParamDecorator` internal, so the wrapper (`CurrentUser`) is unreachable from a spec. Convention: **extract the inline factory into a named, exported arrow** (`currentUserFactory`) and pass it by reference to `createParamDecorator`. This is behavior-preserving — the exported decorator keeps its name and behavior — and makes the extraction logic unit-testable, mirroring the guard/strategy approach (plain function + fake `ExecutionContext`).

- **Fake `ExecutionContext` from `jest.fn()` mocks:** `switchToHttp` returns `{ getRequest }`, where `getRequest` returns the fixture request. Call the factory directly (`currentUserFactory(undefined, context)`) — no testing module.
- **The factory is a pure function → invoke it by its imported name; no `sut` alias** (same rule as use cases).
- **Assert:**
  - returns the exact attached value — `toBe` on an inline fixture typed to the domain model (e.g. `request.user` is the `User`).
  - reads through `switchToHttp().getRequest()` — both mocks called once (`toHaveBeenCalledTimes(1)`).
  - the absent-value edge case — `toBeUndefined()` for an unauthenticated request shape (nothing attached).

### Metadata decorators (`SetMetadata` wrappers, e.g. `Public`) — assert the key and the attached metadata

Already testable as-is — no refactor needed.

- **Pin the metadata key constant to its literal** — `expect(IS_PUBLIC_KEY).toBe('isPublic')`. Guards against silent drift that would break the guard/`Reflector` lookup reading it.
- **Assert the decorator attaches the metadata:** apply it to a throwaway class **and** a method handler in the spec, read it back with a `Reflector` (`reflector.get(KEY, target)`), assert the value (`true`). Cover the undecorated case (metadata `undefined`).
- **Method-handler target — read the function off its descriptor, never `Class.prototype.method`.** An unbound method reference passed to `reflector.get(...)` trips `@typescript-eslint/unbound-method`. Instead read the descriptor's value and type it at the boundary: `const handler = Object.getOwnPropertyDescriptor(Class.prototype, 'handler')?.value as () => void` — the same function object the metadata is attached to, so the assertion is unchanged. Optional-chaining `?.value` avoids a `!` non-null assertion (forbidden by `@typescript-eslint/no-non-null-assertion`), and casting to a concrete function type (`() => void`) keeps `handler` from being `any`, which is what avoids `@typescript-eslint/no-unsafe-argument` when it's passed to `reflector.get(...)`. See `public.decorator.spec.ts`.
