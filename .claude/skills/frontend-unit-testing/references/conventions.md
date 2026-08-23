# Common conventions

The conventions come from the suite that exists today.

The frontend has feature folders with layers: `domain/` → `infrastructure/` → `ui/`, plus thin use-case functions in `application/`. These layers occur in each feature (`src/app/features/<feature>/`). Around the features there are three adjacent folders: `src/app/layout/`, `src/app/pages/` and `src/app/shared/`. Each type of SUT has its own rules of construction. **Read this file first, because these rules apply to all the specs.** Then read the reference file for your type of SUT.

- **Write one spec for each source file, adjacent to that file.** The frontend uses no `__tests__/` folder. The spec sits beside its source, with the name `<source-file-name>.spec.ts`. Thus `projects-api.repository.spec.ts` covers `projects-api.repository.ts`, in the same directory. A component spec sits in the flat folder of the component, beside the `.ts` file and the `.html` file.
- **The file names obey `docs/architecture/frontend.md`.** A repository is `<feature>-api.repository.ts`, a use case is `<verb>-<noun>.use-case.ts`, a component is `<name>.component.ts`, and a service is `<name>.service.ts`. The specs use the same names.
- **The globals of Vitest are available, and you import none of them.** `tsconfig.spec.json` declares `"types": ["vitest/globals"]`. Thus `describe`, `test`, `expect`, `vi`, `beforeEach` and `afterEach` need no import. Never write `import { ... } from 'vitest'`.
- **Write `test(...)`, and never `it(...)`.** The whole suite uses `test`. Group the tests with `describe` when the SUT has more than one public operation, and give the `describe` the name of the operation.
- **Write the name of each `test` as a contract of behavior**: `sends…`, `stores…`, `navigates…`, `emits…`, `shows…`, `propagates…`, `does not…`. A name states the behavior of the user or of the caller, and not the name of the method alone.
- **Make the doubles again in `beforeEach`, and do not call `vi.clearAllMocks()`.** Each spec declares its doubles with `let`, and it assigns a new object of `vi.fn()`s in `beforeEach`. A new object needs no reset. This is the dominant pattern of the suite, and it is the opposite of the backend rule.
- **If a spec calls `vi.spyOn` or `vi.stubGlobal`, the spec must undo it.** Add `vi.restoreAllMocks()` or `vi.unstubAllGlobals()` in `afterEach` (see `providers/infrastructure/github/submit-provider-manifest.spec.ts` and `authentication/infrastructure/storage/token-storage.service.spec.ts`).
- **Give the SUT the name of its role, and not the name `sut`.** A component fixture is `fixture`, and its instance is `component`. A repository is `repository`, and a service is `service`. Call a SUT that is a function (a use case or a browser adapter) by its imported name, with no alias.
- **Give each double the name of the role that it replaces**, with no `mock` prefix: `repository`, `router`, `toast`, `tokenStorage`, `authRepository`. The frontend suite drops the prefix that the backend suite uses.
- **Type each double as a structural object of `vi.fn()`s, and not as a mock of the whole class.** Declare only the members that the SUT calls. Thus the compiler shows an error when the SUT starts to call a new member:

  ```ts
  let repository: {
      namespaceId: ReturnType<typeof signal<string | undefined>>;
      projects: { reload: ReturnType<typeof vi.fn> };
      delete: ReturnType<typeof vi.fn>;
  };
  ```

  A signal member of a double is a real `signal()`, and not a `vi.fn()`. Thus the SUT reads it and writes to it as it does in production.
- **Write each fixture of data as a module-level `const`, with the type of the domain model.** Put it above the `describe`, and give a constant of the URL or of the message an UPPER_SNAKE name:

  ```ts
  const NAMESPACE_ID = 'ns-1';

  const project: Project = {
      id: 'pr-1', name: 'api', namespaceId: NAMESPACE_ID, servicesCount: 2,
  };
  ```

- **Write each helper of the spec as a `const` arrow expression inside the `describe`, and give it a return type.** A helper that builds the fixture of the component carries the name `create`, and a helper that reads the DOM carries the name of what it reads (`text`, `field`, `dependencyLines`). An arrow expression does not hoist. Thus declare it before its first use. A helper that needs the hoisting, or that is long, stays a `function` above the `describe`, with one TSDoc block.
- **The path aliases operate in the specs.** `tsconfig.json` maps `@environments/*`, `@features/*`, `@layout/*`, `@pages/*` and `@shared/*`. Use a relative path inside the feature under test. Use an alias for an element of `shared`, of `layout`, of `pages`, of `environments` or of a different feature. The product code obeys the same rule.

## The private members of a component

A container and a component keep almost every member `protected` or `private`, because the template alone reads them. A spec must not change that access. Thus the spec declares an interface of the members that it drives, and it casts the instance one time:

```ts
interface ProjectsListInternals {
    pendingDelete: () => Project | null;
    requestDelete: (project: Project) => void;
    confirmDelete: () => Promise<void>;
}

component = fixture.componentInstance as unknown as ProjectsListInternals;
```

Name the interface `<ComponentName>Internals`, put it under the imports, and declare only the members that the tests call. Declare a signal member as an accessor (`() => T`), and a `model` or a writable signal as the full signal type.

## No injection tokens — and what it means for the doubles

The code never declares a symbol token or a string token for the dependency injection. A class injects the **concrete class** with `inject(...)`, and the tests give a value provider under that same class:

```ts
{ provide: ProjectsApiRepository, useValue: repository }
```

That rule has one effect that is particular to the frontend. A feature repository is **not** `providedIn: 'root'`: the container gives it in its own `providers` array. A provider of the testing module does not win over a provider of the component. Thus you replace it with `TestBed.overrideComponent`, and not with `TestBed.configureTestingModule`. See `container-component.md`.
