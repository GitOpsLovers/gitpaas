# Use case testing

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
