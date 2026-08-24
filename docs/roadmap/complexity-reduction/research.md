# The research of the complexity reduction

The audit ran over the three areas at the same time, and each area holds its own file:

| The area | The file | Its findings |
|---|---|---|
| The backend | [research-backend.md](./research-backend.md) | 15 |
| The frontend | [research-frontend.md](./research-frontend.md) | 14 |
| The infrastructure | [research-infrastructure.md](./research-infrastructure.md) | 15 |

## What holds today, and what the plan must not undo

- **The one rule of the dependencies holds in both applications.** No `domain/` and no
  `application/` file imports outward, and no file of `core/` imports a feature.
- **Every use case of the backend is a pure function** with positional dependency parameters. The
  audit found no `@Injectable()` use case.
- **No page of the frontend injects a service.** The eighteen pages hold 14 to 44 lines each.
- **The tests are dense.** The backend holds 186 specs for 283 files, and `application/` holds 59
  specs for 60 files.

So the complexity of GitPaaS is not a broken architecture. It is duplication, and it is a small
number of units that hold two jobs.

## The three shapes of the complexity

1. **The same code written two, three or four times.** `containers` against `networks` in the
   backend, the CRUD of `namespaces`, of `projects` and of `services` in the frontend, the wrapper
   `run<T>` in four adapters, and the block of the telemetry in two services.
2. **A unit that holds two jobs.** `deployment-runner.service.ts` runs the queue and the telemetry.
   `server-maintenance.component.ts` runs the prune and the removal of the orphans.
3. **Dead code that a reader must still read.** The engine of the submenu of the sidebar, the icon
   API of the shared button, and 46 exports of `@gitpaas/contracts` that neither application uses.

## The one thing that is not a matter of complexity

`iac/production/backend.Dockerfile` and `iac/production/frontend.Dockerfile` never copy
`packages/contracts/`, so no image builds today. See F1 of
[research-infrastructure.md](./research-infrastructure.md). This is a bug of the release, and it
belongs on its own branch, before this feature starts.

## What the user must decide

Each file of the area holds its own list of the questions. Three of them decide the shape of the
plan:

1. Does the fix of the two Dockerfiles run first, on its own branch?
2. How far does the plan go against the duplication? Each area states an option A, B and C, from the
   deletions alone up to a shared abstraction.
3. Do `containers` and `networks` become one feature? Their controllers and their services are
   identical after the rename of the noun, which I confirmed with a `diff`.
