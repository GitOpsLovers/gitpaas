---
name: typescript
description: The TypeScript conventions of GitPaaS - the declaration, the import, the TSDoc, the format and the construct that this project forbids. Use it before you write or change a `.ts` file of `apps/` or of `packages/`.
---

# The TypeScript of GitPaaS

The rule of the language, for the three packages: `apps/backend`, `apps/frontend` and `packages/contracts`.
The page of `docs/architecture/` that covers a package holds the architecture, and it wins over this skill on a question of the layer, of the folder or of the name of a file.
This skill holds the rule that no page of the architecture states, because it belongs to the language.

Two files carry the authority behind these rules:

- **`eslint.config.mjs`** of each package, which spreads a preset of `@gitopslovers/eslint-config-multistack`. That package holds the rules in `lib/configs/`.
- **`tsconfig.json`** of each package.

You never run ESLint. The user runs it. So you obey the rules by hand.

## 1. The compiler

| The option | `apps/backend` | `apps/frontend` | `packages/contracts` |
| --- | --- | --- | --- |
| `strict` | `true` | not set | `true` |
| `target` | `ES2023` | `ES2022` | `ES2023` |
| `module` | `nodenext` | `preserve` | `nodenext` |
| `isolatedModules` | `true` | `true` | `true` |
| `skipLibCheck` | `true` | `true` | `true` |

The frontend adds `noImplicitOverride`, `noImplicitReturns`, `noPropertyAccessFromIndexSignature` and `noFallthroughCasesInSwitch`, plus `strictTemplates` for the templates of Angular.

`isolatedModules: true` gives the one rule of this table that changes the code that you write: **the compiler examines one file alone.** A type that leaves a file leaves it with `export type`, and a type that enters a file enters it with `import type`. Section 3 gives the form.

**Verify with one command for one package**: `rtk pnpm run check-types --filter @gitpaas/<package>`.

## 2. The declaration

**An object shape is an `interface`.** The rule `consistent-type-definitions` demands it, and an interface gives a shorter message of the compiler.

```typescript
/**
 * A project is the entity used to group different services under one scope
 */
export interface Project {
    id: string;
    name: string;
    description: string;
    namespaceId: string;
    createdAt: Date;
    servicesCount?: number;
}
```

**A `type` takes the four jobs that an interface cannot do**: a union, an alias of a primitive or of a generic, a function type, and the result of an operator of the type system.

```typescript
export type LabelSelector = Readonly<Record<string, string | null>>;
export type RuntimeProgressListener = (event: RuntimeProgressEvent) => void;
type TelemetryEventAuthOutcome = 'authenticated' | 'rejected' | 'anonymous';
export type Project = z.infer<typeof projectSchema>;
```

**A method of an interface is an arrow-function property, and never a method signature.** The rule `method-signature-style` demands the property form. Every port of the backend follows it.

```typescript
export interface ProjectsRepository {
    getAll: (namespaceId: string) => Promise<Project[]>;
    findById: (id: string) => Promise<Project | null>;
}
```

**A shape of the wire lives one time, in `packages/contracts`.** The file `*.contract.ts` declares the schema of Zod, and it derives the type with `z.infer`. An application imports that type; it never writes a copy of the shape.

```typescript
export const projectSchema = z.object({ id: z.uuid(), name: z.string().min(1) });

/**
 * The shape of a project that an answer of the API carries.
 */
export type Project = z.infer<typeof projectSchema>;
```

**A class declares the accessibility of every member.** The rule `explicit-member-accessibility` demands `public` or `private` on each one, and the constructor takes none. A field that no method reassigns takes `readonly`.

```typescript
@Injectable()
export class ProjectsService {
    constructor(
        @Inject(DatabaseProjectsRepository)
        private readonly repository: ProjectsRepository,
    ) {}

    public getAll(namespaceId: string): Promise<Project[]> {
        return getAllProjectsUseCase(this.repository, namespaceId);
    }
}
```

**A collaborator without state is an exported function, and not a class.** Only the adapter, the service, the controller and the component of Angular are classes, because the framework instantiates them.

## 3. The import and the export

**`import type` for an import of a type alone.** The backend holds 579 of them. A port that a class injects always arrives with `import type`, because the port has no value at run time.

```typescript
import type { CreateProjectDto, UpdateProjectDto } from '@gitpaas/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { createProjectUseCase } from '../../application/create-project.use-case';
import type { ProjectsRepository } from '../../domain/repositories/projects.repository';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
```

**One blank line separates one group of imports from the next, and the names inside a group go in alphabetical order.** The example above shows the three groups of a file of a feature of the backend:

1. The package: `@gitpaas/contracts`, `@nestjs/common`, `@angular/core`, `rxjs`, `zod`.
2. The relative import of the same feature.
3. The aliased import of another area: `@core/*`, `@shared/*`, `@features/*`, `@environments/*`.

**Use the alias between two areas, and the relative path inside one feature.** `tsconfig.json` of each application declares the aliases.

| The application | The aliases |
| --- | --- |
| `apps/backend` | `@core/*`, `@features/*`, `@shared/*` |
| `apps/frontend` | `@environments/*`, `@features/*`, `@layout/*`, `@pages/*`, `@shared/*` |

**`packages/contracts` exports through `src/index.ts`, in two lines for one contract**: one `export { … }` for the schemas and the constants, one `export type { … }` for the types. `isolatedModules` demands the second form.

## 4. The TSDoc

**Every exported symbol carries a TSDoc block.** The rule `jsdoc/no-types` forbids a type inside the block, because the signature already holds it.

```typescript
/**
 * Use case for creating a new project inside a namespace
 *
 * @param repository Projects repository
 * @param namespaceId Namespace the project belongs to
 * @param createDto Project data
 *
 * @returns Created project
 */
export function createProjectUseCase(
    repository: ProjectsRepository,
    namespaceId: string,
    createDto: CreateProjectDto,
): Promise<Project> {
    return repository.create({ ...createDto, namespaceId });
}
```

- A blank line of comment separates the description, the block of `@param` and the `@returns`.
- A property of an interface takes a block when its meaning is not obvious, for example a `null` that carries a special condition.
- The house habit writes the type of the return of every exported function, although `explicit-function-return-type` is off.

## 5. The construct that this project forbids

| The construct | The rule | Write this instead |
| --- | --- | --- |
| `void promise` | `no-void` | End the chain with `.catch(…)`. |
| `value!.property` | `no-non-null-assertion` | Narrow the value with an `if`, or handle the `null`. |
| `<Type>value` | `consistent-type-assertions` | `value as Type`, and a type guard before an assertion. |
| `namespace X {}` | `no-namespace` | A module, and its exports. |
| `for (const k in obj)` | `no-restricted-syntax` | `Object.keys`, `Object.values` or `Object.entries`. |
| `{ [key: string]: T }` | `consistent-indexed-object-style` | `Record<string, T>`. |
| A ternary inside a ternary | `no-nested-ternary` | An `if`, or a lookup of a `Record`. |
| `else` after a `return` | `no-else-return` | The statement, with no `else`. |
| `a == b` | `eqeqeq` | `a === b`. A comparison against `null` keeps `==`. |
| `var` | `no-var` | `const`, and `let` when the value changes. |
| `@ts-ignore` | `prefer-ts-expect-error` | `@ts-expect-error`, with a reason. |
| An unused parameter | `no-unused-vars` | A name that starts with `_`. |

The rule `switch-exhaustiveness-check` demands a branch for every member of a union of a `switch`.
The rule `no-deprecated` forbids a call of a symbol that carries `@deprecated`.
`no-explicit-any` is off, and this project still prefers `unknown` with a narrowing.

## 6. The format

| The point | The value |
| --- | --- |
| The indent | 4 spaces |
| The quote | single, and a template literal where it helps |
| The semicolon | always |
| The comma of the last item | always, on a multiline literal |
| The length of a line | 150 characters |
| The block of an `if` | always braced, even for one statement |
| The blank line | one at most, and none at the start or the end of a block |
| The member of an interface | ends with `;` |
| The array | `T[]`, and `Array<T>` for a complex element |

## 7. The reference files

Read one file, and not the folder. The section above answers almost every task; a file below answers a task of the type system alone.

| The file | Read it when |
| --- | --- |
| [declarations.md](references/declarations.md) | You model a union, a discriminated union, a constant, or a shape that another shape derives. |
| [narrowing.md](references/narrowing.md) | You hold an `unknown`, a `null`, or a union, and you need the concrete type. |
| [generics.md](references/generics.md) | You write a generic function, a constraint, or a default of a parameter of a type. |
| [derived-types.md](references/derived-types.md) | You build a type from another type: a conditional, a mapped or a template literal type. |

## 8. The mistake that this project sees

- **A copy of a shape of the wire inside an application.** The type belongs to `packages/contracts`, and the application imports it.
- **A plain `import` of a port.** The interface holds no value, so the build of the frontend or a test double breaks. Write `import type`.
- **A `class` with static methods alone, for a helper.** Export a function.
- **A method signature inside a port** (`getAll(id: string): Promise<Project[]>;`). Write the arrow-function property.
- **An indent of 2 spaces**, copied from an example of the documentation of a third-party tool. This project writes 4.
- **A `type` for an object shape**, where an `interface` is the rule.
