---
name: vitest
description: Vitest reference - mocking, coverage, filtering, fixtures. The skill frontend-unit-testing wins over it.
---

# Vitest

The general documentation of the runner. `frontend-unit-testing` holds the conventions of the specs of this project, and it wins over this skill. Read this skill for the API of the runner that no page of the project covers. The snapshot follows Vitest 5.x, and it dates from 2026-06-22.

## The reference files

| The file | Read it when |
| --- | --- |
| [overview.md](references/overview.md) | You need what Vitest is, and what it gives you. |
| [core-config.md](references/core-config.md) | You configure Vitest, or you integrate it with Vite. |
| [core-cli.md](references/core-cli.md) | You run the command line, and you need a command or an option. |
| [core-test-api.md](references/core-test-api.md) | You write `test`, or you need `skip`, `only` or `concurrent`. |
| [core-describe.md](references/core-describe.md) | You group the tests with `describe`, or you nest a suite. |
| [core-expect.md](references/core-expect.md) | You write an assertion, a matcher or an asymmetric matcher. |
| [core-hooks.md](references/core-hooks.md) | You write `beforeEach`, `afterEach`, `beforeAll` or `afterAll`. |
| [features-mocking.md](references/features-mocking.md) | You mock a function, a module, a timer or a date. |
| [features-snapshots.md](references/features-snapshots.md) | You write a snapshot, or an inline snapshot. |
| [features-coverage.md](references/features-coverage.md) | You configure the coverage of V8 or of Istanbul. |
| [features-context.md](references/features-context.md) | You need a fixture, `context.expect` or `test.extend`. |
| [features-concurrency.md](references/features-concurrency.md) | You run the tests in parallel, or you shard them. |
| [features-filtering.md](references/features-filtering.md) | You filter by name, by pattern of the file, or by tag. |
| [features-test-tags.md](references/features-test-tags.md) | You label a test with a tag, and you filter the run. |
| [features-reporters.md](references/features-reporters.md) | You choose a reporter, or you configure the output of the CI. |
| [features-benchmarking.md](references/features-benchmarking.md) | You write a benchmark with the fixture `bench`. |
| [advanced-vi.md](references/advanced-vi.md) | You need `vi.mock`, `vi.spyOn`, a fake timer, `hoisted` or `waitFor`. |
| [advanced-environments.md](references/advanced-environments.md) | You choose `node`, `jsdom`, `happy-dom` or a custom environment. |
| [advanced-type-testing.md](references/advanced-type-testing.md) | You test a type with `expectTypeOf` or `assertType`. |
| [advanced-projects.md](references/advanced-projects.md) | You configure a workspace of several projects. |

Read one reference file for your task. Do not read the whole folder.
