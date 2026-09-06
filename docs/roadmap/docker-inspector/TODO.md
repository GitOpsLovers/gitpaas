# docker-inspector

GitPaaS reads Docker only through the label of a service, so an operator cannot see the real state of the daemon of the server. This feature adds a new top-level section `Docker`, with one tab and one table for each resource of the host: containers, images, volumes and networks. The section reads the whole host, it shows the stopped containers too, and it offers a button of manual refresh after the first load. The section runs no operation of Docker: no start, no stop, no prune and no delete. A row opens no view of detail.

## Phase 1 — The core reads the whole host

**Agent:** implementer
**Paths:** `apps/backend/src/core/`

- [x] 1.1 Extend `RuntimeSelector` so that a listing of the whole host produces no filter of labels in `toLabelFilter`.
- [x] 1.2 Add `all` to the options of `listContainers`, so that the port returns the stopped containers too.
- [x] 1.3 Extend `RuntimeImageSummary` with the tags, the size and the date, and fill them in `toImageSummary`.
- [x] 1.4 Extend the summaries of the volume and of the network with the fields that the tables need.
- [x] 1.5 Keep the current behavior of the scoped callers of the port, and prove it with their unit tests.
- [x] 1.6 Run `rtk pnpm run check-types --filter @gitpaas/backend` and the tests of the backend.

## Phase 2 — The four endpoints of Docker

**Agent:** implementer
**Paths:** `apps/backend/src/features/docker/`, `packages/contracts/`

- [ ] 2.1 Add the response types of the four resources to `packages/contracts`.
- [ ] 2.2 Create the feature `docker` with one use case for each resource, which calls the port with the selector of the host.
- [ ] 2.3 Add `DockerController` with `GET /api/v1/docker/containers`, `/images`, `/volumes` and `/networks`.
- [ ] 2.4 Register `DockerModule` in `app.module.ts`, under the global guard of the token.
- [ ] 2.5 Return `503` when the daemon is unreachable, as `server/status` does today.
- [ ] 2.6 Write the unit tests of the use cases and of the controller.
- [ ] 2.7 Run `rtk pnpm run check-types --filter @gitpaas/backend` and the tests of the backend.

## Phase 3 — The section Docker of the frontend

**Agent:** implementer
**Paths:** `apps/frontend/src/app/features/docker/`, `apps/frontend/src/app/app.routes.ts`, `apps/frontend/src/app/layout/ui/components/sidebar/`

- [ ] 3.1 Add the route `docker/:tab` to `app.routes.ts`, with the default tab `containers`.
- [ ] 3.2 Add the entry `Docker` to the array `navItems` of the sidebar.
- [ ] 3.3 Create the container of the page, which uses the shared `TabsComponent` for the four tabs.
- [ ] 3.4 Create the service of data that calls the four endpoints with `httpResource`.
- [ ] 3.5 Create the four components of table inside a `ComponentCardComponent`, with the columns of the plan.
- [ ] 3.6 Add the button of manual refresh, and the states of load, of error and of empty table.
- [ ] 3.7 Write the unit tests of the components and of the service.
- [ ] 3.8 Run `rtk pnpm run check-types --filter @gitpaas/frontend` and the tests of the frontend.

## Phase 4 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 4.1 Write `docs/business/docker.md` with the behavior of the section and its four tables.
- [ ] 4.2 Add the section to the navigation of `docs/business/frontend-shell.md`.
- [ ] 4.3 Correct the pages that the new fields of the core made false.
- [ ] 4.4 Delete the folder `docs/roadmap/docker-inspector/` and its line of `docs/roadmap.md`.
