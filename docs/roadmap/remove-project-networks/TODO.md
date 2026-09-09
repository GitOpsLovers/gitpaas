# remove-project-networks

A project carries its own layer of networks: a tab, a CRUD and a join of a service to a network.
A service already reaches a network when `compose.yml` names it, so that layer is duplicated work.
We delete the layer whole: the tab, the interface of the join, the slice of the backend, the symbols
of the contracts and the two tables. The tab of the networks of a service stays, and it becomes a
read-only view. No project holds a network today, so no data and no network of the daemon needs a sweep.
The support of a shared network through `external: true` stays as it is, and it gets no new work.

## Phase 1 — The frontend loses the networks of a project

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/networks/, apps/frontend/src/app/features/projects/, apps/frontend/src/app/features/services/

- [x] 1.1 Remove the tab `networks` of `project-detail.component.ts` and of `project-detail.component.html`.
- [x] 1.2 Remove every component, store and route of `features/networks/` that serves a network of a project.
- [x] 1.3 Remove the interface of the join and of the leave of `service-detail.component.ts` and of `service-networks.component`.
- [x] 1.4 Keep the tab of the networks of a service as a read-only list of the networks of the daemon.
- [x] 1.5 Remove the methods of the CRUD and of the join of `networks-api.repository.ts`.
- [x] 1.6 Update the unit tests of the files above, and run `rtk pnpm run check-types --filter @gitpaas/frontend`.

## Phase 2 — The backend loses the layer, and the tables go away

**Agent:** implementer
**Paths:** apps/backend/src/features/, packages/contracts/src/networks/, iac/production/migrations/

- [ ] 2.1 Delete the slice of the network of a project: the entities, the repositories, the ports, the models, the errors, the six use cases, the controller, the service, the transformer and their tests.
- [ ] 2.2 Keep `networks.controller.ts`, `networks.service.ts`, `get-networks-by-service.use-case.ts` and `infrastructure/docker/`, and update `networks.module.ts`.
- [ ] 2.3 Reduce the states of a network to three values in `get-networks-by-service.use-case.ts` and in `packages/contracts`.
- [ ] 2.4 Remove the repository of the networks of a service from `deployment-runner.service.ts` and from `run-deployment.use-case.ts`.
- [ ] 2.5 Remove `attachToProjectNetworks` of `docker-executor.adapter.ts` and `declareAttachedNetworks` of `final-compose.transformer.ts`.
- [ ] 2.6 Remove the sweep of the networks of the daemon of `delete-project.use-case.ts`.
- [ ] 2.7 Delete the symbols of the network of a project of `packages/contracts/src/networks/` and of `src/index.ts`.
- [ ] 2.8 Add `iac/production/migrations/032_drop_project_networks.sql`, which drops `service_networks` and `project_networks`.
- [ ] 2.9 Update the unit tests of the files above, and run `rtk pnpm run check-types --filter @gitpaas/backend`.

## Phase 3 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 3.1 Rewrite `docs/business/networks.md`, so it describes the networks of a service alone.
- [ ] 3.2 Correct `docs/business/projects.md`, `docs/business/services.md` and `docs/architecture/backend/structure.md`.
- [ ] 3.3 Delete `docs/roadmap/remove-project-networks/` and its line of `docs/roadmap.md`.
