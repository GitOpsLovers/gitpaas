# Use-case testing

A use case in `features/*/application/` is a **plain exported function**. It holds no state, it injects nothing, and it maps a value into a different value. The canonical reference is `features/server/application/map-daemon-health.use-case.spec.ts`.

**Call the function directly.** There is no `TestBed`, no double and no `beforeEach`. Import the function, give it the arguments, and assert the result:

```ts
import { mapDaemonHealthUseCase } from './map-daemon-health.use-case';

describe('mapDaemonHealthUseCase', () => {
    test('The daemon answers', () => {
        expect(mapDaemonHealthUseCase(status, undefined)).toEqual({
            state: 'reachable',
            info: status,
            message: null,
        });
    });
});
```

**Give the expected message a named constant.** A use case that returns a text of the user carries that text one time in the spec, as an UPPER_SNAKE `const` above the `describe`. Thus a change of the wording touches one line.

**Write a small builder for a repeated argument.** A shape that each test needs with two or three changed fields becomes a one-line arrow above the `describe`:

```ts
const httpError = (statusCode: number, body: unknown): unknown => ({ status: statusCode, error: body });
```

**Assert with `toEqual` on the whole returned object.** Do not assert field by field. The use case returns one value; the test states that whole value.

**Cover these cases:** the successful mapping; each branch of the error; the absent value (`undefined` or `null`) on each argument; and the shape that is present but is not the expected shape. A use case has no collaborator. Thus there is no delegation to assert, and no error to propagate.
