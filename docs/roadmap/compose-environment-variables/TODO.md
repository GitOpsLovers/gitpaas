# compose-environment-variables

A service injects a variable into its container only when the compose file declares that name, but the tab Environment never says which names the compose file declares. The user guesses, and a variable that the compose file ignores reaches no container.

GitPaaS parses the key `environment` of the compose file of the service, caches the names that it finds, and shows them in the tab Environment as rows with a badge `Compose`. The user fills the value, and a name that the user already created keeps its value and gains the badge.

Out of scope: the key `env_file`, the references `${VAR}` of the rest of the recipe, and every change of the injection at the deployment.

## Phase 1 — The parser and the cache of the backend

**Agent:** implementer
**Paths:** apps/backend/src/features/services/, apps/backend/src/features/service-environment/

- [x] 1.1 Write a function that takes the text of a compose file and returns the names and the literal values of the key `environment` of every service. A value that holds `${...}` returns an empty value.
- [x] 1.2 Add the column of the cache to the entity of the service, and write its migration. The column holds the names, the values and the moment of the last refresh.
- [x] 1.3 Refresh the cache when the user writes the field of the compose file of the tab Provider. A failure of the download or of the parse leaves the cache untouched, and it never fails the write.
- [x] 1.4 Add the endpoint that refreshes the cache on demand for one service.
- [x] 1.5 Write the unit tests of the parser, of the refresh and of the endpoint.

## Phase 2 — The read model of the variables

**Agent:** implementer
**Paths:** packages/contracts/src/service-environment/, apps/backend/src/features/service-environment/

- [ ] 2.1 Add the field of the origin and the moment of the refresh to the contract of the variable and to the response of the list.
- [ ] 2.2 Union the rows of the table with the names of the cache at the read of the list. A name of both sides gives one row alone, which keeps the value of the table.
- [ ] 2.3 Give the value of the cache to a name that the table does not hold, and mark that row as unsaved.
- [ ] 2.4 Keep the delete and the rename of a row of the compose file working, and keep the row out of the list of that name until the next refresh.
- [ ] 2.5 Write the unit tests of the union, of the collision and of the delete.

## Phase 3 — The tab Environment

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/services/

- [ ] 3.1 Show the badge `Compose` on a row whose origin is the compose file.
- [ ] 3.2 Show a row of the compose file that the user never saved with its value prefilled, and let the user save it.
- [ ] 3.3 Ask the user to confirm the delete or the rename of a row of the compose file, and say that the row comes from the compose file.
- [ ] 3.4 Add the button that refreshes the cache, and refresh the list after it answers.
- [ ] 3.5 Keep the create, the edit and the delete of a variable working when the service holds no provider or when the path does not resolve.
- [ ] 3.6 Write the unit tests of the component and of the container.

## Phase 4 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 4.1 Write the behavior of the feature into `docs/business/service-environment.md`, and name the badge, the prefill, the confirm and the refresh.
- [ ] 4.2 Correct `docs/business/providers.md` and `docs/business/services.md` where the feature made them false.
- [ ] 4.3 Delete the folder `docs/roadmap/compose-environment-variables/` and its line of `docs/roadmap.md`.
