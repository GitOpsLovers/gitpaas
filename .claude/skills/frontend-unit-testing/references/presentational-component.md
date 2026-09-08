# Presentational component testing

A component of `features/*/ui/components/`, of `shared/components/` or of `layout/ui/components/` shows data and emits events. It injects no service, and it uses signal inputs and signal outputs alone.
The canonical reference is `features/projects/ui/components/project-form/project-form.component.spec.ts`.

**Keep the real template**, because the test asserts the rendering itself. Add `provideRouter([])` when the template holds a `routerLink`:

```ts
TestBed.configureTestingModule({
    imports: [ProjectFormComponent],
    providers: [provideRouter([])],
});
```

**Collect the outputs in the `create` helper**, before the first `detectChanges()`:

```ts
const create = (namespaceId = 'ns-1', initialName = ''): void => {
    fixture = TestBed.createComponent(ProjectFormComponent);
    fixture.componentRef.setInput('namespaceId', namespaceId);
    fixture.componentRef.setInput('initialName', initialName);
    component = fixture.componentInstance as unknown as ProjectFormInternals;
    saved = [];
    fixture.componentInstance.save.subscribe((name) => saved.push(name));
    fixture.detectChanges();
};
```

Then assert an emission with `expect(saved).toEqual(['api'])`, and a refusal with `expect(saved).toEqual([])`.

**Read the DOM through a small helper with a return type:**

```ts
const text = (): string => fixture.nativeElement.textContent as string;

const field = (selector: string): Element | null => fixture.nativeElement.querySelector(selector);
```

Query by the role of the element or by its `name` attribute (`button[name="provider-path-operator"]`), and never by a class of Tailwind. Use `fixture.debugElement.query(By.directive(...))` when a test needs the instance of a child component.

**Assert these items:** the rendering of each state of the input, and the text that must not appear; the reaction to a change of an input (`setInput`, then `detectChanges()`); the seed of an internal signal from an input; the emission, with the value that the component computed; the refusal to emit on a blank or invalid value; the attributes of the interaction, such as `button.disabled` and the `href` of a `routerLink`; and the native event:

```ts
const event = new Event('submit');
const preventDefault = vi.spyOn(event, 'preventDefault');
```

Do not assert the classes of Tailwind, and do not assert the markup inside a shared primitive.
