# Guard and interceptor testing

A guard and an interceptor are functions of `features/*/ui/`. They run in an injection context, and they read the session.
The canonical references are `features/authentication/ui/guards/auth.guard.spec.ts` and `features/authentication/ui/interceptors/auth.interceptor.spec.ts`.

## A guard

**Run the guard inside an injection context, with one helper:**

```ts
const run = (guard: typeof authGuard): boolean | UrlTree =>
    TestBed.runInInjectionContext(() => guard(route, state)) as boolean | UrlTree;
```

**Give the snapshots as plain casts**, with the fields that the guard reads alone:

```ts
const route = {} as ActivatedRouteSnapshot;
const state = { url: '/providers/registrations/created?code=c1' } as RouterStateSnapshot;
```

**Double the router with `createUrlTree`, and give a different `UrlTree` for each destination.** Thus a test asserts the identity of the returned tree, and not its content:

```ts
router = {
    createUrlTree: vi.fn((commands: string[]) =>
        (commands[0] === '/signin' ? signinUrlTree : dashboardUrlTree)),
};
```

**Assert these items:** the pass (`toBe(true)`, and `expect(router.createUrlTree).not.toHaveBeenCalled()`); the redirection (the expected tree, and the exact commands and query parameters); and the return address that the guard carries into the redirection. Put each guard of a file in its own `describe`.

## An interceptor

**Register the interceptor in the real chain, and drive it with a real `HttpClient`:**

```ts
TestBed.configureTestingModule({
    providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenStorageService, useValue: tokenStorage },
        { provide: Router, useValue: router },
    ],
});
```

Always call `httpMock.verify()` in `afterEach`.

**Declare the URLs as module-level constants**: the URL of the API, the URL of the authentication, and a URL of another site.

**Assert the headers on the recorded request, and then flush it:**

```ts
const req = httpMock.expectOne(API_URL);
expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
req.flush({});
```

Simulate a failure with `req.flush(null, { status: 401, statusText: 'Unauthorized' })`.

**Assert these items:** the attachment of the header when the condition holds; the three cases with no attachment (no token, an endpoint of the authentication, a URL of another site); the retry after a refresh (the first request carries the old token, the second carries the new one, and the refresh ran one time); the failure of the refresh (the storage is cleared, and the router opens the sign-in page); the absence of a refresh token; the safety against a loop; and the propagation of an error that is not a 401.
