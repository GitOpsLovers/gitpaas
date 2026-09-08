# Page testing

A page of `pages/` puts the containers together, it holds no logic, and it injects no service. Thus a page needs a spec only when it holds a choice between the containers, or when it passes the parameters of the route on.
The canonical reference is `pages/providers/add/provider-add.component.spec.ts`.

**Test the page as a whole, with the real templates of the containers.** The value of the spec is the composition. Thus do not empty a template, and do not double a container.

**Give each container its double of the repository**, because each container declares its own:

```ts
TestBed.configureTestingModule({ imports: [ProvidersAddPage], providers: [provideRouter([])] });

for (const container of [ProviderAddComponent, ProviderRegistrationStartComponent]) {
    TestBed.overrideComponent(container, {
        set: { providers: [{ provide: ProvidersApiRepository, useValue: repository }] },
    });
}
```

**Drive the page through the DOM, and not through the class:**

```ts
const choose = (name: string): void => {
    (fixture.nativeElement.querySelector(`button[name="${name}"]`) as HTMLButtonElement).click();
    fixture.detectChanges();
};
```

**Assert these items:** the first state of the screen; each branch of the choice (the fields of the chosen path appear, and the fields of the other path do not); and the return to the first state, when the page offers one. The behavior of a container belongs to the spec of that container.
