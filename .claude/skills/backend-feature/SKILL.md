---
name: backend-feature
description: Procedure for scaffolding a new feature or resource in the Backend application (apps/backend). Use when adding a new resource/entity to the backend.
---

# Backend feature skill

How to scaffold a feature in `apps/backend`. This file is a **procedure**, not an architecture reference.

## Read the architecture first

**Read `docs/backend-architecture.md` before writing anything.** It is the single definitive source of truth for the backend's architecture: layers and their responsibilities, folder shape, file and class naming, ports and adapters, DI, transformers, persistence, validation, HTTP conventions and cross-cutting concerns.

- Look every architectural rule up there. Do not assume one, and do not infer one from this file.
- If this skill and `docs/backend-architecture.md` ever disagree, **the architecture doc wins** — follow it and report the discrepancy.

## Procedure

1. **Read the architecture doc**, then skim an existing sibling feature that most resembles the one you are adding (`features/projects/` is the canonical reference) and use it as the template for layout, naming and wiring.
2. **Decide where the code belongs** — the owning feature, `core/` or `shared/` — using the placement rules in the architecture doc.
3. **List the files you will create per layer** before writing any of them, and check each name against the naming conventions in the architecture doc.
4. **Build bottom-up, inner layers first**: `domain` → `infrastructure` → `application` → `ui`.
5. **Wire the feature module** with its controllers, services and concrete infrastructure providers, exporting anything other features must inject.
6. **Register the module** in `imports` in `apps/backend/src/app.module.ts`.
7. **Mirror any schema change** with a hand-written SQL migration under `iac/production/migrations/`, as described in the architecture doc's "Schema management" section.
8. **Add specs** for the new use cases, repositories/adapters, services and controllers, alongside the existing tests in the sibling feature.
9. **Verify**: build the backend and run its tests (see below).

## Constraints

- Prefix every shell command with `rtk` (e.g. `rtk pnpm --filter @gitpaas/backend build`).
- Build and test with the scripts declared in `apps/backend/package.json` (`build`, `test`), run through the workspace filter `@gitpaas/backend`.
- **Never run E2E tests** (`test:e2e` / Playwright).
- **Never run ESLint** — that is the user's responsibility.
- **Never install dependencies.** If the feature needs a new package, stop and report which one.
