# Operations

| Task                | How                                                                                          |
|---------------------|-----------------------------------------------------------------------------------------------|
| Start dev stack     | `docker compose up -d` from `iac/development/`, then `pnpm dev` at the repo root               |
| Dev credentials     | The backend makes `admin@gitpaas.dev` / `gitpaas` at boot (`NODE_ENV=development`) with the shared `seedAdminUseCase`. The operation is idempotent, so to make the admin again, delete the admin row and restart. It is not necessary to make the volume again. |
| Dev schema          | Created by TypeORM `synchronize` on backend boot (dev only)                                    |
| Start prod stack    | `cp .env.example .env`, fill it in — `DOCKER_GID` is mandatory (compose fails fast without it) and `IMAGE_TAG` selects the published images — then `docker compose -f iac/production/docker-compose.yml up -d`. There is no build step: `backend` and `frontend` only pull prebuilt images |
| Install on a server    | `curl -fsSL …/scripts/install.sh | sh` — see [Installation](./installation.md) |
| Upgrade a server    | Re-run the installer with `--version <newer tag>` — see [Upgrades](#upgrades) for what it does and does not update |
| Prod admin seeding  | The installer puts the first admin directly into Postgres (with an argon2id hash from a temporary container) before the first start of the backend. The operation is idempotent — see [Interactive admin seeding](./installation.md#interactive-admin-seeding) |

### Upgrades

There is no separate upgrade command. The operator runs the installer again with the new version, for example `--version v1.4.0`. Today this happens:

- The installer keeps the install directory: `fetch_source` returns immediately when `<dir>/iac/production/docker-compose.yml` is already there, so **it does not download the new source**.
- `generate_env` still writes the new `IMAGE_TAG` into the existing `.env` (and refreshes `DOCKER_GID`). Then step 7 pulls the images of the new version and starts them.

> **Caveat.** The result is a **new image tag on the old compose file and the old migrations**. If the new version changes `docker-compose.yml`, or adds a `.sql` migration, the re-run does not pick up those changes, and the new images can start against a schema that is too old. To get the full new stack, either delete the install directory before the re-run (the named volumes `postgres-data` and `redis-data` live outside it and stay) or update the files in `iac/production/` by hand. Back up `.env` first — a deleted directory removes it too, and the installer then generates new secrets.

