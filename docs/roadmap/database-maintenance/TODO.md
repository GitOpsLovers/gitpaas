# database-maintenance

An operator who must inspect the database of GitPaaS in production has no tool: the production stack runs no pgAdmin, and PostgreSQL publishes no port. The tab "Server Maintenance" gains a section "Database maintenance" with one button "Debug". The first click starts a pgAdmin container that reaches the database with a read-only role and a generated password, and the second click stops that container and revokes the login of the role. The container publishes the port `PGADMIN_PORT`, which is `5050` by default, and it serves plain HTTP. The credentials of `DB_USER` never leave the backend. A write access, a TTL and a route of Traefik stay out of scope.

## Phase 1 — The runtime takes an environment, a port and a network

**Agent:** implementer
**Paths:** `apps/backend/src/core/domain/models/`, `apps/backend/src/core/infrastructure/docker/`

- [ ] 1.1 Add the optional fields `env`, `portBindings` and `network` to `RuntimeDetachedContainerOptions`.
- [ ] 1.2 Map those fields in `runDetachedContainer` of `DockerContainerRuntimeAdapter` to `Env`, `ExposedPorts`, `HostConfig.PortBindings` and `NetworkingConfig`.
- [ ] 1.3 Write the unit tests of the three new fields, and keep the existing calls of `runDetachedContainer` correct with no field.

## Phase 2 — The session of the debug of the database

**Agent:** implementer
**Paths:** `apps/backend/src/features/server/`, `apps/backend/src/core/infrastructure/config/`, `iac/production/migrations/`

- [ ] 2.1 Add `PGADMIN_PORT` (default `5050`) and `PGADMIN_IMAGE` (a pinned tag) to the validation of the environment.
- [ ] 2.2 Write the migration `027_debug_role.sql`. It creates the role `gitpaas_debug` with `NOLOGIN`, it grants `CONNECT` and `SELECT` alone, it sets `default_transaction_read_only`, and it sets the default privileges for the tables that a later migration creates.
- [ ] 2.3 Add the port `DebugRole` and its adapter of PostgreSQL. The start writes a generated password and it grants `LOGIN`; the stop sets `NOLOGIN`. The adapter runs no other DDL.
- [ ] 2.4 Write the use case `start-database-debug`. It provisions the role, it starts the container of pgAdmin with the labels `io.gitpaas.managed=true` and `io.gitpaas.debug=pgadmin`, it joins the network of PostgreSQL, and it answers the URL and the generated passwords one time.
- [ ] 2.5 Write the use case `stop-database-debug`. It removes the container and it revokes the login of the role.
- [ ] 2.6 Write the use case `get-database-debug-status`. It reads the state from the labels of Docker alone, so the state survives a restart of the backend.
- [ ] 2.7 Add the three routes to `ServerController` with `@Roles(UserRole.Admin)`, and their DTOs of the answer. The password appears in the answer of the start alone.
- [ ] 2.8 Write the unit tests of the three use cases and of the adapter of the role.

## Phase 3 — The section of the frontend

**Agent:** implementer
**Paths:** `apps/frontend/src/app/features/server/`

- [ ] 3.1 Add the three methods of the debug of the database to `ServerApiRepository`.
- [ ] 3.2 Add the section "Database maintenance" to `ServerMaintenanceComponent`, visible to the administrator alone, with the button "Debug" that toggles the state.
- [ ] 3.3 Show the URL and the generated passwords one time after the start, with a warning that says that the connection uses plain HTTP.
- [ ] 3.4 Ask for a confirmation with `ConfirmModalComponent` before the start, and report the result with `ToastService`.
- [ ] 3.5 Write the unit tests of the new state of the component and of the repository.

## Phase 4 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 4.1 Add the section "Database maintenance" to `docs/business/server.md`, and correct the table "The four actions of the maintenance".
- [ ] 4.2 Record `PGADMIN_PORT` and `PGADMIN_IMAGE` in the documentation of the environment, and state that the operator must open the port on the firewall of the VPS.
- [ ] 4.3 Delete the folder `docs/roadmap/database-maintenance/`, and its line of `docs/roadmap.md`.
