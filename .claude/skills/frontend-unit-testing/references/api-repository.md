# API repository testing

A repository of `features/*/infrastructure/api/` owns the HTTP access of its feature. A read is an `httpResource`, and a mutation is a method of `HttpClient` that returns an `Observable`.
The canonical reference is `features/projects/infrastructure/api/projects-api.repository.spec.ts`.

**Build the SUT.** Register the repository itself, because it is not `providedIn: 'root'`:

```ts
TestBed.configureTestingModule({
    providers: [ProjectsApiRepository, provideHttpClient(), provideHttpClientTesting()],
});

repository = TestBed.inject(ProjectsApiRepository);
httpMock = TestBed.inject(HttpTestingController);
```

**Call `httpMock.verify()` in `afterEach`.** A repository with a collection resource starts a request as soon as a test sets its key signal. Thus drain it first, and write the cause in a comment:

```ts
afterEach(() => {
    // The collection resource loads as soon as a namespace is set; drain it when
    // a test does not exercise it explicitly.
    httpMock.match(BASE_URL).forEach((req) => { req.flush([]); });
    httpMock.verify();
});
```

**A mutation is synchronous in the test.** Subscribe, catch the value, assert the request, flush the answer, and then assert the value:

```ts
let result: Project | undefined;

repository.create(NAMESPACE_ID, { name: 'api' }).subscribe((value) => { result = value; });

const req = httpMock.expectOne(BASE_URL);
expect(req.request.method).toBe('POST');
expect(req.request.body).toEqual({ name: 'api' });
req.flush(project);

expect(result).toEqual(project);
```

**A read needs `TestBed.tick()` after a change of a key signal, and `await settle()` before a read of `value()`.** `signals-and-streams.md` gives the helper `settle` and the whole rule.

**A factory of a resource needs an injection context:**

```ts
const resource = TestBed.runInInjectionContext(() => repository.projectById(() => project.id));
```

**Assert these items:** the URL, built from `environment.apiBaseUrl` and declared one time as `BASE_URL`; the verb; the body of a mutation; the idle condition of a resource (while its key is `undefined`, `httpMock.expectNone(() => true)`, and `value()` is `undefined`); the reaction to a key that changes; the scope of a mutation (a method that receives an identifier targets that identifier, and not the one of the signal); and the fall back of a URL that a signal builds.

Do not assert the interceptors, the retries of Angular or the serialization of JSON.
