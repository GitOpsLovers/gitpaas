# Presentational component testing

A component in `features/*/ui/components/` or in `shared/components/` shows data and emits events. It injects no service, and it uses signal inputs and signal outputs alone. Thus its spec drives the inputs, reads the DOM, and collects the outputs. The canonical reference is `features/projects/ui/components/project-form/project-form.component.spec.ts`.

**Build the SUT.** Import the component into the testing module, and add `provideRouter([])` when the template holds a `routerLink`:

```ts
TestBed.configureTestingModule({
    imports: [ProjectFormComponent],
    providers: [provideRouter([])],
});
```

Keep the real template. A presentational component has no injected collaborator to replace. Thus the test asserts the rendering itself.

**Collect the outputs in the `create` helper.** Subscribe before the first `detectChanges()`, and push the emitted values into an array:

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

Then assert with `expect(saved).toEqual(['api'])` for an emission, and with `expect(saved).toEqual([])` for the refusal to emit.

**Read the DOM through a small helper.** Give the helper the name of what it reads, and give it a return type:

```ts
const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

const field = (selector: string): Element | null => fixture.nativeElement.querySelector(selector);
```

Query by the role of the element or by the `name` attribute (`button[name="provider-path-operator"]`), and not by a class of Tailwind. A class is a decision of the style, and it changes. Use `By.directive(...)` with `fixture.debugElement.query` when the test needs the instance of a child component, such as the in-house select control.

**What to assert:**

- **The rendering of each state of the input**: the text that appears, the text that does not appear (`expect(text()).not.toContain(...)`), and the list of the lines that a loop renders.
- **The reaction to a change of an input**: call `setInput` again, call `detectChanges()`, and assert the new rendering.
- **The seed of a state from an input**: the internal signal takes the initial value, and it follows a later change.
- **The emission**: the output carries the value that the component computed, such as a trimmed name.
- **The refusal to emit**: a blank value or an invalid value emits nothing.
- **The attributes of the interaction**: `button.disabled` while the parent submits, and the `href` of a `routerLink`.
- **The native event**: a handler of a submit calls `preventDefault`. Assert it with a spy on the event:

  ```ts
  const event = new Event('submit');
  const preventDefault = vi.spyOn(event, 'preventDefault');
  ```

Do not assert the classes of Tailwind, and do not assert the internal markup of a shared primitive.
