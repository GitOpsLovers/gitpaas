# deep-prune

The prune of the tab of the maintenance filters by the label `io.gitpaas.managed=true`, so it keeps every unlabelled artefact. A stage of a build of several stages, a base image and a stopped container of a third party stay on the disk of the host, and they grow without a limit. This feature adds two buttons: one that prunes the unused images and the stopped containers of the whole host, and one that prunes the cache of the builder. The volumes and the networks stay out of scope, and the three buttons of today keep their filter of the label.

## Phase 1 — The prune of the host and of the cache in the backend

**Agent:** implementer

- [x] 1.1 Add the method `pruneBuildCache` to the port `ContainerRuntime` (`apps/backend/src/core/domain/ports/container-runtime.port.ts`), and implement it in `DockerContainerRuntimeAdapter` with `pruneBuilder()` of Dockerode, which returns a `RuntimePruneReport`.
- [x] 1.2 Add the methods `pruneHost` and `pruneBuildCache` to the port `ServerPruner` (`apps/backend/src/features/server/domain/ports/server-pruner.port.ts`).
- [x] 1.3 Implement both methods in `DockerServerPrunerAdapter`. `pruneHost` calls `pruneImages` and then `pruneContainers` with `HOST_SELECTOR` of `apps/backend/src/features/docker/domain/constants/docker-host.constants.ts`, and it sums the two reports into one `PruneResult`. It never prunes a volume.
- [x] 1.4 Add the use cases `prune-host.use-case.ts` and `prune-build-cache.use-case.ts` to `apps/backend/src/features/server/application/`, with the shape of the three use cases of the prune of today.
- [x] 1.5 Add the methods to `ServerService`, and add the endpoints `POST /server/prune/all` and `POST /server/prune/build-cache` to `ServerController`. Both answer a `PruneResult`, and both pass through the private method `prune` that maps a dead daemon to a 503.
- [x] 1.6 Write the unit tests of the adapter, of the two use cases, of the service and of the controller. Prove that the prune of the host sends no filter of the label, that it sends `dangling=false` for the images, and that it prunes no volume.
- [x] 1.7 Run `rtk pnpm run check-types --filter @gitpaas/backend`, and run the tests of the backend.

## Phase 2 — The two buttons of the tab of the maintenance

**Agent:** implementer

- [x] 2.1 Add the methods `pruneHost` and `pruneBuildCache` to `ServerApiRepository` (`apps/frontend/src/app/features/server/infrastructure/api/server-api.repository.ts`), which call the two new endpoints.
- [x] 2.2 Add the two actions to the list `actions` of `server-maintenance.component.ts`, so the two buttons take the loop, the confirm modal and the message of the result of the three buttons of today.
- [x] 2.3 Write the text of each button and of its confirmation. The first one states that it removes every unused image and every stopped container of the host, and that it keeps every volume. The second one states that it removes the whole cache of the builder.
- [x] 2.4 Write the unit tests of the repository and of the component.
- [x] 2.5 Run `rtk pnpm run check-types --filter @gitpaas/frontend`, and run the tests of the frontend.

## Phase 3 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 3.1 Update the section "The removal of the unused resources" of `docs/business/server.md`. State the five operations, state that the three operations of today remove an artefact of GitPaaS alone, and state that the prune of the host removes an artefact of every origin.
- [ ] 3.2 Update the pages of the architecture that the new endpoints and the new methods of the port made incomplete.
- [ ] 3.3 Delete the folder `docs/roadmap/deep-prune/`, and delete its line of `docs/roadmap.md`.
