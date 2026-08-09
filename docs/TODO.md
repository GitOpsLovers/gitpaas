- [] Add a root `turborepo.json` file.
- [] Decide if we control the secrets with Docker secrets.
- [] Decide where we must throw the domain errors. I think that we must throw them ONLY in the services.
- [] The names of the Providers are not sufficiently clear.

## Structural

- [] Divide the two large adapters: `docker-executor.adapter.ts` (533 lines, of which approximately 7 methods only do a transformation of the compose recipe and have no I/O) and `db-log-store.adapter.ts` (457 lines, with the state machine, the sequencer, the batcher, the replay merger, the trimmer and the retention sweeper in one class).
- [] Enable the TypeScript `strict` mode in `apps/backend/tsconfig.json` (`noImplicitAny` and `strictBindCallApply` are `false` now). Do this last, after the other refactors.
