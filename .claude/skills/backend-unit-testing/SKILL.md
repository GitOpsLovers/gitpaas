---
name: backend-unit-testing
description: Use this skill when the user asks you to write or to change the unit tests of the backend application.
---

# Backend unit testing skill

This skill gives the conventions for the unit specs of `apps/backend`. The conventions come from the suite that exists today. The test runner is **Jest with ts-jest**. Its configuration is in `apps/backend/jest.config.js`.

The backend has layers: `domain/` → `infrastructure/` → `ui/`, plus thin use-case functions in `application/`. These layers occur in each feature (`src/features/<feature>/`) and also in the two adjacent folders `src/core/` and `src/shared/`. Each of those folders makes only the layers that it uses. Each type of SUT has its own rules of construction. **Read "Common conventions" first, because those rules apply to all the specs.** Then read the section for your type of SUT.

---

## Running the suite

`apps/backend/package.json` declares two test scripts only: `test` (`jest`) and `test:e2e` (`jest --config ./test/jest-e2e.json`).

```bash
# Full backend suite (run from apps/backend)
rtk pnpm test

# Scoped run — Jest treats the trailing argument as a testPathPattern regex
rtk pnpm test -- projects
rtk pnpm test -- src/features/services/infrastructure/database

# Every app's unit tests, from the repo root (turbo run test)
rtk pnpm test
```

Obey these constraints of the project:

- **Put `rtk` before each shell command.** This rule applies also to `git` and to `gh`.
- **Do not run ESLint.** This is the responsibility of the user.
- **Do not run `test:e2e` or a test that uses Playwright.**
- **Do not install a dependency.** If a package is absent, give the name of the package to the caller.

---

## Common conventions

- **Write one spec for each source file, in a `__tests__/` folder.** The spec stays in a `__tests__/` directory adjacent to the file that it covers, with the name `<source-file-name>.spec.ts`. Thus `__tests__/db-projects.repository.spec.ts` covers `db-projects.repository.ts`. There are two exceptions: `src/app.controller.spec.ts` and `src/app.service.spec.ts` stay adjacent to their sources, and `src/__tests__/bootstrap.spec.ts` covers `src/bootstrap.ts`.
- **The file names obey `docs/backend-architecture.md`.** An infrastructure name is `<technology>-<name>`, and not `<name>-<technology>`: `db-projects.repository.ts`, `db-projects.transformer.ts`, `db-project.entity.ts`, `docker-containers.repository.ts`, `docker-container-runtime.adapter.ts`, `dockerode-docker-executor.adapter.ts`. The specs use the same names.
- **`jest.clearAllMocks()` is the first statement of `beforeEach`** in almost each spec that has a `beforeEach`. If a spec has no shared mutable state and no `beforeEach`, do not add a `beforeEach` only for the reset.
- **If a spec calls `jest.spyOn`, the spec must also restore the spy.** `clearAllMocks()` does not remove a spy. Thus add `jest.restoreAllMocks()` in `afterEach` (see `core/ui/services/__tests__/diagnostic-logger.service.spec.ts` and `features/users/ui/services/__tests__/users.service.spec.ts`).
- **Give the name `sut` to a SUT that is an instance of a class.** Call a SUT that is a function (a use case or an extracted decorator factory) by its imported name, with no alias.
- **Give the prefix `mock` to each collaborator that a mock replaces**: `mockProjectsRepository`, `mockServicesService`, `mockContainerRuntime`, `mockDiagnostics`. The name of a mocked use case is `mock<UseCaseName>` (e.g. `mockCreateProjectUseCase`).
- **Give each mock the most narrow type that the SUT needs**: `jest.Mocked<Pick<T, 'onlyTheMethodsCalled'>>` is the usual form. Thus the compiler shows an error when the SUT starts to call a new method. Use `{} as jest.Mocked<T>` only for a collaborator that the SUT sends to a different function without a call (see the section "UI service testing").
- **Write the name of each `it` as a contract of behavior**: `delegates…`, `returns…`, `maps…`, `propagates…`, `throws…`, `never…`.
- **Write each spec-local fixture and helper as a `const` arrow expression with one TSDoc line.** Where it is of use, give the arrow a `Partial<T>` argument for the overrides:

  ```ts
  /** Builds a project database-entity fixture, overriding only the fields under test. */
  const projectEntity = (overrides: Partial<DbProjectEntity> = {}): DbProjectEntity => ({
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      name: 'gitpaas',
      services: [],
      ...overrides,
  });
  ```

  An arrow expression does not hoist. Thus declare it before its first use.
- **The path aliases operate in the specs.** `jest.config.js` maps `@core/*`, `@features/*` and `@shared/*`, as `tsconfig.json` does. Use a relative path in the feature under test. Use an alias for an element in `core`, in `shared` or in a different feature. The product code obeys the same rule.
- **Central stubs replace the ESM-only Octokit packages.** `@octokit/rest` and `@octokit/auth-app` are ESM-only, and under ts-jest they throw `SyntaxError: Cannot use import statement outside a module`. `moduleNameMapper` sends both packages to the manual stubs in `apps/backend/test/stubs/` (`octokit-rest.stub.ts`, `octokit-auth-app.stub.ts`). Those stubs export the used symbols as `jest.fn()`s. Thus a spec needs **no** `jest.mock('@octokit/...')`, it can import `Octokit` and assert on it directly, and `clearAllMocks()` resets it. If a new ESM-only package breaks the suite, add one entry to `moduleNameMapper` and one stub file, and do not add a `jest.mock` to each spec.

### No injection tokens — and what it means for mocking

The code never declares a symbol token or a string token for the dependency injection. A Nest class injects the **concrete infrastructure class** as the token. The type of the field stays the **port interface**:

```ts
@Injectable()
export class DockerServerPrunerAdapter implements ServerPruner {
    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}
}
```

That rule has two effects on the specs:

1. **In a testing module, give the concrete class as the token**: `{ provide: DockerContainerRuntimeAdapter, useValue: mockContainerRuntime }`. Do not declare a local empty class for the token, and do not invent a string token.
2. **If the spec makes the instance directly, give the mock the type of the concrete class and add one cast at the constructor call.** The declared `Pick` keeps the type of the mock, and the cast satisfies the parameter of the constructor:

   ```ts
   let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'pruneImages'>>;
   sut = new DockerServerPrunerAdapter(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
   ```

   A use-case port arrives as a plain function argument, with no dependency injection. Thus the same single `as unknown as Port` cast applies there.

---

## DTO testing

The DTOs in `features/*/domain/dtos/` are the **authoritative contract of the input**. Each DTO is a class of `class-validator` decorators that the global `ValidationPipe` applies to each body of a request. The spec stays in a `__tests__/` folder adjacent to the DTO, with the name `<dto-name>.dto.spec.ts`. Thus `__tests__/create-deployment.dto.spec.ts` covers `create-deployment.dto.ts`. The canonical references are `features/deployments/domain/dtos/__tests__/create-deployment.dto.spec.ts`, `features/authentication/domain/dtos/__tests__/login.dto.spec.ts` and `features/projects/domain/dtos/__tests__/update-project.dto.spec.ts`.

**Validate through the same path as the production code.** Do not make the instance with `new`, and do not call a controller. Make the instance with `plainToInstance` from `class-transformer`. Then validate the instance with `validateSync` from `class-validator`, **with the same options as the global pipe in `src/bootstrap.ts`** (`whitelist: true`, `forbidNonWhitelisted: true`).

The spec must show the real contract of the runtime, because a different set of options tests a validator that the application does not run. For example, the pipe refuses an unknown property only because `forbidNonWhitelisted` is on. It refuses a number in a string only because the implicit conversion is off. Import `'reflect-metadata'` first, or the metadata of the decorators is not available.

**Each DTO spec has the same three spec-local helpers.** Copy the three helpers into each DTO spec with no change:

```ts
// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { LoginDto } from '../login.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(LoginDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    email: 'admin@gitpaas.dev',
    password: 'sup3r-s3cret',
    ...overrides,
});
```

The type of the payload is `Record<string, unknown>`, and not the type of the DTO. A spec must be able to send an incorrect type, an additional key or an absent key. An HTTP client can send the same data. To remove a property, call `delete payload.<name>` on a new `validPayload()`. To add an incorrect property, use the overrides argument. A DTO spec has no mocks and no `beforeEach`.

**Checklist — every DTO spec covers all of these:**

1. **A valid payload gives zero errors**: `expect(validatePayload(validPayload())).toEqual([])`.
2. **If a required field is absent, the DTO gives the expected constraint keys.** Assert the keys, and not the messages: `isString`, `isNotEmpty`, `isUuid`, `isEmail`, `isInt`, `min`, `isIn`, `isEnum`, `isDate`, `isJwt`. If a field declares more than one rule, use `expect.arrayContaining([...])`. For one key, use `toContain`.
3. **Each rule of format fails with a realistic incorrect value**: an id that is not a UUID (`'service-1'`), an incorrect email (`'admin@'`), a number that is not an integer or that is below the minimum, a value outside an `@IsIn` set, or an incorrect primitive type.
4. **If an optional field is absent, the payload stays valid**: remove the field from a valid payload and expect `[]`.
5. **An unknown property fails with `whitelistValidation`**: `expect(constraintsFor(errors, 'status')).toContain('whitelistValidation')`.
6. **If the DTO declares more than one rule, write one payload that gives several errors together.** Use an empty payload and assert the names of the reported properties. This test shows that the pipe reports the full contract in one response, and not the first failure only:

   ```ts
   it('reports every invalid property at once', () => {
       const errors = validatePayload({});

       expect(errors.map((error) => error.property).sort()).toEqual(
           ['branch', 'commit', 'commitMessage', 'composerPath', 'serviceId', 'triggeredBy'].sort(),
       );
   });
   ```

If a group of fields share the same rules, use `it.each` (`it.each(STRING_PROPERTIES)('requires %s', …)`), and do not repeat one `it` for each field.

**Record these two known behaviours in a test:**

- **`@IsOptional()` does not refuse `null`.** It stops each validator on the property for `undefined` **and** for `null`. Thus a `null` value passes even against `@IsString()` or `@IsIn(...)`. Record that behaviour with a test that has a name — `it('accepts a null error, since IsOptional skips null values', …)` — so that the spec gives the real contract, and not the intended contract.
- **`@IsDate()` without `@Type(() => Date)` refuses an ISO string.** The pipe operates with `transform: true`, but **not** with `enableImplicitConversion`. Thus `plainToInstance` keeps the string as a string, and `isDate` fails. The same applies to a number in a string against `@IsInt()`. Test the refused string and also the accepted `Date` or `number`:

  ```ts
  it('rejects an ISO string expiresAt, since no @Type(() => Date) conversion is declared', () => {
      const errors = validatePayload(validPayload({ expiresAt: '2026-01-01T00:00:00.000Z' }));

      expect(constraintsFor(errors, 'expiresAt')).toContain('isDate');
  });
  ```

**If a DTO has a defect, record the defect and do not correct it.** A DTO can accept data that it must refuse: a name of spaces only with no rule that trims it, a `null` value where the domain needs a value, or an absent `@Type()` that makes an ISO date unusable. Write the test that records the **current** behaviour. Give the `it` a name that gives the cause (`'accepts a whitespace-only name, as no trimming rule is declared'`). Report the defect to the caller. Do not change the DTO in a test task, because the DTO is product code, and a silent change of the rules breaks each client that sends the old shape.

---

## Use case testing

A use case in `application/` is a **function that receives its ports as arguments and that is independent of the framework**. Test it in isolation: import the function, call it with the mocked ports, and assert the observable behavior. Do not use a testing module, a value provider or an HTTP element. The canonical reference is `features/projects/application/__tests__/create-project.use-case.spec.ts`.

**Build the SUT.** Declare each port as `jest.Mocked<Pick<Port, 'onlyCalledMethods'>>` in `beforeEach`. Then give the port to the function with one `as unknown as Port` cast:

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

If a use case receives several ports and the tests repeat the call, put the call in a spec-local `run()` arrow. That arrow applies the casts one time (see `features/authentication/application/__tests__/refresh.use-case.spec.ts`).

If the implementation of a port is a simple value object, a small factory can replace the `Pick`. For example, `features/server/application/__tests__/check-readiness.use-case.spec.ts` makes the `jest.Mocked<HealthProbe>` stubs with the `upProbe(name, up)` and `throwingProbe(name, error)` arrows, because that port has one method and a `name` field.

**Assert only the behavior that a caller sees:**

- **Delegation**: the SUT calls each method of the port one time with the exact arguments — `toHaveBeenCalledTimes(1)` and `toHaveBeenCalledWith(...)`.
- **Return and mapping**: use `toBe(result)` for a value that passes through, and `toEqual({...})` for a composed shape.
- **Edge cases**: absent → `toBeNull()`, empty list → `toEqual([])`, empty input → the port receives `[]`.
- **Error propagation is usual for a use case of the CRUD type**: `mockRejectedValue(error)` with `rejects.toThrow(error)`. If the use case translates the error, use `rejects.toBeInstanceOf(DomainError)` (e.g. `InvalidRefreshTokenError`, `UserInactiveError` from `features/authentication/domain/errors/authentication.errors`).
- **Guards and short circuits**: assert that the SUT does not reach the port that follows — `expect(mockRefreshTokensRepository.revoke).not.toHaveBeenCalled()`.
- **Order**: if the contract of the use case depends on the order, push markers from `mockImplementation` into an `order: string[]` array, then assert `toEqual(['revoke', 'issue'])`.

**If a use case calls a different use case, replace the second use case with a mock.** Call `jest.mock('../<sibling>.use-case')`, give the mock the type `jest.MockedFunction<typeof siblingUseCase>` and the name `mock<UseCaseName>`. Assert the exact ports that the SUT sends, and that the result comes back with no change. Do not run the real second use case against a mocked repository, because that action tests the second use case. If the SUT is a wrapper of one line that only passes the call through, the spec can run the real second use case, because a mock gives no information there.

**A shared pure function** in `src/shared/application/` (`getGitpaasLabels`, `getServiceSlug`) is a use case with no ports. Its spec has no mocks and no `beforeEach`, and it asserts the output for a given input. If the function returns a mutable structure, add a test that shows that each call gives a new object.

---

## UI service testing

A UI service in `features/*/ui/services/` does the orchestration. It holds the injected repositories and adapters, and it sends them to the use cases in `application/`. The canonical reference is `features/projects/ui/services/__tests__/projects.service.spec.ts`.

**Build the SUT.** Use `Test.createTestingModule` with an `async beforeEach`. Register the service and each injected collaborator as a value provider under its concrete class. Then get the SUT with `moduleRef.get(...)`:

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

**Always replace the called use case with a mock.** The use case is a mock. Thus the spec never calls the injected collaborators, and they are only placeholders with an identity. For that cause, `{} as jest.Mocked<DatabaseProjectsRepository>` is the correct shape here. The spec asserts that the service sends *those exact instances*:

```ts
expect(mockDeleteServiceUseCase).toHaveBeenCalledWith(
    mockServicesRepository,
    mockDeploymentsRepository,
    mockServiceRuntimeResources,
    mockLogStore,
    serviceId,
);
```

If the service calls a collaborator **directly**, and does not only send it to a use case, change that collaborator to a `jest.Mocked<Pick<...>>` with real `jest.fn()`s. See `features/users/ui/services/__tests__/users.service.spec.ts`, which stubs the `hash` method of `Argon2PasswordHasherAdapter` and also sends the adapter to `seedAdminUseCase`.

**For each public method, assert these items:** the delegation (one call, with the exact collaborators and arguments); the value that passes through (`toBe`) or the composed shape (`toEqual`); the edge cases of an empty list and of `null`; the error propagation (`rejects.toThrow(error)`); and each error translation or short circuit that the service itself does (`expect(mockUseCase).not.toHaveBeenCalled()`). Do not assert the resolution of the dependency injection, the pipes or the validation.

**A service with a state that RxJS drives** (e.g. `DeploymentRunnerService`) has work in progress. Complete that work before you assert. Use a `flush` helper whose executor has a **block body**. An executor with an expression body returns the handle of `setImmediate` and causes the `no-promise-executor-return` error:

```ts
/** Resolves after pending microtasks, letting the fire-and-forget run settle. */
const flush = (): Promise<void> =>
    new Promise<void>((resolve) => {
        setImmediate(resolve);
    });
```

To drive the stream, push the values through a real `Subject` on the mocked queue (`dequeued$: dequeued.asObservable()`). Then call `await flush()` before you assert.

---

## Controller testing

A controller in `features/*/ui/controllers/` is a **thin HTTP boundary**. It sends the call to the adjacent service and changes the result into an HTTP result. The canonical reference is `features/services/ui/controllers/__tests__/services.controller.spec.ts`.

**Build the SUT.** Use a testing module with an `async beforeEach`. Put the controller in `controllers`, and each injected service as a value provider under its class. Make the mock of the service as a `jest.Mocked<Pick<Service, …>>` of real `jest.fn()`s, and make that mock again for each test:

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

Give the module the exact dependencies that the controller injects, and no other dependency.

**What to assert:**

- **Delegation**: the handler calls the method of the service one time, with the exact arguments that it received.
- **Shape of the return value**: `toBe(service)` for a value that passes through, and `toEqual([service])` or `toEqual([])` for a list.
- **The HTTP translation that the controller does**: an absent result gives `rejects.toBeInstanceOf(NotFoundException)`, with a separate test for the message (`rejects.toThrow(\`Service ${serviceId} not found\`)`); a handler with `@HttpCode(204)` gives `resolves.toBeUndefined()`; a failure of the daemon or of an adapter gives `ServiceUnavailableException` (see the controllers of the containers, of the networks and of the server).
- **Error propagation**: an error with no translation comes back with no change — `rejects.toBe(error)`.
- **Do not** run the real logic of the service or the mechanics of the framework (`ParseUUIDPipe`, the routes, `class-validator`). Give valid arguments directly to the handler.

**For a handler with `@Sse` that returns an `Observable`** (`LogsController.streamLogs`), stub the service with `mockReturnValue(of(...events))` or with `mockReturnValue(EMPTY)`, and never with `mockResolvedValue`. Assert the delegation **synchronously**, because the handler returns an `Observable`. Thus do not use `await` on the handler. Then collect the stream and assert the SSE mapping:

```ts
const received = await firstValueFrom(sut.streamLogs(deploymentId).pipe(toArray()));

expect(received).toEqual([{ data: JSON.stringify(events[0]) }, { data: JSON.stringify(events[1]) }]);
```

For an empty stream, use `EMPTY`, because the `of<T>()` overload with no argument is deprecated. Do not use the `done` callback of Jest.

---

## Database repository testing

A repository in `features/*/infrastructure/database/db-<name>.repository.ts` is a TypeORM adapter over one injected `Repository<Db…Entity>`. It maps the rows of the database into the domain models with a `to<Name>` transformer. The canonical reference is `features/projects/infrastructure/database/__tests__/db-projects.repository.spec.ts`.

**Build the SUT.** Make the instance directly in `beforeEach`, with no testing module. Each database repository injects one `Repository` only. Thus no spec in the suite uses `getRepositoryToken` today:

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

**For each method, assert these items:**

- **Reads** (`find` / `findOne` / `findOneBy`): the SUT calls the TypeORM method one time with the **exact** object of options (`{ id }`, `{ where: { projectId }, order: { id: 'DESC' } }`, or a `find()` with no argument, asserted as `toHaveBeenCalledWith()`). Assert also the mapped domain result, an absent row → `toBeNull()`, and an empty list → `toEqual([])`.
- **Create**: the SUT calls `create` with the DTO (and with each change that the SUT applies), calls `save` with the made entity, and gives the mapped result.
- **Update** (find → `merge` → `save`, or find → change of a field → `save`): assert the merge or the change and the argument of `save`. Assert also the branch that finds nothing, which returns `null` and calls neither `merge` nor `save`.
- **`delete` or `update` that returns `{ affected }`**: test the three cases — `affected: 1` → `true`, `0` → `false`, and `undefined` → `false`. Stub the full shape of the result that the type demands (`{ affected: 1, raw: [] }`).
- **Bulk writes**: under `jest.Mocked<Pick<…>>`, the `create` and `save` overloads of TypeORM become the signature for one entity. Thus a stub with an array needs a local cast, and only there:

  ```ts
  (mockRepository.create as jest.Mock).mockReturnValue(entities);
  (mockRepository.save as jest.Mock).mockResolvedValue(entities);
  ```

  See `features/logs/infrastructure/database/__tests__/db-logs.repository.spec.ts`.

**These elements are not present today:** no database repository uses a QueryBuilder chain, `manager.transaction` or `upsert`. Do not invent a convention for them. If a repository starts to use one of them, add the convention here.

---

## Transformer testing

Each `*.transformer.ts` file has its own spec (`db-projects.transformer.spec.ts`, `docker-container-runtime.transformer.spec.ts`, …). A transformer is a pure function. Thus its spec has no mocks, no `beforeEach` and no alias for the SUT. Use `describe('<functionName>')`, make an input literal with a full type, and assert `toEqual` on the mapped output.

```ts
describe('toService', () => {
    it('maps every service entity field into the domain model', () => {
        const entity: DbServiceEntity = { /* … */ };

        expect(toService(entity)).toEqual({ /* … */ });
    });
});
```

Test each default value and each alternative value that the transformer holds: an empty string in a column, a `null` value, a conversion between an epoch and a date, and an absent optional field. Write one `it` for each behavior.

---

## Container runtime & Docker adapter testing

There is **no `DockerClient` class**. The boundary of Docker is one port in Core: `ContainerRuntime` (`@core/domain/ports/container-runtime.port`). `DockerContainerRuntimeAdapter` (`@core/infrastructure/docker/docker-container-runtime.adapter`) is its only implementation. That adapter owns `dockerode`. It keeps a `Docker` handle from `getClient()` in memory, changes a `RuntimeSelector` into the `filters` of the daemon with `toLabelFilter`, and maps the data of the daemon into the runtime models (`RuntimeContainerSummary`, `RuntimeNetworkSummary`, `RuntimeImageSummary`, `RuntimePruneReport`, `ContainerRuntimeInfo`). In the features, each element that uses Docker calls that port, and never `dockerode`.

### Feature adapters over the runtime port

A Docker adapter or repository of a feature (`features/*/infrastructure/docker/docker-*.adapter.ts` or `docker-*.repository.ts`) injects `DockerContainerRuntimeAdapter` and uses it as a `ContainerRuntime`. Their specs never use `dockerode`. The references are `features/server/infrastructure/docker/__tests__/docker-server-pruner.adapter.spec.ts` (prune → `PruneResult`), `features/containers/infrastructure/docker/__tests__/docker-containers.repository.spec.ts` (list and map), `features/server/infrastructure/docker/__tests__/docker-orphan-containers.adapter.spec.ts` and `features/services/infrastructure/docker/__tests__/docker-service-runtime-resources.adapter.spec.ts` (teardown).

**Build the SUT.** Keep each method of the runtime in its own `jest.Mock`. Put the methods together in a `jest.Mocked<Pick<DockerContainerRuntimeAdapter, …>>`. Then add one cast at the constructor:

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

Write the fixtures as `const` arrows that return the **runtime** models (`RuntimeContainerSummary`, `RuntimePruneReport`, …). Import those models with `import type` from `@core/domain/models/container-runtime.models`.

**Warning: a selector with no marker of ownership permits a query that reaches the control plane and the unrelated stacks of other suppliers on the host.**

**Always assert the marker of ownership in the selector.** Each list, prune and teardown must use the limit `io.gitpaas.managed=true`. `getGitpaasLabels()` in `@shared/application/get-gitpaas-labels.use-case` makes that marker. A selector for one stack adds `project` **in addition to** the marker, and never in place of it. Import the real constants from `@core/domain/constants/gitpaas-labels.constants` (`GITPAAS_MANAGED_LABEL`, `GITPAAS_MANAGED_VALUE`, `GITPAAS_PROJECT_LABEL`, `GITPAAS_CONTROL_PLANE_PROJECTS`), and do not declare them again. Thus a new name for a key makes the spec fail:

```ts
expect(mockListContainers).toHaveBeenCalledWith(
    { labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE }, project: null },
    true,
);
```

**What to assert:**

- **List and map**: the SUT calls the method of the runtime one time with the exact selector, and with `all: true` if the SUT asks for the stopped resources. Assert the mapped domain result, an empty list → `toEqual([])`, the alternative values for the name, the port and the short id, and the `service-<id>` alternative for the project when the name of the service gives an empty slug.
- **Prune**: the SUT calls each prune one time with the managed selector, and maps the `RuntimePruneReport` into a `PruneResult`. Test also the case with the counters at zero.
- **Teardown**: assert the selector for each list operation. Assert that the SUT calls `removeContainer`, `removeNetwork` or `removeImage` with the correct id and options (`{ force: true, removeVolumes: true }`). Assert the branches that protect or that skip a resource with `not.toHaveBeenCalled()`, the counts and names that the SUT returns, and the summary line `mockDiagnostics.log(...)`.
- **Resilience to an error**: the SUT catches one failure of a removal, calls `mockDiagnostics.warn`, and continues the loop — assert the resource that stays.
- **Obedience to the selector, for each operation with a risk of data loss.** The best teardown specs do not give a list with a filter to the SUT. They describe a real host with no filter: the compose stacks of other suppliers, the containers from `docker run` with no label, the control plane, and the containers that GitPaaS manages. `mockListContainers` applies the requested `RuntimeSelector` itself with a spec-local `matchesSelector` helper. Thus a selector that is too wide shows the protected containers and makes the test fail. Copy this shape each time that the SUT removes a resource.

### The runtime adapter itself

`core/infrastructure/docker/__tests__/docker-container-runtime.adapter.spec.ts` is the only spec that knows that `dockerode` exists. It replaces the constructor with a mock of the module. Then it drives the daemon as the production code does, through the `getClient()` method of the adapter, which keeps the client in memory:

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

`FakeDaemon` is a manual interface of `jest.Mock`s, because the types of `dockerode` have too many overloads for a `Pick` of use. Test these items:

- the options of the client (`{ socketPath: '/var/run/docker.sock' }`), and that the adapter gives no other option;
- the client in memory: the adapter makes one client for each of its instances;
- the label filters for each shape of the selector;
- the mapping into the runtime models, for each method;
- the removals, which the adapter sends through `getContainer(id).remove(...)`;
- the prune operations, which give counters at zero as the alternative result.

### The Compose executor

`features/deployments/infrastructure/docker/__tests__/dockerode-docker-executor.adapter.spec.ts` covers `DockerodeDockerExecutorAdapter`. That adapter injects `DockerContainerRuntimeAdapter` and `DiagnosticLoggerService`, and it drives `dockerode-compose`, `tar` and `node:fs/promises`. The spec replaces those three libraries with its own `jest.mock(...)` calls, because they are not the Octokit packages with the central stubs. Build the SUT with an `executorWithDaemon(fakeDaemon)` arrow, which returns a fake daemon from `getClient()`.

The class keeps its logic in private helpers behind one public `up()` method. Thus the spec uses an **intended and documented exception** to the test of the public boundary only: an `ExecutorInternals` interface with types, and `const internals = (sut) => sut as unknown as ExecutorInternals`. A comment at the cast gives the cause.

The first level tests the helpers that give a fixed result:

- the helper that reads a duration;
- the helper that normalizes a build argument;
- the helper that resolves a path;
- the helper that follows a stream of progress.

The second level calls `up()` and asserts:

- the order of the emitted lifecycle lines;
- the order of `down` before `up`, with `mock.invocationCallOrder`;
- the cleanup of the temporary directory in the `finally` block, also when an early step throws an error.

---

## External-API provider testing

`features/providers/infrastructure/github/github-providers.adapter.ts` puts Octokit behind the port of the providers. It makes an authenticated client at the first call, keeps that client in memory, and maps the responses of the SDK into the domain models. The reference is `github-providers.adapter.spec.ts`.

**Build the SUT.** Make the instance directly: `new GithubProvidersAdapter(createConfig(), createDiagnostics())`. `createConfig(values)` and `createDiagnostics()` are `const` arrows that return the stubs of `ConfigService` and of `DiagnosticLoggerService`. The fake client is a small manual `FakeClient { paginate: jest.Mock; request: jest.Mock }`. The overloads of Octokit make `jest.Mocked<Pick<Octokit, …>>` too difficult, and a comment in the spec gives that cause.

**Split the spec into two layers:**

- **Layer A — the mapping, with Octokit in isolation.** Put a spy on the private getter of the client, and make it return the fake client:

  ```ts
  jest.spyOn(sut as unknown as { getClient: () => unknown }, 'getClient').mockReturnValue(mockClient);
  ```

  Then assert the exact endpoints and parameters (`paginate('GET /installation/repositories')`, `request('GET /repositories/{id}', { id: 42 })`), the order of the steps with `toHaveBeenNthCalledWith`, the result in the domain model, the decode steps (the content of a file in base64, the `Buffer` of an archive), and the error translation (`NotFoundException` for content that is not a file). The spec uses a spy. Thus it adds `jest.restoreAllMocks()` in `afterEach`, with `clearAllMocks()`.
- **Layer B — the creation of the client and the authentication, against the stub of the `Octokit` constructor.** Make a real call to the domain and assert: an absent configuration gives a `ServiceUnavailableException`, and the spec never calls the constructor; the exact arguments of the constructor (the strategy of the authentication, the decoded private key, and the numeric id of the installation); and the client in memory, which the adapter makes one time for several calls.

---

## Stateful adapter testing (batching, timers, streams)

`features/logs/infrastructure/database/__tests__/db-log-store.adapter.spec.ts` is the most complex spec in the repository. Use it as the model for each adapter that keeps a batch, that writes the batch on a timer, and that sends one RxJS stream to several subscribers. `DatabaseLogStoreAdapter` injects `LogsRepository`, `DiagnosticLoggerService` and `ConfigService`.

Copy these methods:

- **Use a manual fake in memory, and not `jest.fn()` stubs.** The spec implements the full `LogsRepository` over an array, because the behavior under test needs a real state: the sequences, the replay and the limit of the retention. If you must control a race condition, add a lever for the tests only. Here `holdReads()` returns a callback that releases the reads, and it stops each read. Thus a test can show that the store does not duplicate an entry that becomes durable during the replay.
- **Use a `createStore(retentionHours, maxLines)` arrow.** It makes the SUT again over the shared fakes, with a different configuration. Thus a test of the retention changes one number and does not change the dependency injection. A new store also replaces a restart of the process.
- **Use two helpers that wait, both with a block body**: `settle()` (`setImmediate`) completes the microtasks between two assertions on the stream, and `wait(ms)` (`setTimeout`) gives the time for a real write on the timer. The spec uses no fake timers.
- **Assert a stream in two ways.** For a stream that is already complete, use `await firstValueFrom(store.stream(id).pipe(toArray()))`. If the test mixes the emissions with calls to `append` or to `complete`, use a manual `subscribe` that pushes the values into a `received: LogEvent[]` array, and always call `unsubscribe()` at the end.
- **Test the contract of the lifecycle, and not the implementation:**
  - the store keeps the batch below the limit of the size;
  - the store writes the batch at the limit;
  - the store writes the batch at the end of the interval;
  - the store writes the batch on `onModuleDestroy()`;
  - the sequence of each deployment increases, and continues from the maximum value in the database;
  - the change from the replay to the live stream has no gap and no duplicate;
  - a terminal event completes the stream;
  - `unsubscribe()` stops the delivery;
  - a purge removes the durable rows and also the batch in memory;
  - the retention removes the data by the limit of the lines and by the age, and the disabled case removes nothing;
  - the store sends a failure to `diagnostics.error` and does not reject.

---

## Passport strategies, guards, filters and decorators

These elements are thin primitives of the framework. Each spec makes the instance **directly**, with no testing module, and makes a fake context from `jest.fn()`s.

**Passport strategies** (`features/authentication/infrastructure/passport/`): make the instance with the mocked ports, and replace the called use case with `jest.mock`. Assert the delegation and the error translation of the strategy: each domain error becomes an `UnauthorizedException`, and the strategy throws an unexpected error again with no change (`rejects.toBe(boom)`).

**Guards** (`features/authentication/ui/guards/`): use `new JwtAuthGuard(mockReflector as unknown as Reflector)`. Stub the base class of Passport, so that no real strategy operates:

```ts
superCanActivate = jest
    .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype) as JwtAuthGuard, 'canActivate')
    .mockReturnValue(true);
```

Make the `ExecutionContext` with a `contextFor()` arrow. Its `getHandler` and `getClass` are `jest.fn()`s that return a stable handler and a class for the test only. Assert that the `@Public()` branch returns `true`, that it reads `IS_PUBLIC_KEY` with `[handler, class]`, and that it never calls the base class. Assert that the `false` branch and the `undefined` branch both send the call to the base class with the context. Always keep the returned value in a variable (`const result = sut.canActivate(context)`), and do not discard the call. The spec uses a spy, and thus it needs an `afterEach` with `restoreAllMocks()`.

A subclass of `AuthGuard` with no behavior (`LocalAuthGuard extends AuthGuard('local') {}`) gets a **minimum spec** only. That spec shows that the class makes an instance and that it gives the contract of Passport (`typeof sut.canActivate`, `handleRequest`, `logIn`). Do not assert the private names of the strategies, and do not invent a behavior.

**Exception filters** (`core/ui/filters/`): use `new AllExceptionsFilter(mockHttpAdapterHost)`, and call `sut.catch(exception, host)` directly. Make the `ArgumentsHost` with a `hostFor(request, response)` arrow whose `switchToHttp` returns `{ getRequest, getResponse }`. Assert the observable boundary only:

- the filter calls `reply` one time with `(response, envelope, statusCode)`: use `toBe` for the identity of the response, and `toEqual` with `timestamp: expect.any(String)` for the envelope;
- the filter keeps the status and the message of an `HttpException`;
- the filter keeps the message array of a `BadRequestException` as an array;
- the filter changes a simple `Error` into a generic 500 with no stack: assert that `JSON.stringify(envelope)` does not contain the stack;
- the filter writes one warning for a 4xx error, and one error for a 5xx error with the stack as the second argument.

The filter puts a spy on `Logger.prototype`. Thus restore the spy in `afterEach`.

**Decorators** (`features/authentication/ui/decorators/`):

- *Parameter decorators.* NestJS keeps the callback of `createParamDecorator` internal. Thus the code **extracts and exports** the factory, and gives `currentUserFactory` to `createParamDecorator` by reference. The spec calls `currentUserFactory(undefined, context)` directly, with a fake `ExecutionContext`. It asserts the exact value that the code attaches (`toBe` on a `User` fixture), that it calls both mocks of the context one time, and the case with no authentication (`toBeUndefined()`).
- *Metadata decorators.* Assert the literal value of the key (`expect(IS_PUBLIC_KEY).toBe('isPublic')`). Apply `Public()` to a class and to a method that you use for the test only, then read the metadata with a real `Reflector`. Test also the case with no decorator. To get a method, use its descriptor — `Object.getOwnPropertyDescriptor(Class.prototype, 'handler')?.value as () => void`. Do not use `Class.prototype.method`, because it causes the `@typescript-eslint/unbound-method` error.

---

## Config, constants and bootstrap

The modules of simple functions in `core/infrastructure/config/` and in `core/infrastructure/database/` are tested as pure functions. `env-validation.config.spec.ts` is the model. Import `'reflect-metadata'` first, then make a `validEnv()` arrow that returns a complete environment. Assert the correct case, one test for each absent or incorrect variable, the message that groups several errors, and the changes of a string into a number. The spec also asserts the **absences**: the application needs no `DOCKER` variable, and it accepts a removed variable as an additional value with no validation. Thus a removed feature stays removed.

A file of constants gets a spec only if the value itself is a contract (e.g. `GITPAAS_CONTROL_PLANE_PROJECTS` must be equal to `['gitpaas', 'gitpaas-dev']`).

---

## Known inconsistencies — follow the dominant pattern

Some older specs are different. If you change one of these specs, use the dominant convention. Do not copy the minority convention into a new spec.

| Topic | Dominant pattern (use this) | Minority exceptions |
| --- | --- | --- |
| SUT variable name | `sut` | `probe` (health probes), `hasher` (`argon2-password-hasher.adapter.spec.ts`), `strategy` (`local.strategy.spec.ts`), `store` (`db-log-store.adapter.spec.ts`) |
| Mocked collaborator name | with the `mock` prefix | no prefix: `query`, `dataSource`, `client`, `usersRepository`, `deploymentsRepository`, in the health-probe, strategy and queue-adapter specs |
| Mocked use-case name | `mock<UseCaseName>` | `validateUserUseCaseMock` in `local.strategy.spec.ts` |
| Spec-local fixture builders | `const` arrow | `function entity(...)` and `function createRepository()` in `db-deployment-queue.adapter.spec.ts` and `db-log-store.adapter.spec.ts` |
| `jest.clearAllMocks()` first in `beforeEach` | yes | absent in the health-probe, argon2 and queue-adapter specs |
| `restoreAllMocks()` when spying | restore in `afterEach` | `db-log-store.adapter.spec.ts` uses a spy with no explicit restore |
