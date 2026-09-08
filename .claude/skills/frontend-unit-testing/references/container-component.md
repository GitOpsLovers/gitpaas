# Container testing

A container of `features/*/ui/containers/` is the smart screen. It holds the state signals, and it sends the commands.
The canonical reference is `features/projects/ui/containers/projects-list/projects-list.component.spec.ts`.

**Replace the repository at the right level.**

- A container that declares its own `providers` needs `TestBed.overrideComponent`, because its injector wins over the injector of the testing module.
- A container that declares no `providers` takes an ordinary provider of the testing module.

```ts
TestBed.configureTestingModule({
    imports: [ProjectsListComponent],
    providers: [
        provideRouter([]),
        { provide: ToastService, useValue: toast },
    ],
});
TestBed.overrideComponent(ProjectsListComponent, {
    set: {
        template: '',
        providers: [{ provide: ProjectsApiRepository, useValue: repository }],
    },
});
```

Empty the template when the test drives the class alone. Keep the real template when the test asserts what the screen shows. The real template pulls the shared components in. Thus it also needs `provideRouter([])`, `provideHttpClient()` and `provideHttpClientTesting()`.

**Give the router the double with `TestBed.overrideProvider`.** The module already holds `provideRouter([])` for the template. Thus the double replaces it after the configuration:

```ts
TestBed.overrideProvider(Router, { useValue: router });
```

**Read the parameters of the route in the shape that the container uses.** Most containers take them as `input.required<string>()`. Some containers (`namespace-edit`, `provider-edit`, `service-add`, `service-edit`, `signin`, and the two of the registration of a provider) read `ActivatedRoute` instead. Give the second kind a snapshot with the fields that it reads alone:

```ts
TestBed.overrideProvider(ActivatedRoute, {
    useValue: { snapshot: { paramMap: { get: () => routeId } } },
});
```

**Build the fixture with a `create` helper, and call it inside the test.** Thus a test sets a different input, or arranges a double, before the construction:

```ts
const create = (namespaceId = 'ns-1'): void => {
    fixture = TestBed.createComponent(ProjectsListComponent);
    fixture.componentRef.setInput('namespaceId', namespaceId);
    fixture.detectChanges();
    component = fixture.componentInstance as unknown as ProjectsListInternals;
};
```

To change an input later, call `setInput` again, and then `fixture.detectChanges()`.

**Double a resource with an object of signals.** Give the double the members that the container touches, and no other member:

```ts
value = signal<Project | undefined>(undefined);
repository = {
    namespaceId: signal<string | undefined>(undefined),
    projectById: vi.fn().mockReturnValue({ value }),
    projects: { reload: vi.fn() },
};
```

**Assert the accessor that the container gave to a factory of a resource.** Read it out of the recorded call:

```ts
const [idAccessor] = repository.projectById.mock.calls[0] as [() => string | undefined];
expect(idAccessor()).toBe('pr-1');
```

**A mutation is awaited**, because the container calls `lastValueFrom`. Give the double `mockReturnValue(of(undefined))` or `mockReturnValue(throwError(() => new Error('boom')))`, and `await` the method of the container.

**For each container, assert these items:** the scope (the container writes the parameter of the route into the signal of the repository, on the first render and after a change of the input); the exposure of the resource (`expect(component.projects).toBe(repository.projects)`); the first state of the signals; each navigation; the successful command (the call of the repository, the toast of the success, the `reload()`, and the flags that return to their rest value); the failed command (the toast of the error, no `reload()`, no toast of the success, and the flags that return to their rest value); and the short circuit (a confirmation with nothing pending calls no method).
