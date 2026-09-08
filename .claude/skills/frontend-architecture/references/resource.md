# Async reactivity with a resource

A `Resource` incorporates asynchronous data into the signal-based reactivity of Angular. It reruns
its loader whenever the signal of its key changes, and it exposes the status and the result as
synchronous signals. The application uses `httpResource` and `rxResource` alone, and never the
bare `resource()` with `fetch`.

## `httpResource`

Prefer `httpResource`, from `@angular/common/http`, for a plain HTTP read. It leverages the HTTP
stack of Angular, interceptors included, with the same signal-based API.

```ts
import { httpResource } from '@angular/common/http';

protected readonly project = httpResource<Project>(() => `${environment.apiBaseUrl}/projects/${this.id()}`);
```

## `rxResource`

Use `rxResource`, from `@angular/core/rxjs-interop`, for a read that composes an RxJS stream
(`forkJoin`, `of`, a repository method that already returns an `Observable`).

```ts
import { rxResource } from '@angular/core/rxjs-interop';

public containersByServices(serviceIds: () => string[]) {
  return rxResource<Record<string, Container[]>, string[]>({
    params: serviceIds,
    defaultValue: {},
    stream: ({ params }) => this.readContainersOf(params),
  });
}
```

## Resource status signals

Both give the same signals:

- `value()`: the resolved data, or `undefined`.
- `hasValue()`: a type guard, `true` when a value exists.
- `isLoading()`: `true` while the loader runs.
- `error()`: the error the loader threw, or `undefined`.
- `status()`: `'idle' | 'loading' | 'resolved' | 'error' | 'reloading' | 'local'`.

## Reloading and local mutation

Call `.reload()` to force a rerun without a change of the key. Call `.value.set(...)` to write the
resolved value directly; this moves the status to `'local'`. A container uses this to put a saved
record into a detail view after a mutation, without a reread.
