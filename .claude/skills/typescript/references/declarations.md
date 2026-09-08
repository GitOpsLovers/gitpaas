# The declaration of a type

Read this file when you model a union, a discriminated union, a constant, or a shape that another shape derives.

## The union of literals

A closed set of values is a union of string literals, and never an `enum`. The compiler then checks every branch of a `switch`.

```typescript
type TelemetryEventAuthOutcome = 'authenticated' | 'rejected' | 'anonymous';
```

A value that the code needs at run time takes a constant, and the type derives from it.

```typescript
export const HTTP_REQUEST_EVENT_NAME = 'http.request';
export const DEPLOYMENT_RUN_EVENT_NAME = 'deployment.run';

type TelemetryEventName = typeof HTTP_REQUEST_EVENT_NAME | typeof DEPLOYMENT_RUN_EVENT_NAME;
```

## The discriminated union

Give one shared property a literal type in each member. The compiler narrows the union on that property alone.

```typescript
interface RuntimeProgressStarted {
    kind: 'started';
    service: string;
}

interface RuntimeProgressFailed {
    kind: 'failed';
    service: string;
    error: string;
}

export type RuntimeProgressEvent = RuntimeProgressStarted | RuntimeProgressFailed;

function describe(event: RuntimeProgressEvent): string {
    switch (event.kind) {
        case 'started':
            return `${event.service} started`;
        case 'failed':
            return `${event.service} failed: ${event.error}`;
    }
}
```

A union with an optional property, and no discriminant, forces the reader to guess. Add the discriminant.

## The assertion of a constant

`as const` keeps the literal type, and it makes the object read-only. Use it for a table of values that the code reads and never writes.

```typescript
const RUNTIME_STATES = ['created', 'running', 'exited'] as const;

type RuntimeState = typeof RUNTIME_STATES[number];
// 'created' | 'running' | 'exited'
```

## The shape that derives from another shape

The four utility types below cover almost every case of this project. They need no helper of your own.

```typescript
// The same shape, with every property optional
type PartialProject = Partial<Project>;

// A subset of the properties
type ProjectSummary = Pick<Project, 'id' | 'name'>;

// The shape without one property
type ProjectWithoutCount = Omit<Project, 'servicesCount'>;

// A table with keys of one type and values of another
export type LabelSelector = Readonly<Record<string, string | null>>;
```

`Omit` accepts a name that the source shape does not hold, and it stays silent. So check the name after a rename of a property.

The other utility types that this project uses:

| The type | It gives |
| --- | --- |
| `Readonly<T>` | The shape, with every property read-only. |
| `Required<T>` | The shape, with every optional property required. |
| `NonNullable<T>` | The union, without `null` and without `undefined`. |
| `Exclude<T, U>` | The union `T`, without the members of `U`. |
| `Extract<T, U>` | The members of `T` that `U` holds too. |
| `Awaited<T>` | The value that the promise `T` resolves to. |
| `ReturnType<T>` | The type of the return of the function `T`. |
| `Parameters<T>` | The tuple of the parameters of the function `T`. |

Two examples of the codebase combine them:

```typescript
type PostgresOptions = Extract<DataSourceOptions, { type: 'postgres' }>;
type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;
```

## The property that is optional, and the property that holds `null`

The two carry a different meaning, and this project keeps them apart.

- **`property?: T`** — the shape sometimes omits the property. `servicesCount?: number` of `Project` is an example: a query that does not count the services omits it.
- **`property: T | null`** — the property is always present, and its value is sometimes absent. `publicPort: number | null` is an example: the port exists, and the container publishes no port.

A TSDoc block states the condition of the `null`.

```typescript
/**
 * A container port mapping; `publicPort` is `null` when not published on the host.
 */
export interface RuntimePortMapping {
    privatePort: number;
    publicPort: number | null;
    type: string;
}
```
