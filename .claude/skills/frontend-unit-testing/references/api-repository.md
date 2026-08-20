# API repository testing

A repository in `features/*/infrastructure/api/` owns all the HTTP access of its feature. A read is an `httpResource`, and a mutation is a method of `HttpClient` that returns an `Observable`. The canonical reference is `features/projects/infrastructure/api/projects-api.repository.spec.ts`.

**Build the SUT.** Use `TestBed` with the two testing providers of the HTTP client, and inject both the repository and the controller:

```ts
beforeEach(() => {
    TestBed.configureTestingModule({
        providers: [
            ProjectsApiRepository,
            provideHttpClient(),
            provideHttpClientTesting(),
        ],
    });

    repository = TestBed.inject(ProjectsApiRepository);
    httpMock = TestBed.inject(HttpTestingController);
});

afterEach(() => {
    httpMock.verify();
});
```

Register the repository as a provider itself, because it is not `providedIn: 'root'`.

**A mutation is synchronous in the test.** Subscribe, catch the value in a local variable, assert the method, the URL and the body, flush the answer, and then assert the value:

```ts
let result: Project | undefined;

repository.create(NAMESPACE_ID, { name: 'api' }).subscribe((value) => { result = value; });

const req = httpMock.expectOne(BASE_URL);
expect(req.request.method).toBe('POST');
expect(req.request.body).toEqual({ name: 'api' });
req.flush(project);

expect(result).toEqual(project);
```

**A read needs `TestBed.tick()` and a settle.** An `httpResource` starts the request in an effect, and it writes its value in a later task. Thus call `TestBed.tick()` after you change a key signal, and `await settle()` before you read `value()`:

```ts
/**
 * Yields to the macrotask queue and flushes effects so resource signals settle.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    TestBed.tick();
}
```

`signals-and-streams.md` gives the whole rule of the resources.

**A resource factory needs an injection context.** `projectById(() => id)` makes a resource. Thus call it inside `TestBed.runInInjectionContext`:

```ts
const resource = TestBed.runInInjectionContext(() => repository.projectById(() => project.id));
```

**Drain the collection resource that fires on its own.** A repository with a collection resource keyed by a signal starts a request as soon as a test sets that signal, and `httpMock.verify()` then fails. Drain it in `afterEach`, and write the cause in a comment:

```ts
afterEach(() => {
    // The collection resource loads as soon as a namespace is set; drain it when
    // a test does not exercise it explicitly.
    httpMock.match(BASE_URL).forEach((req) => { req.flush([]); });
    httpMock.verify();
});
```

**What to assert:**

- **The URL**, built from `environment.apiBaseUrl`. Declare `BASE_URL` one time as a module-level `const`.
- **The verb**: `expect(req.request.method).toBe('GET' | 'POST' | 'PUT' | 'DELETE')`.
- **The body** of a mutation: `toEqual(dto)`.
- **The idle condition of a resource**: while a key is `undefined`, `httpMock.expectNone(() => true)` and `resource.value()` is `undefined`.
- **The reaction to a key that changes**: set the new value, tick, and expect the request of the new URL.
- **The scope of a mutation**: a method that receives the identifier as an argument targets that identifier, and not the one that the signal of the repository holds.
- **The fall back of a URL**: a method that reads a signal that may be absent builds the documented URL (for example, an empty segment).

Do not assert the interceptors, the retries of Angular or the serialization of JSON.
