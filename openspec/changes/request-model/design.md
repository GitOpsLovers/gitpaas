## Context

A endpoint of the backend declares its contract with three separate artifacts: a class of `class-validator`
for the body, a built-in pipe for each value of the path and of the query, and the return type of the method
for the answer. There is no description of the answer at run time. The envelope of the error has one shape
for the whole API, and its interface is not exported, so no consumer can use it.

The frontend gives the shape of the wire as a type argument that a developer writes by hand.
`httpResource<T>` and `HttpClient.post<T>` do no check. The type argument is an assertion: the compiler
believes it, and the browser accepts whatever arrives. Thus a change of the shape in the backend gives no
failure of the compilation and no failure at run time. It gives a value that is not defined, in a template.

`pnpm-workspace.yaml` already declares `packages/*`, so the directory only has to exist. `turbo.json`
exists at the root, and it declares nine tasks: `build`, `test`, `lint`, `dev`, `watch`, `start`,
`start:debug` and `start:prod`. The tasks `build` and `test` already carry `dependsOn: ["^build"]`, so a
package of the workspace builds before the applications that read it. No task checks the types, and no task
generates an artifact.

## Goals / Non-Goals

**Goals:**

- One artifact describes each shape of the wire, and the compiler of the two applications reads it.
- A change of the shape that breaks a consumer fails the pull request, and not the browser.
- The specification of the API is a generated artifact of that one source, and never a document that a human
  keeps equal.

**Non-Goals:**

- A generated client of HTTP. The consumer must keep `HttpClient` and `httpResource`.
- A step of RPC. GitPaaS has no traffic between services to convert.
- The move of the validation of the environment to Zod. It is no contract of the wire, and it is a separate
  decision.
- The check of its own answers by the server at run time. The compiler proves the shape, and a parse for
  each answer costs time in the hot path. An open question keeps a check for the development only.
- The internal data transfer objects. The backend holds 23 files of a data transfer object, and 13 of them
  bind a body. The other ten are shapes between the layers, and no contract of the wire. They stay.
- The deletion of `apps/frontend/src/app/features/source-control/`. The folder is dead, and no file outside
  it imports it, but its removal changes no behavior and needs no contract. A separate change deletes it.

## Decisions

**1. Zod, in the version 4.**

- One artifact gives the two things that this repository needs: a validator at run time, and a static type.
  `class-validator` gives only the validator, and an interface gives only the type. That is the reason for
  the two files of today.
- It operates in the browser. A class of `class-validator` needs the decorators, the metadata of the
  emission and `reflect-metadata`, and it must stay a class at run time. The frontend has none of that, and
  it must not get it. A schema of Zod is a plain value.
- The frontend pays nothing where it wants only the type, because an import of a type is erased at the
  build. The run time enters the bundle only where the frontend parses.
- `z.strictObject` refuses a property that the schema does not declare, which is the behavior that the
  global pipe gives today.

**Alternative that the change does not take:** `@nestjs/swagger` over the classes of today. It gives a
specification, and the contract stays inside the backend. The frontend still copies the shapes by hand, or a
second chain of tools makes a client from the specification. The source of the truth must be the schema, and
the specification must be the generated artifact.

**2. The package describes the wire, and not the database and not the domain.**
A timestamp is a text of the ISO form. A domain model of the backend keeps its `Date`, and the layer of the
UI converts. A secret never enters a shape of an answer, so the hash of the password is not in the package,
and the private key of a provider is not in it either.

**3. The package imports nothing from `apps/`.**
Its one dependency at run time is `zod`. This is the rule that keeps NestJS out of the frontend and Angular
out of the backend.

**4. The two systems of the validation live together during the migration.**
The global pipe of Nest validates only when the type of the parameter is a class. An inferred type erases to
an object, so the global pipe lets it pass and the local pipe of Zod is the one validator. There is no
double validation. The global pipe goes away when the last class of a body goes away.

**5. The pipe keeps the shape of the message of today.**
The pipe raises the exception of the bad request with an **array** of messages, exactly as the pipe of Nest
does. The filter of the exceptions keeps an array with no change, so the envelope of the error that the
client reads does not change at all. No change of the frontend is necessary for a failure of the validation.

**6. The pipes of one value stay.**
`ParseUUIDPipe` and `ParseIntPipe` are one line, and they do the work of a schema. Use the pipe of Zod for
an object of the query with more than one field, and not for one identifier.

**7. The specification lives in Git.**
A reviewer sees the change of the wire in the difference of the pull request, and the workflow can prove
that the file is current.

**8. The scope of the workspace is `@gitpaas/`.**
The names of the workspace were `@gitopslovers/gitpaas/<app>`, which hold **two** slashes and are no valid
name of a package. The applications got away with it, because nothing depends on them by the name. The
package of the contracts **is** a dependency by the name, so it must hold one slash. Rather than give the
package a scope of its own, this change renames the whole workspace to `@gitpaas/<name>`:
`@gitpaas/backend`, `@gitpaas/frontend` and `@gitpaas/contracts`. The root manifest keeps the name
`@gitopslovers/gitpaas`, because nothing depends on the root by the name. The new rule must enter
`docs/monorepo-architecture/conventions.md`.

**9. A value that is empty is `null` on the wire, and the key is never absent.**
A column that accepts no value gives `null` in JSON. It does not remove the key. So the contract declares
such a field with `.nullable()`, and never with `.optional()`. The two are different shapes, and a consumer
that tests `if (value)` passes both while a consumer that tests `'key' in object` does not.

`providerId` of a service is the first subject. Its column carries `nullable: true`, so the answer holds
`"providerId": null`, and the description of the frontend, `providerId?: string`, is wrong in two ways at
one time: the wrong type, and the wrong kind of absence.

Use `.optional()` for a field of a **request** that the caller may leave out, which is a different thing.

**10. An enum of the backend becomes one set of values in the contract.**
`UserRole` and `ProviderType` are enums of TypeScript in the backend, and unions of texts in the frontend.
The contract declares one `z.enum`, and the two applications derive from it. The domain of the backend keeps
its `enum` where the code reads better with it, and the layer of the UI converts, in the same way that it
converts a `Date`.

Two features already drifted in this exact way, so this is a rule and not one repair.

**11. A contract of the wire is imported from the package, and no file of the domain re-exports it.**
The first plan kept the file of `domain/dtos/` as an alias of one line, so that a consumer went on importing
from the domain layer. That alias decouples nothing. The type is the type of the package in both cases, and
a change of the shape breaks every consumer in the same way. The alias buys one import path, and it costs a
hop for the reader and two files for each feature.

So the file goes away, and the use case, the port, the repository and the controller import from
`@gitpaas/contracts` directly.

The rule of the layers still holds. `docs/backend-architecture/structure.md` says that a use case knows only
the elements of the domain layer, and that rule speaks of a vendor type. The package is no vendor: it
depends on `zod` alone, and it imports nothing from `apps/`, so it pulls no framework into a layer. The two
pages of `docs/backend-architecture/` record the exception.

A shape that only the backend has stays in `domain/dtos/`, and `create-project-in-namespace.dto.ts` is the
first example. The rule is applicable to a shape of the wire alone.

## Risks / Trade-offs

**1. A shared package couples the two applications.** Today the two can be changed and released alone. After
this change, a change of the wire is one commit that touches three packages, and it must compile in all
three. This is the cost of the guarantee, and it is the point: the failure moves from the browser into the
pull request.

**2. The bundle.** Zod is a dependency at run time. Where the frontend imports only the type, the import is
erased and the cost is zero. Where it parses, the run time enters the bundle. Parse at the edges that are
not trusted — the stream, and the reads where a silent value that is not defined would break the screen —
and not everywhere.

**3. More files for one field.** A new field of an answer is one change of the schema, and possibly one
change of a transformer. That is more work than the change of one interface, and less work than the two
changes that the repository needs today. And it cannot be half done.

**4. The order of the migration matters.** The phase of the timestamp must run before the features that hold
one move, or the shapes of the wire enter the package with a `Date` that JSON does not carry.

**5. The size of the change.** The change covers twelve features of the frontend and eleven of the backend,
and the feature `providers` joined after the first plan. The delivery therefore runs one phase per pull
request, and the first phase is the event of the error of the stream, which needs no part of the package. If
the method fails, the repository learns it from one small pull request, and not from the whole migration.

**6. The open questions block no phase, and one of them is now answered.** The true optionality of the three
fields of `Service` came from the definitions of the columns: each one carries `default: ''` and refuses an
empty value, so the three are obligatory texts and the backend is right. The place of the paths of the
endpoints, and the shape of the archive of the logs, can wait.
