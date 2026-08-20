---
name: frontend-unit-testing
description: Use this skill when the user asks you to write or to change the unit tests of the frontend application.
---

# Frontend unit testing skill

This skill gives the conventions for the unit specs of `apps/frontend`. The test runner is Vitest, and the Angular builder `@angular/build:unit-test` drives it in a `jsdom` environment. The configuration is in `apps/frontend/angular.json` (the `test` target) and in `apps/frontend/tsconfig.spec.json`. Read `references/conventions.md` first, then read the one reference file for your type of SUT.

## The commands

```bash
# Full frontend suite (run from apps/frontend)
rtk pnpm test

# Scoped run — the builder takes a glob of the files, relative to the root of the project
rtk pnpm test -- --include "src/app/features/projects/**/*.spec.ts"
```

## The reference files

| File | Read it when |
| --- | --- |
| [running-the-suite.md](references/running-the-suite.md) | You run the suite, or you need the constraints of the project. |
| [conventions.md](references/conventions.md) | You write any spec. These rules apply to all of them. |
| [use-case.md](references/use-case.md) | You test a use-case function of `features/*/application/`. |
| [api-repository.md](references/api-repository.md) | You test a repository of `features/*/infrastructure/api/`. |
| [ui-service.md](references/ui-service.md) | You test a service of `features/*/ui/services/` or of `shared/services/`. |
| [container-component.md](references/container-component.md) | You test a container of `features/*/ui/containers/`. |
| [presentational-component.md](references/presentational-component.md) | You test a component of `features/*/ui/components/` or of `shared/components/`. |
| [page.md](references/page.md) | You test a page of `pages/`. |
| [guard-and-interceptor.md](references/guard-and-interceptor.md) | You test a guard or an HTTP interceptor of `features/*/ui/`. |
| [storage-service.md](references/storage-service.md) | You test a service of `features/*/infrastructure/storage/`. |
| [browser-adapter.md](references/browser-adapter.md) | You test a function that drives the browser, such as a redirection or a form of GitHub. |
| [signals-and-streams.md](references/signals-and-streams.md) | The SUT holds a signal, a resource, an RxJS stream, or an SSE stream. |
| [known-inconsistencies.md](references/known-inconsistencies.md) | You change an older spec that does not obey the dominant pattern. |

Read one reference file for your task. Do not read the whole folder.
