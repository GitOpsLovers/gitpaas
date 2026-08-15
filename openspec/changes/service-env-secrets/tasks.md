## 1. The helper of the encryption

- [ ] 1.1 Check if `apps/backend/src/core/infrastructure/crypto/secret-cipher.ts` exists. The change `source-control-providers` creates it. If it exists, use it and create nothing.
- [ ] 1.2 If it does not exist, create it with the exported functions that encrypt and decrypt with AES-256-GCM, and its spec.
- [ ] 1.3 Name the variable of the environment `SECRETS_ENCRYPTION_KEY`, so it serves every secret of the server, and keep the change of the providers reading it.
- [ ] 1.4 Add that variable as required to the validation of the environment, to `iac/production/.env.example` and to `scripts/install.sh`.

## 2. The variable record

- [ ] 2.1 Create the feature `apps/backend/src/features/service-config/`, with the division that `namespaces` uses.
- [ ] 2.2 Create the domain model of a variable, with the mark that says if the value is a secret.
- [ ] 2.3 Create the data transfer objects of the setting and of the change, and check the name against the rule of an environment variable.
- [ ] 2.4 Create the errors `VARIABLE_NOT_FOUND` and `VARIABLE_NAME_TAKEN`, and register them in the translator with `404` and `409`.
- [ ] 2.5 Create the repository, the entity and the transformer, with the rule that a name is unique inside one service.
- [ ] 2.6 Encrypt the value of a secret in the use case that writes it, and keep the stored value when the body carries an empty value.
- [ ] 2.7 Make the transformer give the value of a plain variable, and a mark instead of the value of a secret.
- [ ] 2.8 Create the use cases: set, change, remove, and list by service.
- [ ] 2.9 Create the migration that adds the table, with the foreign key to the service and the removal in cascade.
- [ ] 2.10 Create the controller and the service of the feature, under the path of the service that owns the variables.
- [ ] 2.11 Create the specs, with an assertion that no body of an answer carries the value of a secret.

## 3. The injection at the deployment

- [ ] 3.1 Read the variables of the service in the run of the deployment, and decrypt the secrets among them.
- [ ] 3.2 Give the values to the executor, so the compose run puts them into the environment of the containers.
- [ ] 3.3 Fail the run with a message that names the variable when a secret cannot be decrypted, and start no stack with a value that is missing.
- [ ] 3.4 Verify that no value of a secret reaches the write port of the logs.
- [ ] 3.5 Update the specs of the run for a service with variables, for one without them, and for a secret that cannot be decrypted.

## 4. The tab of the variables

- [ ] 4.1 Create the model and the repository of the API of the variables in the frontend.
- [ ] 4.2 Add the tab `variables` to the detail of a service, between `provider` and `deployments`.
- [ ] 4.3 List each variable with its name, and show the value of a plain variable only.
- [ ] 4.4 Show that a secret holds a value, and keep its field empty on a change.
- [ ] 4.5 Give the actions that set, change and remove a variable.
- [ ] 4.6 State that a change takes effect at the next deployment, and that a variable reaches the containers and not the build.
- [ ] 4.7 Show which rule a name breaks, when the API refuses it.
- [ ] 4.8 Create the specs of the tab, one per scenario of the delta of `services`.

## 5. The documentation and the release

- [ ] 5.1 State in the summary of the installer that a lost `SECRETS_ENCRYPTION_KEY` makes every stored secret unreadable.
- [ ] 5.2 State in the release notes that a compose file of a repository can print its own values into the log, and that the platform cannot stop it.
- [ ] 5.3 Add the variables of a service to `docs/backend-business.md`.

## 6. The order against the other change

- [ ] 6.1 If `app-public-urls` landed first, re-sync the delta of `services` against the main specification that it wrote, so the list of the tabs holds the tab of the domains and the tab of the variables.
