# Backend Architecture — TODOs

_Read-only architecture audit of `apps/backend/` (NestJS v11 + TypeScript + TypeORM/PostgreSQL). Generated 2026-07-16._

## Overall health

The backend is in **very good architectural shape**. The documented hexagonal/clean layering
(`domain → application → infrastructure/ui`) is applied consistently across all nine features, and
it holds up under scrutiny:

- **No dependency-direction violations found.** No `domain/` or `application/` file imports
  `infrastructure/`, `ui/`, NestJS, or TypeORM (verified by grep). `core/` never imports a feature.
- **Use cases are pure functions** receiving ports as parameters — trivially testable.
- **Port + adapter + transformer** pattern is applied uniformly; no repository returns raw ORM rows.
- **Near-complete test coverage.** Every controller, service, use case, repository, and transformer
  has a sibling spec. Only the declarative `*-db.entity.ts` files lack specs (expected — no logic).
- Sound edge hardening: `helmet`, CORS allowlist, global `ValidationPipe`
  (`whitelist` + `forbidNonWhitelisted` + `transform`), a rate-limiting `ThrottlerGuard`, and a
  global exception filter that hides internal error details on 5xx.

The findings below are refinements and production-readiness gaps, **not** structural rot. The most
important theme is **operational/security robustness** (no authn/authz,
optional production secrets), not layering.

---

## High priority

### H1 — No authentication or authorization on any endpoint
- **Area:** whole API surface; `apps/backend/src/app.module.ts` (only `ThrottlerGuard` is wired,
  lines 53-56); no guard/auth files exist anywhere (`find` for `*guard*`/`*auth*` returns nothing).
- **Why it matters:** the API performs high-impact, destructive operations — trigger Docker
  deployments (`POST /deployments`), delete projects/services/deployments (cascading DB + Docker +
  Redis teardown), and prune the host Docker daemon (`server` feature: images/volumes/containers).
  Any client that can reach the port can do all of this. Rate limiting is not access control.
- **Suggested action:** introduce an authentication boundary (e.g. an API key or JWT `APP_GUARD`,
  or enforce it at the reverse proxy and document that assumption). At minimum, document the intended
  trust model in `docs/backend-architecture.md` — auth is currently unmentioned there, which is
  itself doc/reality drift. **Effort:** M. **Risk:** M (touches every route; guard-level change).

---

## Medium priority

### M4 — No migration path; schema managed only by `synchronize`
- **Area:** `apps/backend/src/core/core.module.ts:30` (`synchronize: NODE_ENV !== 'production'`);
  no migrations exist anywhere.
- **Why it matters:** `synchronize` is correctly disabled in production, but nothing replaces it —
  there is no migration tooling, so production schema evolution has no defined mechanism. The first
  production schema change has no safe path.
- **Suggested action:** introduce TypeORM migrations (generation script + a `DataSource` config) and
  document the workflow. **Effort:** M. **Risk:** L (dev behavior unchanged).

---

## Low priority

_No open low-priority items._

---

## Notes / non-issues verified

- **Layering is clean:** greps for `domain`/`application` importing `infrastructure`/`ui`/NestJS/
  TypeORM, and for `core` importing `@features`, all returned nothing.
- **Cross-feature imports are legitimate:** they reference other features' domain models/ports (for
  collaboration) or DB entities (for data-level FK relationships), matching the documented patterns.
  `services ↔ deployments` uses `forwardRef` as documented.
- **`AppController` is a real health check, not leftover Nest boilerplate.**
- **Test coverage is effectively complete** across controllers, services, use cases, repositories,
  and transformers.
</content>
