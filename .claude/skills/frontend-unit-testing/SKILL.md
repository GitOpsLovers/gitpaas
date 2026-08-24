---
name: frontend-unit-testing
description: The testing system of `apps/frontend`, and the API of Vitest. Use this skill when you write, change or run the unit tests of the frontend application.
---

# The unit tests of the frontend

The conventions of the specs of `apps/frontend`. The runner is Vitest 4, and the builder `@angular/build:unit-test` drives it in an environment `jsdom`. The configuration is
`apps/frontend/angular.json`, target `test`, and `apps/frontend/tsconfig.spec.json`. The project holds no `vitest.config.ts`, and you must not add one.

This skill holds two tiers:

- **The conventions of this project.** Read `conventions.md` first, then the one file for your subject. These rules win over any other statement.
- **The API of Vitest.** Read a file `vitest-*.md` when a question about the runner stays open.

Read one file for your task, and never the folder.

## The conventions of this project

| The file | Read it when |
| --- | --- |
| [conventions.md](references/conventions.md) | You write any spec. These rules apply to all of them. Read it first. |
| [running-the-suite.md](references/running-the-suite.md) | You run the suite, or you need the constraints of the project. |
| [use-case.md](references/use-case.md) | You test a use-case function of `features/*/application/`. |
| [api-repository.md](references/api-repository.md) | You test a repository of `features/*/infrastructure/api/`. |
| [ui-service.md](references/ui-service.md) | You test a service of `features/*/ui/services/` or of `shared/services/`. |
| [container-component.md](references/container-component.md) | You test a container of `features/*/ui/containers/`. |
| [presentational-component.md](references/presentational-component.md) | You test a component of `features/*/ui/components/` or of `shared/components/`. |
| [page.md](references/page.md) | You test a page of `pages/`. |
| [guard-and-interceptor.md](references/guard-and-interceptor.md) | You test a guard or an interceptor HTTP of `features/*/ui/`. |
| [storage-service.md](references/storage-service.md) | You test a service of `features/*/infrastructure/storage/`. |
| [browser-adapter.md](references/browser-adapter.md) | You test a function that drives the browser, such as a redirection or a form of GitHub. |
| [signals-and-streams.md](references/signals-and-streams.md) | The subject holds a signal, a resource, a stream of RxJS, or a stream SSE. |
| [known-inconsistencies.md](references/known-inconsistencies.md) | You change an older spec that does not obey the dominant pattern. |

## The API of Vitest

The specs use the globals, so they import nothing from `vitest`.

| The file | Read it when |
| --- | --- |
| [vitest-test-api.md](references/vitest-test-api.md) | You write `test`, or you need `skip`, `only`, `todo`, `each` or a retry. |
| [vitest-describe.md](references/vitest-describe.md) | You group the tests with `describe`, or you nest a suite. |
| [vitest-expect.md](references/vitest-expect.md) | You write an assertion, a matcher or an asymmetric matcher. |
| [vitest-hooks.md](references/vitest-hooks.md) | You write `beforeEach`, `afterEach`, `beforeAll` or `afterAll`. |
| [vitest-vi.md](references/vitest-vi.md) | You need `vi.fn`, `vi.spyOn`, `vi.stubGlobal`, a fake timer or `vi.waitFor`. |

## The neighbouring skills

- `frontend-architecture` holds the structure, the layers and the naming of the code under test.
- `frontend-design` holds the theme and the markup of a template.
