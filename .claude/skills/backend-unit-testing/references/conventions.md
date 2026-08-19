# Common conventions

The conventions come from the suite that exists today.

The backend has layers: `domain/` → `infrastructure/` → `ui/`, plus thin use-case functions in `application/`. These layers occur in each feature (`src/features/<feature>/`) and also in the two adjacent folders `src/core/` and `src/shared/`. Each of those folders makes only the layers that it uses. Each type of SUT has its own rules of construction. **Read this file first, because these rules apply to all the specs.** Then read the reference file for your type of SUT.

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

## No injection tokens — and what it means for mocking

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
