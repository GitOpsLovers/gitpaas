# Container testing

A container in `features/*/ui/containers/` is the smart screen. It receives the parameters of the route as signal inputs, it gives its own repository in `providers`, it holds the state signals, and it sends the commands. The canonical reference is `features/projects/ui/containers/projects-list/projects-list.component.spec.ts`.

**Replace the repository with `overrideComponent`, and not with a provider of the module.** The container declares `providers: [ProjectsApiRepository]`. Thus its own injector wins over the injector of the testing module. Set an empty template at the same time, so that the test drives the class alone:

```ts
TestBed.configureTestingModule({
    imports: [ProjectsListComponent],
    providers: [
        { provide: Router, useValue: router },
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

Keep the real template when a test asserts what the screen shows. Then give the module `provideRouter([])`, `provideHttpClient()` and `provideHttpClientTesting()`, because the real template pulls the shared components in.

**Build the fixture with a `create` helper, and set each input.** The container reads the parameters of the route as `input.required<string>()`, and never through `ActivatedRoute`. Thus a test sets them directly:

```ts
const create = (namespaceId = 'ns-1'): void => {
    fixture = TestBed.createComponent(ProjectsListComponent);
    fixture.componentRef.setInput('namespaceId', namespaceId);
    fixture.detectChanges();
    component = fixture.componentInstance as unknown as ProjectsListInternals;
};
```

Call `create()` inside the test, and not in `beforeEach`. Thus a test can set a different input, or can arrange a double before the construction. To change an input later, call `setInput` again and then `fixture.detectChanges()`.

**Double a resource with an object of signals.** A read of the repository is a resource. Give the double the members that the container touches, and no other member:

```ts
value = signal<Project | undefined>(undefined);
repository = {
    namespaceId: signal<string | undefined>(undefined),
    projectById: vi.fn().mockReturnValue({ value }),
    projects: { reload: vi.fn() },
};
```

**Assert an accessor that the container gave to the repository.** A factory of a resource receives an accessor. Read that accessor out of the recorded call, and assert that it follows the input:

```ts
const [idAccessor] = repository.projectById.mock.calls[0] as [() => string | undefined];
expect(idAccessor()).toBe('pr-1');
```

**A mutation is awaited.** The container calls `lastValueFrom`. Thus give the double `mockReturnValue(of(undefined))` or `mockReturnValue(throwError(() => new Error('boom')))`, and `await` the method of the container.

**For each container, assert these items:** the scope (the container writes the parameter of the route into the signal of the repository, on the first render and after a change of the input); the exposure of the resource (`expect(component.projects).toBe(repository.projects)`); the initial state of the signals; each navigation (`expect(router.navigate).toHaveBeenCalledWith(['/namespaces', 'ns-1', 'projects', 'pr-1'])`); the successful command (the call of the repository, the toast of success, the `reload()`, and the flags that return to their rest value); the failed command (the toast of the error, no `reload()`, no toast of success, and the flags that return to their rest value); and the short circuit (a confirmation with nothing pending calls no method).
