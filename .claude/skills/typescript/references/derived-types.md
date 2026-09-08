# The type that derives from another type

Read this file when `Pick`, `Omit`, `Partial` and `Record` do not cover the case, and you must build a type from another type.
[declarations.md](declarations.md) holds those four, and they cover almost every task of this project.

A derived type costs the reader time. Write one when it removes a real duplication, and write a plain `interface` in every other case.

## The conditional type

`A extends B ? X : Y` picks a type from a condition.

```typescript
type Unwrap<T> = T extends Promise<infer R> ? R : T;

type A = Unwrap<Promise<Project>>; // Project
type B = Unwrap<Project>;          // Project
```

`infer` names a type that the compiler finds inside the pattern. `Awaited` and `ReturnType` of the standard library already do the two common cases, so use them first.

A conditional type over a union distributes over each member, one at a time.

```typescript
type ToArray<T> = T extends unknown ? T[] : never;

type C = ToArray<string | number>; // string[] | number[]
```

Wrap the two sides in a tuple to stop the distribution.

```typescript
type ToOneArray<T> = [T] extends [unknown] ? T[] : never;

type D = ToOneArray<string | number>; // (string | number)[]
```

## The mapped type

A mapped type walks the keys of a shape, and it gives one property for each key.

```typescript
type Nullable<T> = {
    [K in keyof T]: T[K] | null;
};

type NullableProject = Nullable<Project>;
```

A modifier adds or removes `readonly` and `?`. The prefix `-` removes one.

```typescript
type Writable<T> = {
    -readonly [K in keyof T]: T[K];
};

type Complete<T> = {
    [K in keyof T]-?: T[K];
};
```

`as` renames a key, and `never` drops it. The example below keeps the keys whose value is a `string`.

```typescript
type StringKeysOnly<T> = {
    [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type ProjectText = StringKeysOnly<Project>;
// { id: string; name: string; description: string; namespaceId: string }
```

## The template literal type

A template literal type states the pattern of a text.

```typescript
type LabelKey = `gitpaas.${string}`;
type RouteOfResource<T extends string> = `/api/v1/${T}` | `/api/v1/${T}/${string}`;
```

The four helpers of the compiler change the case: `Uppercase`, `Lowercase`, `Capitalize` and `Uncapitalize`.

```typescript
type Getters<T> = {
    [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

A pattern of a template literal type checks a literal alone. It never checks a `string` that arrives at run time, so a value of the wire still needs the schema of `@gitpaas/contracts`.

## The limit

- A derived type that another derived type feeds, three levels deep, slows the compiler and hides the shape. Name the middle step in its own `type`.
- A recursive conditional type stops at the limit of the compiler, and the message names no line of your code. Prefer a plain shape.
- `keyof` over an index signature gives `string | number`, and not the keys that you expect. `Record<K, T>` with a union `K` gives the keys.
