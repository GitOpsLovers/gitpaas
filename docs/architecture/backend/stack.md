# Stack

| Concern        | Tool                                                             |
|----------------|------------------------------------------------------------------|
| Framework      | NestJS 11 with Express platform                                  |
| Persistence    | PostgreSQL via NestJS TypeORM                                    |
| Live logs      | Redis Streams hot store over SSE, with a PostgreSQL archive      |
| Deploy engine  | `dockerode` and `dockerode-compose` over the local Docker socket |
| Source access  | GitHub App via `@octokit/rest` and `@octokit/auth-app`           |
| Auth           | Passport with local and JWT                                      |
| Hardening      | `helmet`, `/throttler`, `zod` and `@gitpaas/contracts`            |
| Two-factor auth| `otplib` (TOTP) and `qrcode` (the QR code of an enrolment)       |
| Scheduling     | `@nestjs/schedule` (the cron jobs)                                |
| Reverse proxy  | Traefik (`features/domains/infrastructure/traefik/`)             |
| Archives       | `tar` (source archives), `yaml` (Compose text)                   |
| Networking     | `ipaddr.js`                                                       |
| Testing        | Jest                                                             |
