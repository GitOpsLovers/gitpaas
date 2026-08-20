# Page testing

A page in `pages/` is thin. It puts the containers together, it holds no logic, and it injects no service. Thus a page needs a spec only when it holds a choice between the containers, or when it passes the parameters of the route on. The canonical reference is `pages/providers/add/provider-add.component.spec.ts`.

**Test the page as a whole, with the real templates of the containers.** The value of the spec is the composition. Thus do not empty the template, and do not double a container.

**Give each container of the page its double of the repository.** Each container gives its own repository. Thus override each one of them in a loop:

```ts
const repository = { create: vi.fn(), startRegistration: vi.fn() };

TestBed.configureTestingModule({
    imports: [ProvidersAddPage],
    providers: [provideRouter([])],
});

for (const container of [ProviderAddComponent, ProviderRegistrationStartComponent]) {
    TestBed.overrideComponent(container, {
        set: { providers: [{ provide: ProvidersApiRepository, useValue: repository }] },
    });
}
```

**Drive the page through the DOM, and not through the class.** The class of the page is almost empty. Thus click the real elements, and then render again:

```ts
const choose = (name: string): void => {
    (fixture.nativeElement.querySelector(`button[name="${name}"]`) as HTMLButtonElement).click();
    fixture.detectChanges();
};
```

**What to assert:** the first state of the screen (which choices appear, and which fields of neither path appear); each branch of the choice (the fields of the chosen path appear, and the fields of the other path do not); and the return to the first state, when the page offers one. The behavior of the container itself belongs to the spec of that container, and not to the spec of the page.
