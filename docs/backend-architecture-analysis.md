# Backend Architecture Analysis — Action Plan

This document turns a backend architecture audit into a working TODO checklist. Overall health is **Good** — the codebase shows solid layering (domain / infrastructure / ui with thin `application/` use cases), and the risks are concentrated in three areas: security, database schema management, and one feature (`deployments`) that leaks orchestration into its UI service layer. Work through the items below by severity; a prioritized order of work follows at the end.

> How to read each item: an imperative action, then a sub-line with the concrete file reference(s), why it matters, and the affected layer/feature.

---

## Critical

- [ ] **Add global authentication/authorization with explicit opt-outs**
  - Refs: `apps/backend/src` (no guards/JWT/passport anywhere); `deployments.controller.ts:69` (`POST /api/v1/deployments`); `POST /api/v1/server/*` prune ops.
  - Why: every route is public. An unauthenticated caller can trigger `docker compose up` against arbitrary repo source and run server prune operations — i.e. execute code on the host VPS.
  - Layer/feature: cross-cutting (ui/controllers); prioritize `deployments` and `server`.

---

## High

- [ ] **Establish a TypeORM migration workflow and stop relying on `synchronize`**
  - Refs: `core.module.ts:23` (`synchronize: NODE_ENV !== 'production'`); zero migration files exist.
  - Why: production has no path to create or evolve the schema. This is a deployment blocker.
  - Layer/feature: infrastructure (core/database).

- [ ] **Extract deployment orchestration into a `create-deployment` use case**
  - Refs: `deployments.service.ts:97-125` (`DeploymentsService.create()` loads service, validates repo/branch, fetches commit, builds DTO, starts background run); `deployments.service.ts:30-34` (`composeProjectName()` domain logic in UI).
  - Why: the most critical path is untested and diverges from every other feature; the service should be a thin DI bridge, not the orchestrator.
  - Layer/feature: application vs ui (deployments).

---

## Medium

- [ ] **Inject repository interfaces (ports), not concrete adapters, across feature boundaries**
  - Refs: `deployments.service.ts:44-55` (injects `ServicesDatabaseRepository`, `GithubAppProvider`, `DockerodeDockerExecutor`, `RedisLogStoreRepository` by concrete class); `containers.service.ts:16-17` (injects `ServicesDatabaseRepository`).
  - Why: coupling UI services to concrete infrastructure breaks the domain/infrastructure boundary and makes the code hard to test and swap.
  - Layer/feature: ui → infrastructure (deployments, containers).

- [ ] **De-duplicate `composeProjectName`**
  - Refs: `deployments.service.ts:30`, `docker-containers.repository.ts:24`, `docker-networks.repository.ts:24`.
  - Why: it is the compose join key linking deployments, containers, and networks; if the three copies drift, resource grouping silently breaks.
  - Layer/feature: shared (deployments / containers / networks).

- [ ] **Add controller and DB-repository tests, starting with deployments**
  - Refs: 24 existing specs, all application-layer use cases (+ `docker-log.util`, `redis-log-store`); no controller, service, DB-repository, or e2e tests.
  - Why: the highest-risk code (`DeploymentsService.create` orchestration, TypeORM adapters) is entirely untested; controller tests should cover the HTTP contract (404/204) and DB-repository tests should cover mapping.
  - Layer/feature: ui/controllers and infrastructure (test coverage).

- [ ] **Harden HTTP: restrict CORS, add helmet and a throttler**
  - Refs: `main.ts:10` (`app.enableCors()` with no origin allowlist); no helmet; no rate limiting.
  - Why: open CORS and missing security headers/rate limits leave mutating routes exposed.
  - Layer/feature: cross-cutting (bootstrap).

---

## Prioritized order of work

Ordered by impact/effort:

1. **Add authentication/authorization** — High impact / Medium effort. Prioritize deployments + server routes.
2. **Establish migration workflow; disable `synchronize` in shared environments** — High / Medium.
3. **Move deployment orchestration into a use case** — Medium / Medium.
4. **Depend on ports across feature boundaries** — Medium / Medium.
5. **Add config validation + route all config through `ConfigService`** — Medium / Low.
6. **Add HTTP hardening (CORS allowlist, helmet, throttler)** — Medium / Low.
7. **De-duplicate `composeProjectName`** — Medium / Low.
8. **Broaden test coverage to UI and DB layers** — Medium / Medium.

---

## Open questions

- **Auth boundary:** Authentication may be intended to live at a gateway/reverse proxy outside this repo. Confirm whether an upstream layer enforces authn/authz before treating the Critical item as a gap.
- **Migration strategy:** Schema migrations may be handled by an external tool or ops process not present in this repo. Confirm before building an in-repo migration workflow.
