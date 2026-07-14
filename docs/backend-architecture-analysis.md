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

---

## Medium

- [ ] **De-duplicate `composeProjectName`**
  - Refs: `deployments.service.ts:30`, `docker-containers.repository.ts:24`, `docker-networks.repository.ts:24`.
  - Why: it is the compose join key linking deployments, containers, and networks; if the three copies drift, resource grouping silently breaks.
  - Layer/feature: shared (deployments / containers / networks).

- [ ] **Add controller and DB-repository tests, starting with deployments**
  - Refs: 24 existing specs, all application-layer use cases (+ `docker-log.util`, `redis-log-store`); no controller, service, DB-repository, or e2e tests.
  - Why: the highest-risk code (`DeploymentsService.create` orchestration, TypeORM adapters) is entirely untested; controller tests should cover the HTTP contract (404/204) and DB-repository tests should cover mapping.
  - Layer/feature: ui/controllers and infrastructure (test coverage).

---

## Open questions

- **Auth boundary:** Authentication may be intended to live at a gateway/reverse proxy outside this repo. Confirm whether an upstream layer enforces authn/authz before treating the Critical item as a gap.
- **Migration strategy:** Schema migrations may be handled by an external tool or ops process not present in this repo. Confirm before building an in-repo migration workflow.
