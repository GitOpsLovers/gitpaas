# Use-case testing

A use case of `features/*/application/` is a plain exported function. It holds no state, and it maps a value into a different value.
The canonical reference is `features/server/application/map-daemon-health.use-case.spec.ts`.

**Call the function directly.** There is no `TestBed`, no double and no `beforeEach`:

```ts
describe('mapDaemonHealthUseCase', () => {
    test('reports the daemon that answers', () => {
        expect(mapDaemonHealthUseCase(status, undefined)).toEqual({
            state: 'reachable', info: status, message: null,
        });
    });
});
```

- **Assert the whole returned object with `toEqual`**, and never field by field.
- **Give a text of the user a named UPPER_SNAKE constant** above the `describe`. Thus a change of the wording touches one line.
- **Write a small builder for a repeated argument**, as a one-line arrow above the `describe`:

  ```ts
  const httpError = (statusCode: number, body: unknown): unknown => ({ status: statusCode, error: body });
  ```

**Cover these cases:** the successful mapping; each branch of the error; the absent value on each argument; and a shape that is present but is not the expected shape. A use case has no collaborator. Thus there is no delegation to assert.
