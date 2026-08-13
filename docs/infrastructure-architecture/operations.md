# Operations

| Task                | How                                                                                          |
|---------------------|-----------------------------------------------------------------------------------------------|
| Start dev stack     | `docker compose up -d` from `iac/development/`, then `pnpm dev` at the repo root               |
| Dev credentials     | The backend makes `admin@gitpaas.dev` / `gitpaas` at boot (`NODE_ENV=development`) with the shared `seedAdminUseCase`. The operation is idempotent, so to make the admin again, delete the admin row and restart. It is not necessary to make the volume again. See [Development admin seeding](./structure.md#admin-seeding) |
| Dev schema          | Created by TypeORM `synchronize` on backend boot (dev only)                                    |
| Start prod stack    | `cp .env.example .env`, fill it in, then `docker compose -f iac/production/docker-compose.yml up -d --build` |
| Install on a server    | `curl -fsSL …/scripts/install.sh | sh` — see [Installation](./installation.md) |
| Prod admin seeding  | The installer puts the first admin directly into Postgres (with an argon2id hash from a temporary container) before the first start of the backend. The operation is idempotent — see [Interactive admin seeding](./installation.md#interactive-admin-seeding) |

### Not covered yet

- **Reverse proxy, automatic TLS, and domain routing** for the deployed applications — Phase 2.
