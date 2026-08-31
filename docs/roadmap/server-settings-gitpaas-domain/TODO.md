# server-settings-gitpaas-domain

The domain of the control plane lives in `iac/production/.env` alone, and the installer writes it one time. An administrator who moves GitPaaS to another domain must edit that file by hand on the host. We add the field `gitpaasDomain` to the settings of the server, so the administrator sets that domain from the tab "Settings". The database becomes the source of truth, and each save writes a copy into the four variables of `.env`. The save applies nothing: it shows the manual steps of the restart and of the GitHub App. The base domain of a service stays out of scope, because the feature `domains` owns it.

## Phase 1 — The field in the API of the settings

**Agent:** implementer
**Paths:** `packages/contracts/src/server/platform-settings.contract.ts`, `apps/backend/src/features/server/`

- [x] 1.1 Add `gitpaasDomain` to the contract `platform-settings.contract.ts`, as an optional string with the validation of a host name.
- [x] 1.2 Add the column `gitpaasDomain` to `db-platform-settings.entity.ts`, nullable, with the schema step of the project.
- [x] 1.3 Return the field from `get-platform-settings.use-case.ts`, and accept it in `update-platform-settings.use-case.ts`.
- [x] 1.4 Put the guard of the administrator on `PUT /api/v1/server/settings` in `ui/controllers/server.controller.ts`, and keep the read open.
- [x] 1.5 Write the unit tests of the two use-cases and of the guard.

## Phase 2 — The check of the DNS and the file `.env`

**Agent:** implementer
**Paths:** `apps/backend/src/features/server/`

- [x] 2.1 Write a function that resolves the domain and compares the address with the public address of the host.
- [x] 2.2 Call that function in `update-platform-settings.use-case.ts` before it saves, and reject the request with a clear message if the domain does not point at the host.
- [x] 2.3 Write an adapter that updates `CONTROL_PLANE_DOMAIN`, `CONTROL_PLANE_PROXY`, `CORS_ORIGIN` and `APP_BASE_URL` in `iac/production/.env`, and that keeps every other line of the file.
- [x] 2.4 Call that adapter after the row saves, and report a failure of the write without a rollback of the row.
- [x] 2.5 Write the unit tests of the check and of the writer, with a double of the file system.

## Phase 3 — The field in the tab "Settings"

**Agent:** implementer
**Paths:** `apps/frontend/src/app/features/server/`

- [ ] 3.1 Add the field of the domain to `server-settings.component.ts`, as a `linkedSignal` over `ServerApiRepository.settings()`.
- [ ] 3.2 Add the modal of confirmation, which states that the change takes a restart of the stack.
- [ ] 3.3 Show, after a save that succeeds, the command of the restart and the manual edit of the URLs of the GitHub App.
- [ ] 3.4 Show the message of the check of the DNS when the backend rejects the domain.
- [ ] 3.5 Hide or disable the field for a user who is not an administrator.
- [ ] 3.6 Write the unit tests of the container.

## Phase 4 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 4.1 Write the behavior of the field into `docs/business/server.md`.
- [ ] 4.2 Correct `docs/architecture/infrastructure/installation.md` and `key-flows.md`, which state that the installer alone sets the domain.
- [ ] 4.3 Delete the folder `docs/roadmap/server-settings-gitpaas-domain/`, and its line of `docs/roadmap.md`.
