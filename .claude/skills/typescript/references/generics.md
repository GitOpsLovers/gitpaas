# The generic

Read this file when you write a generic function, a constraint, or a default of a parameter of a type.
This project uses few generics of its own, because a use case takes a concrete model. Write one when two callers need the same code with a different type, and not before.

## The generic function

The parameter of the type travels from the argument to the return, so the caller keeps its concrete type.

```typescript
/**
 * Gives the first item of a list, or `null` when the list is empty.
 *
 * @param items List to examine
 *
 * @returns First item, or `null`
 */
export function firstOrNull<T>(items: T[]): T | null {
    return items.length > 0 ? items[0] : null;
}

const project = firstOrNull(projects); // Project | null
```

Write the parameter of the type in one line with the name of the function. The house format puts each parameter of the function on its own line when the signature passes 150 characters.

## The constraint

`extends` states the minimum that the type must hold. The compiler then permits the properties of that minimum inside the body.

```typescript
interface HasId {
    id: string;
}

/**
 * Indexes a list of records by the identifier of each one.
 *
 * @param items Records to index
 *
 * @returns Table of the records, by identifier
 */
export function byId<T extends HasId>(items: T[]): Record<string, T> {
    return Object.fromEntries(items.map((item) => [item.id, item]));
}
```

A constraint of `keyof` binds a second parameter to the keys of the first.

```typescript
export function pluck<T, K extends keyof T>(item: T, key: K): T[K] {
    return item[key];
}

const name = pluck(project, 'name'); // string
```

## The default

A default value of a parameter of a type serves the common caller, and the other caller states its own type.

```typescript
export type ApiAnswer<T = void> = {
    data: T;
    requestId: string;
};
```

## The rule of the three uses

A parameter of a type earns its place when it appears three times: the argument, the body and the return.
A parameter that appears one time is a disguised `any`, and a concrete type says more.

```typescript
// Wrong: T carries nothing
function log<T>(value: T): void { … }

// Right
function log(value: unknown): void { … }
```

## The generic of a class of NestJS and of Angular

`httpResource<Project[]>(…)` and `signal<string | undefined>(undefined)` take the shape of the wire of `@gitpaas/contracts`, and never a copy of it.
The generic of `httpResource` is a declaration of trust, and not a check: [narrowing.md](narrowing.md) gives the schema that proves the shape.

The rule `no-unnecessary-type-arguments` forbids a generic argument that repeats the default of the parameter.
