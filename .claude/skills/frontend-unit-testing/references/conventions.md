# Common conventions

These rules apply to every spec of `apps/frontend`. Read this file first, then the one file for your kind of SUT.

## The file and its names

- **Write one spec for each source file, beside that file**, with the name `<source-file-name>.spec.ts`. The frontend uses no `__tests__/` folder.
- **The names of the files obey `frontend-architecture`**: `<feature>-api.repository.ts`, `<verb>-<noun>.use-case.ts`, `<name>.component.ts`, `<name>.service.ts`.
- **Import none of the globals of Vitest.** `tsconfig.spec.json` declares `"types": ["vitest/globals"]`. Never write `import { ... } from 'vitest'`.
- **Write `test(...)`, and never `it(...)`.** Group the tests with `describe` when the SUT has more than one public operation, and give the `describe` the name of the operation.
- **Write the name of a test as a contract of behavior**: `sends…`, `stores…`, `navigates…`, `emits…`, `shows…`, `propagates…`, `does not…`.
- **The path aliases operate in a spec.** Use a relative path inside the feature under test, and an alias (`@shared/*`, `@layout/*`, `@pages/*`, `@environments/*`, `@features/*`) for anything outside it.

## The doubles

- **Make the doubles again in `beforeEach`, and never call `vi.clearAllMocks()`.** Declare each double with `let`, and assign a new object of `vi.fn()`s. A new object needs no reset. This is the opposite of the rule of the backend.
- **Give each double the name of the role that it replaces, with no `mock` prefix**: `repository`, `router`, `toast`, `tokenStorage`.
- **Give the SUT the name of its role, and never the name `sut`.** A fixture is `fixture`, and its instance is `component`. Call a SUT that is a function by its imported name.
- **Type each double as a structural object, and never as a mock of the whole class.** Declare the members that the SUT calls, and no other member. Thus the compiler shows an error when the SUT calls a new member:

  ```ts
  let repository: {
      namespaceId: ReturnType<typeof signal<string | undefined>>;
      projects: { reload: ReturnType<typeof vi.fn> };
      delete: ReturnType<typeof vi.fn>;
  };
  ```

- **A signal member of a double is a real `signal()`, and not a `vi.fn()`.** Thus the SUT reads it and writes to it as it does in production.
- **Undo a spy on a shared object.** A spy on a prototype, on a global, on `document`, on `Date` or on an injected instance needs `vi.restoreAllMocks()` in `afterEach`, and `vi.stubGlobal` needs `vi.unstubAllGlobals()`. A spy on a local object that the test made, such as `vi.spyOn(event, 'preventDefault')`, needs no cleanup.

## The fixtures and the helpers

- **Write each fixture of data as a module-level `const`, with the type of the domain model.** Put it above the `describe`, and give a constant of a URL, of a key or of a message an UPPER_SNAKE name:

  ```ts
  const NAMESPACE_ID = 'ns-1';

  const project: Project = { id: 'pr-1', name: 'api', namespaceId: NAMESPACE_ID, servicesCount: 2 };
  ```

- **Write each helper of the spec as a `const` arrow inside the `describe`, and give it a return type.** A helper that builds the fixture carries the name `create`. A helper that reads the DOM carries the name of what it reads (`text`, `field`, `dependencyLines`). An arrow does not hoist. Thus declare it before its first use.
- **A helper that the whole file shares stays a `function` above the `describe`, with one TSDoc block.** The helper `settle()` of a repository and the factory of a `Storage` take this shape.

## The private members of a component

A container and a component keep almost every member `protected` or `private`, because the template alone reads them. A spec must not change that access. Thus the spec declares an interface, and it casts the instance one time:

```ts
interface ProjectsListInternals {
    pendingDelete: () => Project | null;
    requestDelete: (project: Project) => void;
    confirmDelete: () => Promise<void>;
}

component = fixture.componentInstance as unknown as ProjectsListInternals;
```

Name the interface `<ComponentName>Internals`, put it under the imports, and declare only the members that the tests call. Declare a read-only signal as an accessor (`() => T`), and a `model` or a writable signal as the full type of the signal.

## The injection with no token

The code declares no token of injection. A class injects the **concrete class**, and a spec gives a value provider under that same class:

```ts
{ provide: ProjectsApiRepository, useValue: repository }
```

A repository is not `providedIn: 'root'`. Thus a container that declares its own `providers` needs `TestBed.overrideComponent`, because a provider of the testing module does not win over a provider of the component. See `container-component.md`.
