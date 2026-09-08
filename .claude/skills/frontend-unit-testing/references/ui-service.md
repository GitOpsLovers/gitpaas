# UI service testing

A service of `features/*/ui/services/` or of `shared/services/` holds the state of the session or of the shell. It injects the repository, the storage and the router, and it does the orchestration.
The canonical reference is `features/authentication/ui/services/auth.service.spec.ts`.

**Build the SUT with a value provider for each collaborator that the service injects, and with no other provider:**

```ts
accessToken = signal<string | null>(null);
repository = { login: vi.fn(), logout: vi.fn(), me: vi.fn() };
tokenStorage = { accessToken, refreshToken: vi.fn(), store: vi.fn(), clear: vi.fn() };
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
```

Register the service itself when it is not `providedIn: 'root'`.

**A signal of a collaborator is a real signal.** Thus a test drives the computed state of the service:

```ts
accessToken.set('access-1');

expect(service.isAuthenticated()).toBe(true);
```

**A method of a collaborator that returns an `Observable` gets `mockReturnValue`.** Use `of(value)` for the success, `throwError(() => new Error('...'))` for the failure, and `NEVER` for a call that must stay open. Never use `mockResolvedValue` for an `Observable`.

**Subscribe to the call of the service, even when the test asserts a side effect alone.** A cold `Observable` does nothing until a subscription. A test of a failure gives an empty handler of the error:

```ts
service.login({ email: 'a', password: 'b' }, false).subscribe({ error: () => {} });
```

**For each public method, assert these items:** the delegation, with the exact arguments; the state that the service writes; the navigation; the branch of the failure (the state stays untouched); the short circuit; and each rule of security that the service holds, such as the refusal of a return address of another site.

Do not assert the resolution of the injection, the real routing or the real HTTP.
