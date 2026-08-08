- [] Add root turborepo.json
- [] Si gestionamos secretos a traves de Docker secret?
- [] Donde deberiamos hacer el throw error de dominio? Crro que SOLO en servicios.
- [] El naming de Providers es un poco pobre.

## Quick wins

- [] Fix `apps/backend/src/features/projects/infrastructure/database/db-projects.repository.ts`: `create()`/`update()` return the raw TypeORM entity typed as `Project` instead of mapping through `toProject`, and they don't load the `services` relation like the read path does — follow `DatabaseServicesRepository`.
- [] Add unit specs for the DTOs, the only backend layer with zero test coverage even though the docs treat DTOs as the authoritative input contract.
- [] Remove dead code: `Providers.getFileContent` (no production caller), the `RunDeploymentPayload` type (duplicates the domain `DeploymentRunTask`), and the unused `@nestjs/schedule` dependency.
- [] Fix adapter naming drift: `dockerode-` vs `docker-` file prefixes, the `providers` feature exposing `@Controller('github')`, and `shared/application/*.use-case.ts` files that are really plain utils.

## Structural

- [] Seal the `ContainerRuntime` port: `apps/backend/src/core/infrastructure/docker/docker-container-runtime.adapter.ts:39` exposes `public getClient(): Docker`, which is not on the port, and `features/deployments/infrastructure/docker/dockerode-docker-executor.adapter.ts` uses it at 5 sites to reach raw dockerode — make it private, as in `github-providers.adapter.ts:146`.
- [] Give HTTP error translation a single home in the controller, per `docs/backend-architecture.md:158`; it also happens in `containers.service.ts:33`, `networks.service.ts:33` and `deployments.service.ts:83-97`, and only 2 of 10 features have a `domain/errors/` folder.
- [] De-duplicate the `containers` and `networks` features (line-for-line twins across 5 files each) and the Docker-unavailable→503 block repeated at `containers.controller.ts:29`, `networks.controller.ts:28`, `server.controller.ts:39` and `server.controller.ts:110`.
- [] Break the `services` ⇄ `deployments` circular module dependency, currently papered over with `forwardRef` in `services.module.ts:20` and `deployments.module.ts:23`.
- [] Split the two god adapters: `dockerode-docker-executor.adapter.ts` (533 lines; ~7 methods are pure compose-recipe transformation with no I/O) and `db-log-store.adapter.ts` (457 lines; state machine, sequencer, batcher, replay merger, trimmer and retention sweeper in one class).
- [] Enable TypeScript `strict` in `apps/backend/tsconfig.json` (`noImplicitAny` and `strictBindCallApply` are currently false) — do this last, after the other refactors land.