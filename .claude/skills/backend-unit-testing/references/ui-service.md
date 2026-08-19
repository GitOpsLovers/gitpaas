# UI service testing

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
