## Context

A endpoint of the backend declares its contract with three separate artifacts: a class of `class-validator`
for the body, a built-in pipe for each value of the path and of the query, and the return type of the method
for the answer. There is no description of the answer at run time. The envelope of the error has one shape
for the whole API, and its interface is not exported, so no consumer can use it.

The frontend gives the shape of the wire as a type argument that a developer writes by hand.
`httpResource<T>` and `HttpClient.post<T>` do no check. The type argument is an assertion: the compiler
believes it, and the browser accepts whatever arrives. Thus a change of the shape in the backend gives no
failure of the compilation and no failure at run time. It gives a value that is not defined, in a template.

`pnpm-workspace.yaml` already declares `packages/*`, so the directory only has to exist. There is no
`turbo.json` at the root today, so `turbo run` operates with no order of the tasks and no cache.

## Goals / Non-Goals

**Goals:**

- One artifact describes each shape of the wire, and the compiler of the two applications reads it.
- A change of the shape that breaks a consumer fails the pull request, and not the browser.
- The specification of the API is a generated artifact of that one source, and never a document that a human
  keeps equal.
- The window of the output handles the event of the error, which it drops today.

**Non-Goals:**

- A generated client of HTTP. The consumer must keep `HttpClient` and `httpResource`.
- A step of RPC. GitPaaS has no traffic between services to convert.
- The move of the validation of the environment to Zod. It is no contract of the wire, and it is a separate
  decision.
- The check of its own answers by the server at run time. The compiler proves the shape, and a parse for
  each answer costs time in the hot path. An open question keeps a check for the development only.
- The internal data transfer objects. Seven of them never bind a body. They are shapes between the layers,
  and no contract of the wire. They stay.

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
UI converts. A secret never enters a shape of an answer, so the hash of the password is not in the package.

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

**8. The name of the package holds one slash.**
The names of the workspace are `@gitopslovers/gitpaas/<app>`, which hold **two** slashes and are no valid
name of a package. The applications get away with it, because nothing depends on them by the name. The
package of the contracts **is** a dependency by the name, so it must hold one slash. This deviation must
enter `docs/monorepo-architecture.md`.

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

**5. The three open questions block no phase, and two of them shape a schema.** The true optionality of the
three fields of `Service` must come from the definitions of the columns, and not from either of the two
opinions of today. The place of the paths of the endpoints, and the shape of the archive of the logs, can
wait.
