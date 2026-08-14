## 1. Unblock the boot

- [ ] 1.1 Delete the `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and `GITHUB_APP_INSTALLATION_ID` fields from `apps/backend/src/core/infrastructure/config/env-validation.config.ts`.
- [ ] 1.2 Add a required `PROVIDERS_ENCRYPTION_KEY` field to the same file, validated as a non-empty string.
- [ ] 1.3 Delete the three `GITHUB_APP_*` keys from `iac/production/.env.example`, and add `PROVIDERS_ENCRYPTION_KEY=`.
- [ ] 1.4 Add `set_env "PROVIDERS_ENCRYPTION_KEY" "$(rand_secret)"` to `generate_env` in `scripts/install.sh`.
- [ ] 1.5 Replace the `GITHUB_APP_*` lines of `print_summary` in `scripts/install.sh` with a line that sends the operator to the Providers screen.
- [ ] 1.6 Add a warning line to `print_summary`: a lost `PROVIDERS_ENCRYPTION_KEY` makes every stored provider key unreadable.
- [ ] 1.7 Verify that the backend starts with no GitHub credential in the environment.

## 2. The provider record

- [ ] 2.1 Create `apps/backend/src/core/infrastructure/crypto/secret-cipher.ts` with the exported functions `encryptSecret` and `decryptSecret`, using AES-256-GCM.
- [ ] 2.2 Create the spec of the cipher with the round trip, the wrong-key failure and the distinct-output cases.
- [ ] 2.3 Create `apps/backend/src/features/providers/domain/models/provider.models.ts` with `Provider`, `ProviderCredentials` and the `ProviderType` enum.
- [ ] 2.4 Create the data transfer objects of the creation and of the change under `apps/backend/src/features/providers/domain/dtos/`.
- [ ] 2.5 Create `apps/backend/src/features/providers/domain/errors/provider.errors.ts` with `ProviderNotFoundError`, `ProviderNameTakenError`, `ProviderInUseError` and `ProviderCredentialsInvalidError`.
- [ ] 2.6 Register the four new error codes in `apps/backend/src/core/ui/translators/http-error.translator.ts`, with `404`, `409`, `409` and `400`.
- [ ] 2.7 Create `apps/backend/src/features/providers/domain/repositories/providers.repository.ts` with the interface of the repository.
- [ ] 2.8 Create the use cases under `apps/backend/src/features/providers/application/`: `create-provider`, `update-provider`, `delete-provider`, `find-provider-by-id`, `get-all-providers` and `get-provider-credentials`.
- [ ] 2.9 Make `create-provider` encrypt the key before it writes the row, and make `update-provider` keep the stored key when the new key is empty.
- [ ] 2.10 Make `delete-provider` raise `ProviderInUseError` when a service still points at the provider.
- [ ] 2.11 Create the entity, the repository and the transformer under `apps/backend/src/features/providers/infrastructure/database/`.
- [ ] 2.12 Add the fingerprint of the key — the first eight characters of the SHA-256 of the PEM — to the output of the transformer, and never the key itself.
- [ ] 2.13 Create `iac/production/migrations/010_providers.sql` with the table `providers` and the guarded constraint `UQ_providers_name`.
- [ ] 2.14 Create the specs of the use cases and of the repository.

## 3. A source control that carries the credentials

- [ ] 3.1 Add `credentials: ProviderCredentials` as the first parameter of the four methods of `apps/backend/src/features/source-control/domain/ports/source-control.port.ts`.
- [ ] 3.2 Add `verifyCredentials(credentials): Promise<boolean>` to the same port.
- [ ] 3.3 Replace the field `client` of `github-source-control.adapter.ts` with `private readonly clients = new Map<string, Octokit>()`.
- [ ] 3.4 Rewrite `getClient` so it reads the map by the identifier of the provider, and builds a client only when the key is absent.
- [ ] 3.5 Delete the dependency on `ConfigService` and the three calls of `config.get` from the adapter.
- [ ] 3.6 Implement `verifyCredentials` with a request of `GET /app`.
- [ ] 3.7 Reword `SourceControlNotConfiguredError` so it names the provider instead of the three environment variables.
- [ ] 3.8 Update the specs of the adapter, to prove that two providers get two clients and that one provider uses its client again.

## 4. The API of the providers

- [ ] 4.1 Create `apps/backend/src/features/authentication/ui/decorators/roles.decorator.ts` with the decorator `@Roles(...)`.
- [ ] 4.2 Create `apps/backend/src/features/authentication/ui/guards/roles.guard.ts`, which reads `UserRole` from the users feature.
- [ ] 4.3 Create the specs of the decorator and of the guard.
- [ ] 4.4 Create `apps/backend/src/features/providers/ui/services/providers.service.ts`, in the style of `NamespacesService`.
- [ ] 4.5 Create `apps/backend/src/features/providers/ui/controllers/providers.controller.ts` with the list, the read, the creation, the change, the removal and the test of the connection.
- [ ] 4.6 Add `GET /providers/:providerId/repositories` and `GET /providers/:providerId/repositories/:repositoryId/branches` to the same controller.
- [ ] 4.7 Apply `@Roles(UserRole.Admin)` to every write route of the controller of the providers.
- [ ] 4.8 Create `apps/backend/src/features/providers/providers.module.ts`, and register it in `apps/backend/src/app.module.ts`.
- [ ] 4.9 Delete the controller and the service of `apps/backend/src/features/source-control/ui/`, and remove them from `source-control.module.ts`.
- [ ] 4.10 Create the spec of the controller, with an assertion that no body of an answer carries a private key.

## 5. The binding of a service to a provider

- [ ] 5.1 Add the column `providerId` and the relation `ManyToOne` to `apps/backend/src/features/services/infrastructure/database/db-service.entity.ts`.
- [ ] 5.2 Add `providerId` to the domain model of the service and to its transformer.
- [ ] 5.3 Add `providerId` with `@IsUUID()` to the data transfer object of the creation, and as optional in the one of the change.
- [ ] 5.4 Inject the repository of the providers into `deployments.service.ts`, and pass the loaded credentials to each call of `SourceControl`.
- [ ] 5.5 Do the same in `deployment-runner.service.ts`.
- [ ] 5.6 Refuse a deployment whose provider cannot reach the stored repository, with a message that names the two.
- [ ] 5.7 Create `iac/production/migrations/011_services_provider.sql`: add the column that can be empty, fill it from the single provider, set it to `NOT NULL`, then add `FK_services_providerId` with `ON DELETE RESTRICT`.
- [ ] 5.8 Update the specs of the two services of the deployments for the new dependency.

## 6. The Providers section of the frontend

- [ ] 6.1 Create the model and the two data transfer objects under `apps/frontend/src/app/features/providers/domain/`.
- [ ] 6.2 Create `apps/frontend/src/app/features/providers/infrastructure/api/providers-api.repository.ts` with the list, the read, the creation, the change, the removal and the test.
- [ ] 6.3 Create the component of the card with the name, the mark of the type, the identifier of the application, the fingerprint of the key and the state of the connection.
- [ ] 6.4 Create the component of the form with the name, the identifier of the application, the identifier of the installation and a field of several lines for the PEM.
- [ ] 6.5 State in the help text of the field of the PEM that an empty value keeps the stored key on a change.
- [ ] 6.6 Create the containers of the list, of the creation and of the change.
- [ ] 6.7 Create the pages under `apps/frontend/src/app/pages/providers/{list,add,edit}/`.
- [ ] 6.8 Add the three routes to `apps/frontend/src/app/app.routes.ts`, beside the block of the namespaces.
- [ ] 6.9 Add the entry "Providers" to the sidebar, beside the entry of the namespaces.
- [ ] 6.10 Apply the patterns of TailAdmin that the screens of the namespaces use.
- [ ] 6.11 Create the specs of the containers and of the component of the form.

## 7. The select of the provider in the tab "Provider"

- [ ] 7.1 Add a select of the provider as the first field of `apps/frontend/src/app/features/services/ui/components/service-provider/service-provider.component.ts`. **Note:** the plan of `docs/roadmap/` named `service-form` instead. That component holds only the name of the service.
- [ ] 7.2 Load the options of the repository from `GET /providers/:providerId/repositories`, and keep the control blocked until a provider is chosen.
- [ ] 7.3 Load the options of the branch from the route of the branches of the provider.
- [ ] 7.4 Clear the control of the repository and the control of the branch when the provider changes.
- [ ] 7.5 Show an empty state with a link to `/providers/add` when no provider exists.
- [ ] 7.6 Point `source-control-api.repository.ts` at the routes of the provider, or fold it into `providers-api.repository.ts`.
- [ ] 7.7 Add `providerId` to the data transfer objects of the service in the frontend.
- [ ] 7.8 Update the spec of the component for the three selects in the chain.

## 8. The upgrade and the cleanup

- [ ] 8.1 Create `scripts/import-github-app-provider.sh`, which reads the three variables of the `.env` file and creates a provider named `default` through the API.
- [ ] 8.2 Document the manual alternative in the header of the script: create the provider in the screen, then save each service again.
- [ ] 8.3 State in the release notes that an installation with services must create a provider before it applies migration 011.
- [ ] 8.4 Delete every remaining mention of `GITHUB_APP_*` from `docs/backend-architecture.md`, `docs/backend-business.md` and `docs/infrastructure-architecture.md`.
- [ ] 8.5 Add the Providers section to `docs/frontend-architecture.md`, and the provider record to `docs/backend-business.md`.
- [ ] 8.6 Verify that a search for `GITHUB_APP` in `apps/`, `iac/`, `scripts/` and `docs/` gives nothing.
- [ ] 8.7 Verify that the whole suite of the tests passes.
