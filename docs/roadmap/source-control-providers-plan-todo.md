# Source control providers plan — to-do list

For the detail behind each item, see [source control providers plan](./source-control-providers-plan.md).

All the paths are relative to the root of the repository, if there is no other indication.

---

## Phase 0 — Unblock the boot

- [ ] Delete the `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and `GITHUB_APP_INSTALLATION_ID` fields from `apps/backend/src/core/infrastructure/config/env-validation.config.ts`.
- [ ] Add a required `PROVIDERS_ENCRYPTION_KEY` field to `apps/backend/src/core/infrastructure/config/env-validation.config.ts`, validated as a non-empty string.
- [ ] Delete the three `GITHUB_APP_*` keys from `iac/production/.env.example`, and add `PROVIDERS_ENCRYPTION_KEY=`.
- [ ] Add `set_env "PROVIDERS_ENCRYPTION_KEY" "$(rand_secret)"` to `generate_env` in `scripts/install.sh`.
- [ ] Replace the `GITHUB_APP_*` lines of `print_summary` in `scripts/install.sh` with a line that sends the operator to the Providers screen.
- [ ] Add a warning line to `print_summary`: a lost `PROVIDERS_ENCRYPTION_KEY` makes every stored provider key unreadable.
- [ ] Verify with `rtk pnpm run test` that the backend starts with no GitHub credential in the environment.

## Phase 1 — The provider record

- [ ] Create `apps/backend/src/core/infrastructure/crypto/secret-cipher.ts` (new) with the exported functions `encryptSecret` and `decryptSecret`, using AES-256-GCM.
- [ ] Create `apps/backend/src/core/infrastructure/crypto/__tests__/secret-cipher.spec.ts` (new) with the round trip, the wrong-key failure and the distinct-output cases.
- [ ] Create `apps/backend/src/features/providers/domain/models/provider.models.ts` (new) with `Provider`, `ProviderCredentials` and the `ProviderType` enum.
- [ ] Create `apps/backend/src/features/providers/domain/dtos/create-provider.dto.ts` (new) with `name`, `type`, `appId`, `installationId` and `privateKey`.
- [ ] Create `apps/backend/src/features/providers/domain/dtos/update-provider.dto.ts` (new) with the same fields, all optional.
- [ ] Create `apps/backend/src/features/providers/domain/errors/provider.errors.ts` (new) with `ProviderNotFoundError`, `ProviderNameTakenError`, `ProviderInUseError` and `ProviderCredentialsInvalidError`.
- [ ] Create `apps/backend/src/features/providers/domain/repositories/providers.repository.ts` (new) with the repository interface.
- [ ] Create `apps/backend/src/features/providers/application/create-provider.use-case.ts` (new), which encrypts the key before it stores the row.
- [ ] Create `update-provider.use-case.ts` (new), which keeps the stored key when the new key is empty.
- [ ] Create `delete-provider.use-case.ts` (new), which throws `ProviderInUseError` when a service still points at the provider.
- [ ] Create `find-provider-by-id.use-case.ts`, `get-all-providers.use-case.ts` and `get-provider-credentials.use-case.ts` (new).
- [ ] Create `apps/backend/src/features/providers/infrastructure/database/db-provider.entity.ts` (new) for the table `providers`.
- [ ] Create `db-providers.repository.ts` and `db-providers.transformer.ts` (new) in the same folder.
- [ ] Add the key fingerprint (the first eight characters of the SHA-256 of the PEM) to the transformer output, and never the key itself.
- [ ] Create `iac/production/migrations/010_providers.sql` (new) with the `providers` table and the guarded `UQ_providers_name` constraint.
- [ ] Create the specs of the use cases and the repository under `apps/backend/src/features/providers/**/__tests__/`.
- [ ] Verify with `rtk pnpm run test` that the new specs pass.

## Phase 2 — A provider-aware source control port

- [ ] Add `credentials: ProviderCredentials` as the first parameter of the four methods of `apps/backend/src/features/source-control/domain/ports/source-control.port.ts`.
- [ ] Add `verifyCredentials(credentials): Promise<boolean>` to the same port.
- [ ] Replace the `client` field of `apps/backend/src/features/source-control/infrastructure/github/github-source-control.adapter.ts` with `private readonly clients = new Map<string, Octokit>()`.
- [ ] Rewrite `getClient` so it reads the map by the provider id and builds a client only when the key is absent.
- [ ] Delete the `ConfigService` dependency and the three `config.get` calls from the adapter.
- [ ] Implement `verifyCredentials` with a `GET /app` request.
- [ ] Reword `SourceControlNotConfiguredError` in `apps/backend/src/features/source-control/domain/errors/source-control.errors.ts` so it names the provider instead of the environment variables.
- [ ] Update the specs of the adapter to prove that two providers get two clients, and that one provider reuses its client.
- [ ] Verify with `rtk pnpm run test` that the source-control specs pass.

## Phase 3 — The providers API

- [ ] Create `apps/backend/src/features/authentication/ui/decorators/roles.decorator.ts` (new) with the `@Roles(...)` metadata decorator.
- [ ] Create `apps/backend/src/features/authentication/ui/guards/roles.guard.ts` (new), which reads `UserRole` from `apps/backend/src/features/users/domain/models/user.models.ts`.
- [ ] Create the specs of the decorator and the guard under the `__tests__` folders of `apps/backend/src/features/authentication/ui/`.
- [ ] Create `apps/backend/src/features/providers/ui/services/providers.service.ts` (new), in the style of `NamespacesService`.
- [ ] Create `apps/backend/src/features/providers/ui/controllers/providers.controller.ts` (new) with `GET /providers`, `GET /providers/:id`, `POST /providers`, `PATCH /providers/:id`, `DELETE /providers/:id` and `POST /providers/:id/test`.
- [ ] Add `GET /providers/:providerId/repositories` and `GET /providers/:providerId/repositories/:repositoryId/branches` to the same controller.
- [ ] Apply `@Roles(UserRole.Admin)` to every write route of the providers controller.
- [ ] Create `apps/backend/src/features/providers/providers.module.ts` (new) with the controller, the service, the repository and the entity.
- [ ] Register `ProvidersModule` in `apps/backend/src/app.module.ts`.
- [ ] Delete `apps/backend/src/features/source-control/ui/controllers/source-control.controller.ts` and `ui/services/source-control.service.ts`, whose routes now live on the provider.
- [ ] Remove the deleted controller and service from `apps/backend/src/features/source-control/source-control.module.ts`.
- [ ] Create the controller spec, with an assertion that no response body carries a private key.
- [ ] Verify with `rtk pnpm run test` that the API specs pass.

## Phase 4 — Bind services to a provider

- [ ] Add the `providerId` column and the `ManyToOne` relation to `apps/backend/src/features/services/infrastructure/database/db-service.entity.ts`.
- [ ] Add `providerId` to the service domain model in `apps/backend/src/features/services/domain/models/`.
- [ ] Add `providerId` with `@IsUUID()` to `apps/backend/src/features/services/domain/dtos/create-service.dto.ts`, and as optional in `update-service.dto.ts`.
- [ ] Map the new column in the services database transformer.
- [ ] Inject the providers repository into `apps/backend/src/features/deployments/ui/services/deployments.service.ts` and pass the loaded credentials to each `SourceControl` call.
- [ ] Do the same in `apps/backend/src/features/deployments/ui/services/deployment-runner.service.ts`.
- [ ] Reject a deployment whose provider cannot reach the stored repository, with a message that names both.
- [ ] Create `iac/production/migrations/011_services_provider.sql` (new): add the nullable column, backfill it from the single provider, set it to NOT NULL, then add `FK_services_providerId` with `ON DELETE RESTRICT`.
- [ ] Update the specs of the two deployment services for the new dependency.
- [ ] Verify with `rtk pnpm run test` that the deployment specs pass.

## Phase 5 — The Providers section in the frontend

- [ ] Create `apps/frontend/src/app/features/providers/domain/models/provider.model.ts` (new).
- [ ] Create `apps/frontend/src/app/features/providers/domain/dtos/create-provider.dto.ts` and `update-provider.dto.ts` (new).
- [ ] Create `apps/frontend/src/app/features/providers/infrastructure/api/providers-api.repository.ts` (new) with the list, read, create, update, delete and test calls.
- [ ] Create `ui/components/provider-card/` (new) with the name, the type badge, the app id, the key fingerprint and the connection state.
- [ ] Create `ui/components/provider-form/` (new) with the name, the app id, the installation id and the PEM textarea.
- [ ] State in the help text of the PEM field that an empty value keeps the stored key on an edit.
- [ ] Create `ui/containers/providers-list/`, `ui/containers/provider-add/` and `ui/containers/provider-edit/` (new).
- [ ] Create the pages `apps/frontend/src/app/pages/providers/{list,add,edit}/` (new).
- [ ] Add the `providers`, `providers/add` and `providers/edit/:id` routes to `apps/frontend/src/app/app.routes.ts`, beside the `namespaces` block.
- [ ] Add the Providers entry to `apps/frontend/src/app/layout/ui/components/sidebar/sidebar.component.ts`, beside the `/namespaces` entry.
- [ ] Apply the TailAdmin patterns that the namespaces screens use.
- [ ] Create the specs of the containers and the form component.
- [ ] Verify with `rtk pnpm run test` that the frontend specs pass.

## Phase 6 — The provider select in the service form

- [ ] Add a required Provider select as the first source-control field of `apps/frontend/src/app/features/services/ui/components/service-form/service-form.component.ts`.
- [ ] Load the repository options from `GET /providers/:providerId/repositories`, and keep the control disabled until a provider is chosen.
- [ ] Load the branch options from the provider-scoped branches route.
- [ ] Clear the repository control and the branch control when the provider changes.
- [ ] Show an empty state with a link to `providers/add` when no provider exists.
- [ ] Point `apps/frontend/src/app/features/source-control/infrastructure/api/source-control-api.repository.ts` at the provider-scoped routes, or fold it into `providers-api.repository.ts`.
- [ ] Update `apps/frontend/src/app/features/services/domain/dtos/` for the new `providerId` field.
- [ ] Update the spec of the service form for the three chained selects.
- [ ] Verify with `rtk pnpm run test` that the service form specs pass.

## Phase 7 — Upgrade path and cleanup

- [ ] Create `scripts/import-github-app-provider.sh` (new), which reads the three variables from `.env` and creates a provider named `default` through the API.
- [ ] Document the manual alternative in the script header: create the provider in the screen, then re-save each service.
- [ ] State in the release notes that an installation with services must create a provider before it applies migration 011.
- [ ] Delete every remaining `GITHUB_APP_*` mention from `docs/backend-architecture.md`, `docs/backend-business.md` and `docs/infrastructure-architecture.md`.
- [ ] Add the Providers section to `docs/frontend-architecture.md` and the provider record to `docs/backend-business.md`.
- [ ] Verify that `rtk grep -rn "GITHUB_APP" apps/ iac/ scripts/ docs/` returns nothing.
- [ ] Verify with `rtk pnpm run test` that the whole suite passes.
