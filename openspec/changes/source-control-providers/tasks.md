## 1. Unblock the boot

- [x] 1.1 Delete the `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and `GITHUB_APP_INSTALLATION_ID` fields from `apps/backend/src/core/infrastructure/config/env-validation.config.ts`.
- [x] 1.2 Add a required `PROVIDERS_ENCRYPTION_KEY` field to the same file, validated as a non-empty string.
- [x] 1.3 Delete the three `GITHUB_APP_*` keys from `iac/production/.env.example`, and add `PROVIDERS_ENCRYPTION_KEY=`.
- [x] 1.4 Add `set_env "PROVIDERS_ENCRYPTION_KEY" "$(rand_secret)"` to `generate_env` in `scripts/install.sh`.
- [x] 1.5 Replace the `GITHUB_APP_*` lines of `print_summary` in `scripts/install.sh` with a line that sends the operator to the Providers screen.
- [x] 1.6 Add a warning line to `print_summary`: a lost `PROVIDERS_ENCRYPTION_KEY` makes every stored provider key unreadable.
- [x] 1.7 Verify that the backend starts with no GitHub credential in the environment.

## 2. The provider record

- [x] 2.1 Create `apps/backend/src/core/infrastructure/crypto/secret-cipher.ts` with the exported functions `encryptSecret` and `decryptSecret`, using AES-256-GCM.
- [x] 2.2 Create the spec of the cipher with the round trip, the wrong-key failure and the distinct-output cases.
- [x] 2.3 Create `apps/backend/src/features/providers/domain/models/provider.models.ts` with `Provider`, `ProviderCredentials` and the `ProviderType` enum.
- [x] 2.4 Create the data transfer objects of the creation and of the change under `apps/backend/src/features/providers/domain/dtos/`.
- [x] 2.5 Create `apps/backend/src/features/providers/domain/errors/provider.errors.ts` with `ProviderNotFoundError`, `ProviderNameTakenError`, `ProviderInUseError` and `ProviderCredentialsInvalidError`.
- [x] 2.6 Register the four new error codes in `apps/backend/src/core/ui/translators/http-error.translator.ts`, with `404`, `409`, `409` and `400`.
- [x] 2.7 Create `apps/backend/src/features/providers/domain/repositories/providers.repository.ts` with the interface of the repository.
- [x] 2.8 Create the use cases under `apps/backend/src/features/providers/application/`: `create-provider`, `update-provider`, `delete-provider`, `find-provider-by-id`, `get-all-providers` and `get-provider-credentials`.
- [x] 2.9 Make `create-provider` encrypt the key before it writes the row, and make `update-provider` keep the stored key when the new key is empty.
- [x] 2.10 Make `delete-provider` raise `ProviderInUseError` when a service still points at the provider.
- [x] 2.11 Create the entity, the repository and the transformer under `apps/backend/src/features/providers/infrastructure/database/`.
- [x] 2.12 Add the fingerprint of the key — the first eight characters of the SHA-256 of the PEM — to the output of the transformer, and never the key itself.
- [x] 2.13 Create `iac/production/migrations/010_providers.sql` with the table `providers` and the guarded constraint `UQ_providers_name`.
- [x] 2.14 Create the specs of the use cases and of the repository.

## 3. A source control that carries the credentials

- [x] 3.1 Add `credentials: ProviderCredentials` as the first parameter of the four methods of `apps/backend/src/features/source-control/domain/ports/source-control.port.ts`.
- [x] 3.2 Add `verifyCredentials(credentials): Promise<boolean>` to the same port.
- [x] 3.3 Replace the field `client` of `github-source-control.adapter.ts` with `private readonly clients = new Map<string, Octokit>()`.
- [x] 3.4 Rewrite `getClient` so it reads the map by the identifier of the provider, and builds a client only when the key is absent.
- [x] 3.5 Delete the dependency on `ConfigService` and the three calls of `config.get` from the adapter.
- [x] 3.6 Implement `verifyCredentials` with a request of `GET /app`.
- [x] 3.7 Reword `SourceControlNotConfiguredError` so it names the provider instead of the three environment variables.
- [x] 3.8 Update the specs of the adapter, to prove that two providers get two clients and that one provider uses its client again.

## 4. The API of the providers

- [x] 4.1 Create `apps/backend/src/features/authentication/ui/decorators/roles.decorator.ts` with the decorator `@Roles(...)`.
- [x] 4.2 Create `apps/backend/src/features/authentication/ui/guards/roles.guard.ts`, which reads `UserRole` from the users feature.
- [x] 4.3 Create the specs of the decorator and of the guard.
- [x] 4.4 Create `apps/backend/src/features/providers/ui/services/providers.service.ts`, in the style of `NamespacesService`.
- [x] 4.5 Create `apps/backend/src/features/providers/ui/controllers/providers.controller.ts` with the list, the read, the creation, the change, the removal and the test of the connection.
- [x] 4.6 Add `GET /providers/:providerId/repositories` and `GET /providers/:providerId/repositories/:repositoryId/branches` to the same controller.
- [x] 4.7 Apply `@Roles(UserRole.Admin)` to every write route of the controller of the providers.
- [x] 4.8 Create `apps/backend/src/features/providers/providers.module.ts`, and register it in `apps/backend/src/app.module.ts`.
- [x] 4.9 Delete the controller and the service of `apps/backend/src/features/source-control/ui/`, and remove them from `source-control.module.ts`.
- [x] 4.10 Create the spec of the controller, with an assertion that no body of an answer carries a private key.

## 5. The merge of the two features

The sections 2 and 4 built the feature `apps/backend/src/features/providers/`. The plan now gives the whole
management to `source-control`, so that feature moves and goes away.

- [x] 5.1 Move `domain/`, `application/`, `infrastructure/database/` and `ui/` of `apps/backend/src/features/providers/` into `apps/backend/src/features/source-control/`, and keep the name of each file.
- [x] 5.2 Move the specs of the use cases, of the repository, of the transformer and of the controller together with their subjects.
- [x] 5.3 Merge `providers.module.ts` into `apps/backend/src/features/source-control/source-control.module.ts`, and delete the folder `apps/backend/src/features/providers/`.
- [x] 5.4 Delete `ProvidersModule` from `apps/backend/src/app.module.ts`.
- [x] 5.5 Change the base path of the controller of the records from `providers` to `source-control`, so the routes read `/api/v1/source-control`, `/api/v1/source-control/:id/test` and `/api/v1/source-control/:providerId/repositories`.
- [x] 5.6 Verify that a search for `features/providers` in `apps/backend/` gives nothing.

## 6. The binding of a service to a provider

- [ ] 6.1 Add the column `providerId` and the relation `ManyToOne` to `apps/backend/src/features/services/infrastructure/database/db-service.entity.ts`.
- [ ] 6.2 Add `providerId` to the domain model of the service and to its transformer.
- [ ] 6.3 Add `providerId` with `@IsUUID()` to the data transfer object of the creation, and as optional in the one of the change.
- [ ] 6.4 Inject the repository of the providers into `deployments.service.ts`, and pass the loaded credentials to each call of `SourceControl`.
- [ ] 6.5 Do the same in `deployment-runner.service.ts`.
- [ ] 6.6 Refuse a deployment whose provider cannot reach the stored repository, with a message that names the two.
- [ ] 6.7 Create `iac/production/migrations/011_services_provider.sql`: add the column that can be empty, fill it from the single provider, set it to `NOT NULL`, then add `FK_services_providerId` with `ON DELETE RESTRICT`.
- [ ] 6.8 Update the specs of the two services of the deployments for the new dependency.

## 7. The Source Control section of the frontend

- [ ] 7.1 Create the model of the provider and the two data transfer objects under `apps/frontend/src/app/features/source-control/domain/`.
- [ ] 7.2 Add the list, the read, the creation, the change, the removal and the test of a provider to `apps/frontend/src/app/features/source-control/infrastructure/api/source-control-api.repository.ts`.
- [ ] 7.3 Create the component of the card with the name, the mark of the type, the identifier of the application, the fingerprint of the key and the state of the connection.
- [ ] 7.4 Create the component of the form with the name, the identifier of the application, the identifier of the installation and a field of several lines for the PEM.
- [ ] 7.5 State in the help text of the field of the PEM that an empty value keeps the stored key on a change.
- [ ] 7.6 Create the containers of the list, of the creation and of the change.
- [ ] 7.7 Create the pages under `apps/frontend/src/app/pages/source-control/{list,add,edit}/`.
- [ ] 7.8 Add the three routes `/source-control`, `/source-control/add` and `/source-control/edit/:id` to `apps/frontend/src/app/app.routes.ts`, beside the block of the namespaces.
- [ ] 7.9 Add the entry "Source Control" to the sidebar, beside the entry of the namespaces.
- [ ] 7.10 Apply the patterns of TailAdmin that the screens of the namespaces use.
- [ ] 7.11 Create the specs of the containers and of the component of the form.

## 8. The select of the provider in the tab "Provider"

- [ ] 8.1 Add a select of the provider as the first field of `apps/frontend/src/app/features/services/ui/components/service-provider/service-provider.component.ts`. **Note:** the plan of `docs/roadmap/` named `service-form` instead. That component holds only the name of the service.
- [ ] 8.2 Load the options of the repository from `GET /source-control/:providerId/repositories`, and keep the control blocked until a provider is chosen.
- [ ] 8.3 Load the options of the branch from the route of the branches of the provider.
- [ ] 8.4 Clear the control of the repository and the control of the branch when the provider changes.
- [ ] 8.5 Show an empty state with a link to `/source-control/add` when no provider exists.
- [ ] 8.6 Point the calls of the repositories and of the branches at the routes under `/source-control/:providerId`.
- [ ] 8.7 Add `providerId` to the data transfer objects of the service in the frontend.
- [ ] 8.8 Update the spec of the component for the three selects in the chain.

## 9. The upgrade and the cleanup

- [ ] 9.1 Create `scripts/import-github-app-provider.sh`, which reads the three variables of the `.env` file and creates a provider named `default` through the API.
- [ ] 9.2 Document the manual alternative in the header of the script: create the provider in the screen, then save each service again.
- [ ] 9.3 State in the release notes that an installation with services must create a provider before it applies migration 011.
- [ ] 9.4 Delete every remaining mention of `GITHUB_APP_*` from `docs/backend-architecture.md`, `docs/backend-business.md` and `docs/infrastructure-architecture.md`.
- [ ] 9.5 Add the Source Control section to `docs/frontend-architecture.md`, and the provider record to `docs/backend-business.md`.
- [ ] 9.6 Verify that a search for `GITHUB_APP` in `apps/`, `iac/`, `scripts/` and `docs/` gives nothing.
- [ ] 9.7 Verify that the whole suite of the tests passes.
