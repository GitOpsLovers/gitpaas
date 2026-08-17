# Stack

| Concern        | Tool                                                             |
|----------------|------------------------------------------------------------------|
| Framework      | NestJS 11 with Express platform                                  |
| Persistence    | PostgreSQL via NestJS TypeORM                                    |
| Live logs      | Redis Streams hot store over SSE, with a PostgreSQL archive      |
| Deploy engine  | `dockerode` and `dockerode-compose` over the local Docker socket |
| Source access  | GitHub App via `@octokit/rest` and `@octokit/auth-app`, reached through the `ProviderClient` port and configured per provider row |
| Auth           | Passport with local and JWT                                      |
| Hardening      | `helmet`, `/throttler` and `class-validator`                     |
| Testing        | Jest                                                             |
