---
name: backend-unit-testing
description: Use this skill when the user asks you to write or to change the unit tests of the backend application.
---

# Backend unit testing skill

This skill gives the conventions for the unit specs of `apps/backend`. The test runner is Jest with ts-jest, and its configuration is in `apps/backend/jest.config.js`. Read `references/conventions.md` first, then read the one reference file for your type of SUT.

## The commands

```bash
# Full backend suite (run from apps/backend)
rtk pnpm test

# Scoped run — Jest treats the trailing argument as a testPathPattern regex
rtk pnpm test -- src/features/services/infrastructure/database
```

## The reference files

| File | Read it when |
| --- | --- |
| [running-the-suite.md](references/running-the-suite.md) | You run the suite, or you need the constraints of the project. |
| [conventions.md](references/conventions.md) | You write any spec. These rules apply to all of them. |
| [dto.md](references/dto.md) | You test a DTO of `features/*/domain/dtos/`. |
| [use-case.md](references/use-case.md) | You test a use-case function of `application/`. |
| [ui-service.md](references/ui-service.md) | You test a service of `features/*/ui/services/`. |
| [controller.md](references/controller.md) | You test a controller of `features/*/ui/controllers/`. |
| [repository.md](references/repository.md) | You test a TypeORM repository of `infrastructure/database/`. |
| [transformer.md](references/transformer.md) | You test a `*.transformer.ts` file. |
| [docker-adapter.md](references/docker-adapter.md) | You test a Docker adapter, the container-runtime port, or the Compose executor. |
| [external-api-provider.md](references/external-api-provider.md) | You test an adapter over an external API, such as the GitHub adapter. |
| [stateful-adapter.md](references/stateful-adapter.md) | You test an adapter with an external server, an RxJS stream, or ordered side effects. |
| [auth-constructs.md](references/auth-constructs.md) | You test a Passport strategy, a guard, an exception filter, or a decorator. |
| [config-and-bootstrap.md](references/config-and-bootstrap.md) | You test a config module, a constants file, or the bootstrap. |
| [known-inconsistencies.md](references/known-inconsistencies.md) | You change an older spec that does not obey the dominant pattern. |

Read one reference file for your task. Do not read the whole folder.
