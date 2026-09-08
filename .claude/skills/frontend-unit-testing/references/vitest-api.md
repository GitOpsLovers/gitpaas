# The API of Vitest

The suite uses the globals of Vitest 4. Never write `import { ... } from 'vitest'`.
This page holds the members that the suite of `apps/frontend` uses. For a member that is absent here, read the site of Vitest.

## The test and the suite

```ts
describe('ProjectsListComponent', () => {
    describe('confirmDelete', () => {
        test('shows the toast of the error and keeps the list', async () => { /* ... */ });
    });
});
```

- `test.skip`, `test.only` and `test.todo` mark one test. Do not commit `only`.
- `test.each([[1, 2], [2, 4]])('doubles %i', (input, output) => { ... })` runs one table.
- An asynchronous test returns a promise. The runner awaits it.

## The hooks

`beforeEach`, `afterEach`, `beforeAll` and `afterAll` take a function. A hook of an outer `describe` runs before a hook of an inner `describe`.
A hook that returns a function runs that function as the cleanup.

## The assertions

| The matcher | It states |
| --- | --- |
| `toBe(value)` | The identity, or a primitive. |
| `toEqual(value)` | The deep equality. Use it for an object and for an array. |
| `toBeUndefined()`, `toBeNull()`, `toBeTruthy()`, `toBeFalsy()` | The empty value. |
| `toContain(item)` | A member of an array, or a substring. |
| `toHaveLength(count)` | The length. |
| `toMatch(regexp)` | The pattern of a text. |
| `toThrow(message)` | The error of a synchronous call. |
| `rejects.toThrow(message)` | The error of a promise. |
| `toHaveBeenCalledWith(...args)` | The exact arguments of a double. |
| `toHaveBeenCalledTimes(count)` | The count of the calls. |
| `not.toHaveBeenCalled()` | The absence of a call. |

`expect.any(String)`, `expect.objectContaining({ ... })` and `expect.stringContaining('...')` match one part of a value.

## The utilities of `vi`

```ts
const reload = vi.fn();                          // A double of a function
repository.create.mockReturnValue(of(project));  // The answer of one Observable
repository.me.mockReturnValueOnce(of(account));  // The answer of the first call alone
const spy = vi.spyOn(document, 'createElement'); // A spy on a member of an object
vi.stubGlobal('fetch', fetchMock);               // A double of a global
```

Read the recorded arguments with `double.mock.calls[0]`.
Undo a spy on a shared object with `vi.restoreAllMocks()`, and a global with `vi.unstubAllGlobals()`.

**Do not use these members:** `vi.useFakeTimers()`, `vi.mock()`, `vi.clearAllMocks()` and `vi.waitFor()`. No spec of the suite uses them.
`signals-and-streams.md` gives the calls that make an asynchronous task happen.
