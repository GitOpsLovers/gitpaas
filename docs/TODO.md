- [] Add a root `turborepo.json` file.
- [] Decide if we control the secrets with Docker secrets.
- [] Decide where we must throw the domain errors. I think that we must throw them ONLY in the services.
- [] The names of the Providers are not sufficiently clear.
- [] Add CRON to keepl clean Log Store and Database

## Structural

- [] Add a scheduled cleanup job that archives and frees the Redis log streams that an interrupted deployment leaves behind (an archive that fails, or a crash between the last append and the completion). The start-up drain that did this was removed, and nothing recovers these keys now. `@nestjs/schedule` is already in `package.json`.
- [] Enable the TypeScript `strict` mode in `apps/backend/tsconfig.json` (`noImplicitAny` and `strictBindCallApply` are `false` now). Do this last, after the other refactors.
