# UI service testing

A service in `features/*/ui/services/` or in `shared/services/` holds the state of the session or of the shell. It injects the repository, the storage and the router, and it does the orchestration. The canonical reference is `features/authentication/ui/services/auth.service.spec.ts`.

**Build the SUT.** Use `TestBed` with a value provider for each injected collaborator, and inject the service:

```ts
beforeEach(() => {
    accessToken = signal<string | null>(null);
    repository = { login: vi.fn(), logout: vi.fn(), me: vi.fn() };
    tokenStorage = {
        accessToken,
        refreshToken: vi.fn(() => refreshTokenValue),
        store: vi.fn(),
        clear: vi.fn(),
    };
    router = { navigate: vi.fn(), navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
        providers: [
            AuthService,
            { provide: AuthenticationApiRepository, useValue: repository },
            { provide: TokenStorageService, useValue: tokenStorage },
            { provide: Router, useValue: router },
        ],
    });

    service = TestBed.inject(AuthService);
});
```

Register the service itself as a provider when it is not `providedIn: 'root'`. Give the module the exact collaborators that the service injects, and no other collaborator.

**A signal of a collaborator is a real signal.** Declare it in the `describe`, assign a new `signal(...)` in `beforeEach`, and put that same signal in the double. Thus a test drives the computed state of the service:

```ts
test('reflects the presence of an access token reactively', () => {
    accessToken.set('access-1');

    expect(service.isAuthenticated()).toBe(true);
});
```

**A method of a collaborator that returns an `Observable` gets `mockReturnValue`.** Use `of(value)` for the success, `throwError(() => new Error('...'))` for the failure, and `NEVER` for a call that must stay open. Never use `mockResolvedValue` for an `Observable`.

**Subscribe to the call of the service, even when the test asserts a side effect alone.** A cold `Observable` does nothing until a subscription. A test of a failure gives an empty error handler, so that the failure does not break the run:

```ts
service.login({ email: 'a', password: 'b' }, false).subscribe({ error: () => {} });
```

**For each public method, assert these items:** the delegation (one call, with the exact arguments); the state that the service writes (its own signals, and the calls of the storage); the navigation (`navigate` with the array of the commands, or `navigateByUrl` with the URL); the branch of the failure (the state stays untouched, `expect(...).not.toHaveBeenCalled()`); the idempotence and the short circuit; and each rule of security that the service holds, such as the refusal of a return address of another site.

Do not assert the resolution of the dependency injection, the real routing or the real HTTP.
