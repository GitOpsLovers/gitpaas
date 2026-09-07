# The external networks of a recipe

A service of a recipe joins one external network alone. `dockerode-compose` attaches a second network through a helper that skips every external network, so the deployment fails with a `TypeError`, and the user reads "Could not reach the server Docker daemon". A stack that creates a network also fails on its next deployment, because a container of another stack holds that network and blocks its removal.

GitPaaS removes both problems the way it already handles the network of the proxy: it takes the external networks out of the recipe, and the adapter attaches each container after the start of the stack. A recipe network that survives its removal takes the same path, so the deployment reuses it.

The count of the networks of a service of the recipe stays out of the model of the data, and the user interface does not change.

## Phase 1 — The strip of the external networks of the recipe

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/infrastructure/docker/compose-recipe.transformer.ts

- [x] 1.1 Add `stripExternalNetworks(compose)`, which removes every top-level network that holds `external: true`, and returns the map of the name of the compose service to the names of those networks on the daemon.
- [x] 1.2 Read the name on the daemon from the field `name` of the block, and from the key of the block when that field is absent.
- [x] 1.3 Remove those keys from the block `networks` of each service, in the list form and in the map form.
- [x] 1.4 Delete the block `networks` of a service that keeps no key, so `declareDefaultNetwork` gives that service the key of the default network.
- [x] 1.5 Write the unit tests of the new function, with a service of two external networks, a service of a mixed pair, and a block that holds no field `name`.

## Phase 2 — The attach of those networks after the start

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/infrastructure/docker/docker-executor.adapter.ts, apps/backend/src/features/deployments/infrastructure/docker/final-compose.transformer.ts

- [x] 2.1 Call `stripExternalNetworks` in `up()`, before `declareDefaultNetwork`, and hold its map.
- [x] 2.2 Add `attachToRecipeNetworks(containers, map, emit)`, which reads the label `COMPOSE_SERVICE_LABEL` of each container, and connects it to each network of that compose service with the alias of the name of that service.
- [x] 2.3 Call that method after the start of the stack, beside `attachToProjectNetworks`.
- [x] 2.4 Report a network that the daemon does not hold with a line of log, and fail the deployment with a message that names that network.
- [x] 2.5 Declare those networks again in the text of the final Compose file, through `declareAttachedNetworks`, so the card of the user shows the truth.
- [x] 2.6 Write the unit tests of the adapter and of the transformer of the final Compose file.

## Phase 3 — The network of the recipe that survives its removal

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/infrastructure/docker/docker-executor.adapter.ts

- [ ] 3.1 After `removeServiceNetworks`, list the networks of the daemon, and find each network of the recipe that the daemon still holds.
- [ ] 3.2 Take each one out of the recipe, and add it to the map of the attach of the phase 2, so the engine creates it again and the daemon answers no code 409.
- [ ] 3.3 Emit a line of log that names the network and states that the deployment reuses it.
- [ ] 3.4 Write the unit tests of that path, with a network that the removal keeps and a network that the removal takes away.

## Phase 4 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 4.1 Write the new behavior of the networks of a recipe into `docs/business/`.
- [ ] 4.2 Correct the page of `docs/architecture/backend/` that states the limit of one external network.
- [ ] 4.3 Delete the folder `docs/roadmap/recipe-external-networks/`, and its line of `docs/roadmap.md`.
