# The environment of a service

A service needs a configuration that its repository must not hold: a database address, a key of an API, a password. An operator who needs one today commits it into the compose file, which puts a secret into the history of Git. So a service holds a set of variables, each one plain or secret, the system encrypts a secret at rest, and it never gives that value back to a client. The backend record, the encryption and the injection at the deployment are done; the tab of the frontend and the documentation stay open. Out of scope: a variable that reaches the build, and a store of the secrets outside the database.

## Phase 1 — The injection at the deployment

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/

- [x] 1.1 Read the variables of the service in the run of the deployment, and decrypt the secrets among them.
- [x] 1.2 Give the values to the executor, so the compose run puts them into the environment of the containers.
- [x] 1.3 Fail the run with a message that names the variable when a secret cannot be decrypted, and start no stack.
- [x] 1.4 Verify that no value of a secret reaches the write port of the logs.
- [x] 1.5 Update the specs of the run for a service with variables, for one without them, and for a secret that fails.

## Phase 2 — The tab of the variables

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/services/, apps/frontend/src/app/pages/services/

- [ ] 2.1 Create the model and the repository of the API of the variables in the frontend.
- [ ] 2.2 Add the tab `configuration`, with the label "Configuration", between `provider` and `deployments`.
- [ ] 2.3 List each variable with its name, and show the value of a plain variable only.
- [ ] 2.4 Show that a secret holds a value, and keep its field empty on a change.
- [ ] 2.5 Give the actions that set, change and remove a variable.
- [ ] 2.6 State that a change takes effect at the next deployment, and that a variable reaches the containers and not the build.
- [ ] 2.7 Show which rule a name breaks, when the API refuses it.
- [ ] 2.8 Create the specs of the tab, one per rule of the behavior of a variable.

## Phase 3 — The documentation and the release

**Agent:** documenter
**Paths:** docs/architecture/backend/, docs/business/, docs/architecture/infrastructure/, scripts/install.sh
**This is the last phase.**

- [ ] 3.1 State in the summary of the installer that a lost `SECRETS_ENCRYPTION_KEY` makes every stored secret unreadable.
- [ ] 3.2 State in the release notes that a compose file of a repository can print its own values into the log.
- [ ] 3.3 Add the mechanism of the variables of a service to `docs/architecture/backend/key-flows.md`.
- [ ] 3.4 Rename `PROVIDERS_ENCRYPTION_KEY` to `SECRETS_ENCRYPTION_KEY` in the three pages of `docs/architecture/` that name it.
- [ ] 3.5 Write `docs/business/service-environment.md` with the rules of a variable, and add its line to `docs/business.md`.
- [ ] 3.6 Add the tab of the configuration to the rules of `docs/business/services.md`.
- [ ] 3.7 Delete `docs/roadmap/service-environment/`, and remove its line from `docs/roadmap.md`.
