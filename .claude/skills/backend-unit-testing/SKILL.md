---
name: backend-unit-testing
description: Use this skill when you write or change the unit tests of the backend application.
---

# The unit tests of the backend

The conventions of the specs of `apps/backend`. The runner is Jest with ts-jest, and its configuration is `apps/backend/jest.config.js`. Read `conventions.md` first, then read the one file for your subject.

## The reference files

| The file | Read it when |
| --- | --- |
| [conventions.md](references/conventions.md) | You write any spec. These rules apply to all of them. Read it first. |
| [running-the-suite.md](references/running-the-suite.md) | You run the suite, or you need the constraints of the project. |
| [dto.md](references/dto.md) | You test a DTO of `features/*/domain/dtos/`. |
| [use-case.md](references/use-case.md) | You test a use-case function of `application/`. |
| [ui-service.md](references/ui-service.md) | You test a service of `features/*/ui/services/`. |
| [controller.md](references/controller.md) | You test a controller of `features/*/ui/controllers/`. |
| [repository.md](references/repository.md) | You test a TypeORM repository of `infrastructure/database/`. |
| [transformer.md](references/transformer.md) | You test a file `*.transformer.ts`. |
| [docker-adapter.md](references/docker-adapter.md) | You test a Docker adapter, the port of the runtime of the containers, or the executor of Compose. |
| [external-api-provider.md](references/external-api-provider.md) | You test an adapter over an external API, such as the adapter of GitHub. |
| [stateful-adapter.md](references/stateful-adapter.md) | You test an adapter with an external server, a stream of RxJS, or an ordered side effect. |
| [auth-constructs.md](references/auth-constructs.md) | You test a strategy of Passport, a guard, a filter of an exception, or a decorator. |
| [config-and-bootstrap.md](references/config-and-bootstrap.md) | You test a module of the configuration, a file of the constants, or the bootstrap. |
| [known-inconsistencies.md](references/known-inconsistencies.md) | You change an older spec that does not obey the dominant pattern. |

Read one reference file for your task. Do not read the whole folder.
