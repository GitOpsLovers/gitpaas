---
name: nestjs-best-practices
description: NestJS patterns reference - modules, DI, guards, pipes, queues. The skill backend-architecture wins over it.
---

# NestJS

The general practice of the framework, in 40 rules. `backend-architecture` holds the layers, the ports, the transformers and the naming of this project, and it wins over this skill. Read this skill for a pattern of NestJS that no page of `docs/architecture/backend/` covers.

Two rules of this skill already lose to a page of the project. `di-use-interfaces-tokens` asks for an injection token, and this project uses none. `arch-use-repository-pattern` describes a repository that this project shapes as a port and an adapter. `docs/architecture/backend/conventions.md` wins in both cases.

## The reference files

One rule is one file at `references/<name>.md`. Read the rules that your task needs, and no other.

| The file | Read it when |
| --- | --- |
| [arch-avoid-circular-deps.md](references/arch-avoid-circular-deps.md) | Two modules import each other. |
| [arch-feature-modules.md](references/arch-feature-modules.md) | You place a module, by the feature and not by the layer of the technique. |
| [arch-module-sharing.md](references/arch-module-sharing.md) | You export or you import a provider between two modules. |
| [arch-single-responsibility.md](references/arch-single-responsibility.md) | A service grew too large. |
| [arch-use-repository-pattern.md](references/arch-use-repository-pattern.md) | You separate the access of the database from the logic. |
| [arch-use-events.md](references/arch-use-events.md) | You decouple two features with an event. |
| [di-avoid-service-locator.md](references/di-avoid-service-locator.md) | Code asks the container for a dependency at the runtime. |
| [di-interface-segregation.md](references/di-interface-segregation.md) | An interface asks a consumer for a method that it does not use. |
| [di-liskov-substitution.md](references/di-liskov-substitution.md) | An adapter must replace its port with no surprise. |
| [di-prefer-constructor-injection.md](references/di-prefer-constructor-injection.md) | You choose between the constructor and the property. |
| [di-scope-awareness.md](references/di-scope-awareness.md) | You need the scope singleton, request or transient. |
| [di-use-interfaces-tokens.md](references/di-use-interfaces-tokens.md) | You read about the tokens. This project uses none. |
| [error-use-exception-filters.md](references/error-use-exception-filters.md) | You centralize the handling of the errors. |
| [error-throw-http-exceptions.md](references/error-throw-http-exceptions.md) | You throw an error that reaches the client. |
| [error-handle-async-errors.md](references/error-handle-async-errors.md) | An asynchronous call can reject. |
| [security-auth-jwt.md](references/security-auth-jwt.md) | You issue or you verify a token JWT. |
| [security-validate-all-input.md](references/security-validate-all-input.md) | You validate a body with class-validator. |
| [security-use-guards.md](references/security-use-guards.md) | You protect a route with a guard. |
| [security-sanitize-output.md](references/security-sanitize-output.md) | An answer can carry a script. |
| [security-rate-limiting.md](references/security-rate-limiting.md) | You limit the rate of the calls of a client. |
| [perf-async-hooks.md](references/perf-async-hooks.md) | You use a hook of the lifecycle. |
| [perf-use-caching.md](references/perf-use-caching.md) | You cache a result. |
| [perf-optimize-database.md](references/perf-optimize-database.md) | A query is slow. |
| [perf-lazy-loading.md](references/perf-lazy-loading.md) | The start of the application is slow. |
| [test-use-testing-module.md](references/test-use-testing-module.md) | You build a module of test. `backend-unit-testing` wins for a spec of this project. |
| [test-e2e-supertest.md](references/test-e2e-supertest.md) | You read about the E2E. This project never runs it. |
| [test-mock-external-services.md](references/test-mock-external-services.md) | You mock an external service. |
| [db-use-transactions.md](references/db-use-transactions.md) | Two writes must succeed together, or fail together. |
| [db-avoid-n-plus-one.md](references/db-avoid-n-plus-one.md) | A loop runs one query for one row. |
| [db-use-migrations.md](references/db-use-migrations.md) | You change the schema of the database. |
| [api-use-dto-serialization.md](references/api-use-dto-serialization.md) | You shape the answer of an endpoint. |
| [api-use-interceptors.md](references/api-use-interceptors.md) | You add a concern around every call. |
| [api-versioning.md](references/api-versioning.md) | You version the API. |
| [api-use-pipes.md](references/api-use-pipes.md) | You transform the input of a handler. |
| [micro-use-patterns.md](references/micro-use-patterns.md) | You send a message or an event between two services. |
| [micro-use-health-checks.md](references/micro-use-health-checks.md) | An orchestrator must read the health of the service. |
| [micro-use-queues.md](references/micro-use-queues.md) | You run a job in the background. |
| [devops-use-config-module.md](references/devops-use-config-module.md) | You read the configuration of the environment. |
| [devops-use-logging.md](references/devops-use-logging.md) | You write a structured log. |
| [devops-graceful-shutdown.md](references/devops-graceful-shutdown.md) | The service must stop with no loss of a request. |
| [_sections.md](references/_sections.md) | You need the ten categories and the order of their priority. |
| [_template.md](references/_template.md) | You write a new rule for this skill. |

Read one reference file for your task. Do not read the whole folder.
