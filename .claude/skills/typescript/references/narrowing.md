# The narrowing of a type

Read this file when you hold an `unknown`, a `null`, or a union, and you need the concrete type.
The rule `no-non-null-assertion` forbids `value!`, so every narrowing below is a check that the code runs.

## The guard of the compiler

Four checks narrow a type with no helper.

```typescript
if (typeof value === 'string') { /* value: string */ }
if (error instanceof ProjectNotFoundError) { /* error: ProjectNotFoundError */ }
if ('publicPort' in mapping) { /* mapping holds publicPort */ }
if (project.servicesCount !== undefined) { /* number */ }
```

A check of truth removes `null` and `undefined`, and it removes `0` and the empty text too. So compare against `null` when zero is a valid value.

```typescript
// Wrong: a public port of 0 takes the branch of the absent port
if (mapping.publicPort) { … }

// Right
if (mapping.publicPort !== null) { … }
```

## The guard that you write

A function that returns `value is T` teaches the compiler the result of a check that it cannot make itself.

```typescript
/**
 * States whether an error carries the code of a conflict of Postgres.
 *
 * @param error Error to examine
 *
 * @returns `true` when the error holds the code of a duplicate key
 */
function isUniqueViolation(error: unknown): error is { code: string } {
    return typeof error === 'object' && error !== null && 'code' in error;
}
```

A guard that lies breaks the compiler in silence, so keep the body and the signature together.

## The value of the wire

`httpResource` and `HttpClient` trust the generic that you declare, and they run no check.
A schema of `@gitpaas/contracts` is the one narrowing that a value of the wire accepts, and a cast is never one.

```typescript
// Wrong: the cast hides a shape that the server changed
const project = response as Project;

// Right: the schema proves the shape
const project = projectSchema.parse(response);
```

## The `catch` block

A caught value is `unknown`. Narrow it before you read a property of it.

```typescript
try {
    await this.service.create(namespaceId, createDto);
} catch (error) {
    throw translateError(error);
}
```

`translateError` of `core/ui/translators/` holds the narrowing of the backend: it examines the domain error, and it gives the HTTP exception. A controller never narrows an error by hand.

## The exhaustive check

The rule `switch-exhaustiveness-check` demands a branch for every member of a union.
A `never` in the default branch makes the compiler fail when a member joins the union later.

```typescript
function describe(event: RuntimeProgressEvent): string {
    switch (event.kind) {
        case 'started':
            return `${event.service} started`;
        case 'failed':
            return `${event.service} failed`;
        default: {
            const unreachable: never = event;

            throw new Error(`Unknown event ${String(unreachable)}`);
        }
    }
}
```

## The assertion, and its one form

The rule `consistent-type-assertions` accepts `value as Type` alone, and never `<Type>value`.
An assertion states a fact that you prove elsewhere, so it takes a comment that names the proof.
The rule `no-unnecessary-type-assertion` forbids an assertion that the compiler already knows.
The rule `non-nullable-type-assertion-style` demands `value as Type` over `value!` when you assert away a `null`.
