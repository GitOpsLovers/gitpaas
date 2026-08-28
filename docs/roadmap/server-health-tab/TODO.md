# server-health-tab

The tab "Health" of the page of the server reports two dependencies alone, `postgres` and `docker`. The stack of production runs five services — the proxy, PostgreSQL, Redis, the backend and the frontend — and the panel hides four of them, so a stopped Redis or a stopped proxy stays invisible.

We probe every service of the stack, we report all of them in the one endpoint of the readiness, and we show one row for each one with a human label. The panel also receives a button that refreshes the data.

The states stay `up` and `down`, the dependency keeps its fields of today, and no new field of latency, of version or of time enters the contract.

## Phase 1 — The probes of the services of the stack

**Agent:** implementer
**Paths:** apps/backend/src/features/server/, apps/backend/src/core/

- [x] 1.1 Write `RedisHealthProbeAdapter` in `apps/backend/src/features/server/infrastructure/health/`, with the name `redis`. It reports `up` when the command `PING` of `RedisConnection` answers.
- [x] 1.2 Write a probe of a container of the stack in the same folder. It reads the state of one container through the Docker API, and it reports `up` when that container runs.
- [x] 1.3 Create one probe of a container for the proxy, one for the backend and one for the frontend. Take the name of each container from `iac/production/docker-compose.yml`.
- [x] 1.4 Register the four new probes in `apps/backend/src/features/server/server.module.ts`.
- [x] 1.5 Pass the six probes to `checkReadinessUseCase` in `server.service.ts`, in this order: postgres, docker, redis, proxy, backend, frontend.
- [x] 1.6 Keep the rule of the answer `503`: the readiness answers `503` when one probe of the six reports `down`.
- [x] 1.7 Write the unit tests of the new probes, and update the tests of `check-readiness.use-case` and of `server.service`.
- [x] 1.8 Run `rtk pnpm run check-types --filter @gitpaas/backend`.

## Phase 2 — The rows and the button of the panel

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/server/

- [ ] 2.1 Add a map of the name of the probe to its human label in `map-readiness-health.use-case.ts`: PostgreSQL, Docker daemon, Redis, Reverse proxy, Backend, Frontend.
- [ ] 2.2 Show that label in the row of the dependency of `server-health-panel.component.html`, in place of the raw name. Keep the raw name when the map holds no entry.
- [ ] 2.3 Add a button "Refresh" to the panel. It emits an output that the container `ServerHealthComponent` receives.
- [ ] 2.4 Reload the two resources of `ServerHealthComponent` when that output fires, and disable the button while a read runs.
- [ ] 2.5 Update the unit tests of the use case, of the panel and of the container.
- [ ] 2.6 Run `rtk pnpm run check-types --filter @gitpaas/frontend`.

## Phase 3 — The documentation of the behavior

**Agent:** documenter
**Paths:** docs/business/
**This is the last phase.**

- [ ] 3.1 Rewrite the list of the dependencies of `docs/business/server.md` with the six probes and their labels.
- [ ] 3.2 Write the button of the refresh into the section of the panel of the health of the same page.
- [ ] 3.3 Delete the folder `docs/roadmap/server-health-tab/`, and its line of `docs/roadmap.md`.
