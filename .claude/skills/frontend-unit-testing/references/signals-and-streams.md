# Signals, resources and streams

The frontend is zoneless and it uses signals. Thus a spec must make the work of the change detection and of the asynchronous tasks happen on purpose. Read this file when the SUT holds a signal, an `httpResource`, an RxJS stream or an SSE stream.

## Which call makes the work happen

| The SUT is | You call |
| --- | --- |
| A component | `fixture.detectChanges()`, after each change of an input and after each event |
| A service or a repository with an effect or a resource | `TestBed.tick()`, after each change of a key signal |
| A resource whose value the test reads | `await settle()`, which yields to the queue and then ticks |

```ts
/**
 * Yields to the macrotask queue and flushes effects so resource signals settle.
 */
async function settle(): Promise<void> {
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    TestBed.tick();
}
```

Do not use `fakeAsync`, `tick()` of `@angular/core/testing` or `vi.useFakeTimers()`. No spec of the suite uses them.

## A double of a resource

Give the double the members that the SUT touches, and make each one a real signal or a `vi.fn()`:

```ts
interface ResourceStub<T> {
    value: WritableSignal<T | undefined>;
    isLoading: WritableSignal<boolean>;
    error: WritableSignal<unknown>;
}
```

Then a test drives the state of the screen with `value.set(...)`, `isLoading.set(true)` or `error.set(new Error('boom'))`, and it renders again. A `reload` member is a `vi.fn()`, and the test asserts the count of its calls.

## An RxJS stream

**Push the values through a real `Subject`.** Give the double the observable of that subject, and then push one value for each step of the test:

```ts
events = new Subject<LogEvent>();
repository = { logs: vi.fn().mockReturnValue(events.asObservable()) };

events.next({ type: 'line', data: 'building the image' });
fixture.detectChanges();

expect(component.lines()).toEqual(['building the image']);
```

Use `of(...)` for a stream that ends at once, `throwError(() => new Error('boom'))` for a failure, and `NEVER` for a call that must stay open while the test asserts a flag such as `submitting()`.

**Assert the end of the subscription with `observed` of the subject.** A component that opens a long stream must close it when the screen closes:

```ts
expect(events.observed).toBe(true);

fixture.componentRef.setInput('open', false);
fixture.detectChanges();

expect(events.observed).toBe(false);
```

## An SSE stream over `fetch`

A repository that reads `text/event-stream` uses `fetch` and a reader of the body. Replace the global, and give a double of the `Response`:

```ts
fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
```

Write a factory of the response that hands the chunks out one `read()` at a time, and a helper that subscribes and resolves when the observable ends:

```ts
function collectLogs(repository: DeploymentsApiRepository, id: string):
Promise<{ events: LogEvent[]; completed?: boolean; error?: unknown }> {
    return new Promise((resolve) => {
        const events: LogEvent[] = [];

        repository.logs(id).subscribe({
            next: (event) => events.push(event),
            error: (error: unknown) => { resolve({ events, error }); },
            complete: () => { resolve({ events, completed: true }); },
        });
    });
}
```

Then `await` that helper, and assert the events, the way the stream ended, and the arguments of `fetch`. Remove the global in `afterEach` with `vi.unstubAllGlobals()`.

**Cover these cases:** the headers of the request (the `Accept` of the events, and the `Authorization` when a token is present); the split of a chunk across two reads; an event with a body that is not valid JSON; the end event; the failed answer (`ok: false`); and the cancel of the subscription.
