# Source Control Providers — plan

This document gives the plan to replace the single, environment-configured GitHub App with
**providers**: named source-control credentials that an operator manages from the frontend and
selects for each service. This is a plan and not a specification of the current behavior. For the
operation of the released system, see [backend-architecture.md](../backend-architecture.md),
[backend-business.md](../backend-business.md) and
[frontend-architecture.md](../frontend-architecture.md).

## Goal

An operator opens a **Providers** section in the frontend and registers one or more GitHub Apps.
When the operator creates a service, a select field offers the registered providers. The chosen
provider gives the credentials that read the repository, list the branches, resolve the commit and
download the archive for every deployment of that service.

After this work, GitPaaS holds no GitHub credential in its environment.

## Current state

One GitHub App serves the whole installation. Three environment variables carry it:

| Variable | Where it is declared | Where it is read |
|---|---|---|
| `GITHUB_APP_ID` | `core/infrastructure/config/env-validation.config.ts:69` | `github-source-control.adapter.ts:138` |
| `GITHUB_APP_PRIVATE_KEY` | `env-validation.config.ts:74` | `github-source-control.adapter.ts:139` |
| `GITHUB_APP_INSTALLATION_ID` | `env-validation.config.ts:79` | `github-source-control.adapter.ts:140` |

`GithubSourceControlAdapter` builds **one** Octokit client, keeps it in a private field, and reuses
it for every call (`github-source-control.adapter.ts:126-154`). The `SourceControl` port takes no
credential argument, so no caller can choose an account
(`features/source-control/domain/ports/source-control.port.ts`).

Two services consume the port through the concrete adapter:

- `features/deployments/ui/services/deployments.service.ts:32`
- `features/deployments/ui/services/deployment-runner.service.ts:49`

`DbServiceEntity` stores `repositoryId` as text, with no account that owns it
(`features/services/infrastructure/database/db-service.entity.ts`).

The three variables are also mandatory at boot. The installer leaves them empty, so the backend
fails its environment validation and restarts without end. This plan removes that failure at its
root.

## Design decisions

**1. A provider is a first-class record, not a configuration file.**
A new backend feature `providers` owns it, with the same `domain` / `application` /
`infrastructure` / `ui` division that `namespaces` uses.

**2. The private key is encrypted at rest.**
The repository never stores the PEM in clear text. A new `core` helper encrypts it with AES-256-GCM
under one new environment variable, `PROVIDERS_ENCRYPTION_KEY` (32 random bytes, hex). This trades
three secrets for one, and that one secret never leaves the server.

**3. The API never returns a private key.**
The read model returns the name, the type, the app id, the installation id and a short fingerprint
(the first eight characters of the SHA-256 of the key). The update path accepts a new key and
leaves the stored key unchanged when the field is empty.

**4. The port carries the provider, and the adapter caches one client for each provider.**
Every `SourceControl` method takes the provider as its first parameter. The adapter keeps a
`Map<string, Octokit>` keyed by the provider id, so the reuse of today stays, one client for each
account.

**5. A service points at exactly one provider.**
`services."providerId"` is `NOT NULL` with `ON DELETE RESTRICT`. A provider that still holds
services cannot be deleted. This copies the rule that `namespaces` applies to projects
(`iac/production/migrations/009_namespaces.sql`).

**6. The type field prepares the next provider kind.**
The column `type` holds `github_app` today. GitLab or Bitbucket becomes a new value plus a new
adapter, and no schema change.

## Phase 0 — Unblock the boot

Small, independent, and safe to ship first.

1. Delete the three `GITHUB_APP_*` fields from `core/infrastructure/config/env-validation.config.ts`.
2. Delete the three keys from `iac/production/.env.example`.
3. Delete the `GITHUB_APP_*` lines from the "Still to do manually" text in `scripts/install.sh`
   (`print_summary`), and add `PROVIDERS_ENCRYPTION_KEY` to the generated `.env` with
   `set_env "PROVIDERS_ENCRYPTION_KEY" "$(rand_secret)"`.
4. Add `PROVIDERS_ENCRYPTION_KEY` to `env-validation.config.ts` as required.

**Done when:** the backend starts on a fresh install with no GitHub credential present.

## Phase 1 — The provider record

New feature directory `apps/backend/src/features/providers/`.

**Domain**

- `domain/models/provider.models.ts` — `Provider` (no key) and `ProviderCredentials` (with the
  decrypted key), plus the `ProviderType` enum with the single member `GithubApp`.
- `domain/dtos/create-provider.dto.ts` — `name`, `type`, `appId`, `installationId`, `privateKey`,
  validated with `class-validator` as `CreateServiceDto` is.
- `domain/dtos/update-provider.dto.ts` — the same fields, all optional.
- `domain/errors/provider.errors.ts` — `ProviderNotFoundError`, `ProviderNameTakenError`,
  `ProviderInUseError`, `ProviderCredentialsInvalidError`.
- `domain/repositories/providers.repository.ts` — the repository interface.

**Application** — one file for each use case, in the style of
`features/namespaces/application/`: `create-provider`, `update-provider`, `delete-provider`,
`find-provider-by-id`, `get-all-providers`, `get-provider-credentials`.

**Infrastructure**

- `infrastructure/database/db-provider.entity.ts` — table `providers`.
- `infrastructure/database/db-providers.repository.ts` and `db-providers.transformer.ts`.
- `core/infrastructure/crypto/secret-cipher.ts` — exported functions `encryptSecret` and
  `decryptSecret`, not a class, because they hold no state.

**Migration** `iac/production/migrations/010_providers.sql`

```sql
CREATE TABLE IF NOT EXISTS "providers" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying NOT NULL,
    "type" character varying NOT NULL DEFAULT 'github_app',
    "appId" text NOT NULL,
    "installationId" text NOT NULL,
    "privateKeyEncrypted" text NOT NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT "PK_providers_id" PRIMARY KEY ("id")
);
```

A guarded `ALTER TABLE` adds `UQ_providers_name`, in the `DO $$ ... $$` form that migration 009
uses.

**Done when:** the table exists and the repository passes its unit tests.

## Phase 2 — A provider-aware source control port

1. Change every method of `SourceControl` to take `credentials: ProviderCredentials` first:
   `listRepositories(credentials)`, `listBranches(credentials, repositoryId)`,
   `getCommit(credentials, repositoryId, ref)`,
   `getRepositoryArchive(credentials, repositoryId, ref)`.
2. In `GithubSourceControlAdapter`, replace the single `client` field with
   `private readonly clients = new Map<string, Octokit>()`. `getClient(credentials)` reads the map,
   builds the client when the key is absent, and stores it.
3. Delete the `ConfigService` dependency and the `SourceControlNotConfiguredError` throw from
   `createClient`. The error stays in the file for the case of a provider whose credentials GitHub
   rejects, with new wording that names the provider.
4. Add `verifyCredentials(credentials): Promise<boolean>` to the port. It calls
   `GET /app` and reports whether the App answers. The frontend uses it as a "Test connection"
   action.

Nothing outside the port changes its shape in this phase, because the two consumers pass the
credentials they will load in Phase 4.

**Done when:** the adapter authenticates two different Apps in one process, proven by a unit test.

## Phase 3 — The providers API

- `ui/controllers/providers.controller.ts` — `GET /providers`, `GET /providers/:id`,
  `POST /providers`, `PATCH /providers/:id`, `DELETE /providers/:id`, and
  `POST /providers/:id/test`.
- `ui/services/providers.service.ts` — calls the use cases, as `NamespacesService` does.
- `providers.module.ts` — registers the controller, the service, the repository and the entity.
- Register the module in `app.module.ts`.

Move the two repository routes onto the provider, because a repository has no meaning without an
account:

- `GET /providers/:providerId/repositories`
- `GET /providers/:providerId/repositories/:repositoryId/branches`

Keep `features/source-control` as the home of the port, the adapter and the git models. Its
controller moves to the providers feature and the old `/source-control` routes are deleted, since
no released client depends on them.

**Access control.** The project has `JwtAuthGuard` and a `@Public()` decorator, but no role guard
(`features/authentication/ui/guards/`). Provider management is an administrator action, so this
phase adds `@Roles(UserRole.Admin)` and a `RolesGuard` that reads
`UserRole` from `features/users/domain/models/user.models.ts`. Apply it to every write route of the
providers controller.

**Done when:** an administrator creates, lists, tests and deletes a provider over HTTP, and the
responses never carry a private key.

## Phase 4 — Bind services to a provider

1. `DbServiceEntity` gets `providerId` (uuid) and a `ManyToOne` relation to `DbProviderEntity`.
2. `CreateServiceDto` gets `providerId` with `@IsUUID()`. `UpdateServiceDto` gets it as optional.
3. The service domain model and its transformer carry `providerId`.
4. `DeploymentsService` and `DeploymentRunnerService` load the service, read its `providerId`, call
   `getProviderCredentialsUseCase`, and pass the credentials into every `SourceControl` call.
5. Both services inject the providers repository instead of reading configuration.

**Migration** `iac/production/migrations/011_services_provider.sql`, in the shape of migration 009:

1. `ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "providerId" uuid;`
2. Backfill every existing row with the id of the first provider, when exactly one provider exists.
3. `ALTER COLUMN "providerId" SET NOT NULL;`
4. Add `FK_services_providerId` with `ON DELETE RESTRICT`.

**Warning:** step 3 fails when the table holds services and the `providers` table is empty. The
upgrade path in Phase 7 covers this.

**Done when:** a deployment of an existing service runs with the credentials of its provider.

## Phase 5 — The Providers section in the frontend

New feature directory `apps/frontend/src/app/features/providers/`, copying the structure of
`features/namespaces/`:

- `domain/models/provider.model.ts`, `domain/dtos/create-provider.dto.ts`,
  `domain/dtos/update-provider.dto.ts`.
- `infrastructure/api/providers-api.repository.ts`.
- `ui/components/provider-card/` — name, type badge, app id, key fingerprint, connection state.
- `ui/components/provider-form/` — name, app id, installation id, and a textarea for the PEM. On
  edit, the textarea stays empty and its help text states that an empty field keeps the stored key.
- `ui/containers/providers-list/`, `provider-add/`, `provider-edit/`.

Pages under `apps/frontend/src/app/pages/providers/{list,add,edit}/`, and routes in
`app.routes.ts` beside the `namespaces` block:

```
providers, providers/add, providers/edit/:id
```

Add the entry to `layout/ui/components/sidebar/sidebar.component.ts:70`, beside `/namespaces`.

Use the TailAdmin patterns that the namespaces screens already use, so the section matches the
rest of the product.

**Done when:** an operator adds a GitHub App in the browser and the card reports a successful test.

## Phase 6 — The provider select in the service form

In `features/services/ui/components/service-form/`:

1. Add a required **Provider** select as the first field of the source-control group. It loads from
   `GET /providers`.
2. The repository select loads from `GET /providers/:providerId/repositories`, and stays disabled
   until a provider is chosen.
3. The branch select loads from the provider-scoped branches route.
4. A change of provider clears the repository and the branch, because a repository id belongs to
   one account.
5. When no provider exists, the form shows an empty state with a link to `providers/add`.

Update `features/source-control/infrastructure/api/source-control-api.repository.ts` to the new
routes, or fold it into `providers-api.repository.ts`.

**Done when:** a service is created end to end with a chosen provider.

## Phase 7 — Upgrade path and cleanup

For an installation that already runs with the environment variables:

1. Ship a one-time script `scripts/import-github-app-provider.sh`. It reads the three variables from
   `.env` and creates a provider row named `default` through the API, with the key encrypted.
2. Document the manual alternative: create the provider in the Providers screen, then re-save each
   service to select it.
3. Order the release so that migration 011 runs after the import. State plainly in the release notes
   that an installation with services must create a provider before it upgrades.

Then delete the dead paths: the `ConfigService` import in the GitHub adapter, the old
`/source-control` controller, and every remaining `GITHUB_APP_*` reference in `docs/`.

**Done when:** `grep -rn "GITHUB_APP" apps/ iac/ scripts/ docs/` returns nothing.

## Tests

| Area | Tests to add |
|---|---|
| `secret-cipher.ts` | Round trip, wrong key fails, output differs for the same input |
| Provider use cases | Create, duplicate name, update without a key, delete in use |
| `db-providers.repository` | Persistence and mapping, key never leaves in clear text |
| `GithubSourceControlAdapter` | One client for each provider, cache reuse, credential failure |
| `providers.controller` | Route codes, and no private key in any response body |
| `DeploymentsService` / `DeploymentRunnerService` | The credentials of the service's provider are used |
| Frontend | `provider-form`, `providers-list`, and the provider-driven service form |

Run the suites with the commands in `package.json`. Do not run the Playwright E2E suites.

## Risks

1. **A leaked private key.** The key is the strongest credential in the product. The mitigations
   are the encryption at rest, the read model without the key, and the administrator-only routes.
   Add a test that asserts the absence of the key in every response body.
2. **A lost encryption key.** If `PROVIDERS_ENCRYPTION_KEY` is lost, every stored key is
   unreadable. The recovery is to register the Apps again. State this in the installer summary.
3. **A repository id that crosses accounts.** A GitHub repository id is global, but the access is
   not. Rule 4 of Phase 6 prevents a stale pair. The backend must also reject a deployment whose
   provider cannot reach the stored repository, with a clear message.
4. **The order of the migrations.** Migration 011 makes `providerId` mandatory. Phase 7 states the
   sequence that an existing installation must follow.
5. **A larger port signature.** Every `SourceControl` method takes one more parameter. The change is
   mechanical, and the compiler finds each call site.

## To-do list

The item-by-item checklist lives in
[source-control-providers-plan-todo.md](./source-control-providers-plan-todo.md).

## Suggested order of the pull requests

1. Phase 0 — remove the mandatory GitHub variables, add `PROVIDERS_ENCRYPTION_KEY`.
2. Phase 1 — the provider record, the cipher and migration 010.
3. Phases 2 and 3 — the provider-aware port and the API.
4. Phase 4 — the binding of the services and migration 011.
5. Phase 5 — the Providers section.
6. Phase 6 — the provider select in the service form.
7. Phase 7 — the upgrade script and the cleanup.
