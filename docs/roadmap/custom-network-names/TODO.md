# custom-network-names

GitPaaS names a Docker network `gitpaas-<projectId>-<networkId>`, so the user reads two UUIDs in `docker network ls` and never finds the network that they created. The feature derives the name from the names that the user already typed: `<namespace>-<project>-<network>`, with the hyphen as the separator, and it holds that name unique on the daemon. GitPaaS stamps its own labels on every network that it creates, so the detection of an orphan network stops to depend on the prefix of the name, and a rename of a namespace, of a project or of a network recreates the network and reattaches its containers. A migration renames the networks that exist today. The name of the daemon and the name that the UI shows become one name. The networks that GitPaaS does not own, such as `gitpaas-proxy`, stay out of scope.

Two assumptions carry the plan, because the user did not answer them. First, a rename recreates the network at once, and not at the next deployment. Second, a service that is stopped keeps its attachment in the database, and it joins the new network at its next deployment.

## Phase 1 — The name and the labels

**Agent:** implementer
**Paths:** apps/backend/src/features/networks/, apps/backend/src/core/infrastructure/docker/

- [ ] 1.1 Add `getNetworkNameSlugUseCase` in `features/networks/application/`, which lowercases a text, replaces every run of a character outside `[a-z0-9]` with one hyphen, and trims the hyphen of each end.
- [ ] 1.2 Change `getProjectNetworkDaemonNameUseCase` to take the name of the namespace, the name of the project and the name of the network, and to return the three slugs joined by a hyphen.
- [ ] 1.3 Add the label `gitpaas.project.id` and the label `gitpaas.network.id` to the parameters of `createNetwork` of the port and of `docker-container-runtime.adapter.ts`.
- [ ] 1.4 Change `getProjectNetworksUseCase` to find an orphan network by the label `gitpaas.project.id`, and no longer by the prefix of the name.
- [ ] 1.5 Change `deleteProjectUseCase` of `features/projects/` to sweep by the same label.
- [ ] 1.6 Run `rtk pnpm run check-types --filter @gitpaas/backend`.

## Phase 2 — The creation and the uniqueness

**Agent:** implementer
**Paths:** apps/backend/src/features/networks/, packages/contracts/src/networks/

- [ ] 2.1 Change `createProjectNetworkUseCase` to load the namespace of the project, and to build the name of the daemon with the three names.
- [ ] 2.2 Refuse the creation with a domain error when another row already holds that name of the daemon.
- [ ] 2.3 Refuse the creation with a domain error when the daemon already holds a network of that name that carries no label of GitPaaS.
- [ ] 2.4 Cap the segment of the user at 63 characters in `project-network.contract.ts`, and keep the rule of the lowercase, of the digit and of the hyphen.
- [ ] 2.5 Run `rtk pnpm run check-types --filter @gitpaas/backend`.

## Phase 3 — The rename

**Agent:** implementer
**Paths:** apps/backend/src/features/networks/, apps/backend/src/features/projects/, apps/backend/src/features/namespaces/

- [ ] 3.1 Add `recreateProjectNetworkUseCase`, which creates the network of the new name, attaches every running container of the old one, deletes the old one, and stores the new name of the daemon.
- [ ] 3.2 Change `renameProjectNetworkUseCase` to call it, so the name of the daemon follows the name that the user typed.
- [ ] 3.3 Call it from `updateProjectUseCase` for every network of the renamed project.
- [ ] 3.4 Call it from `updateNamespaceUseCase` for every network of every project of the renamed namespace.
- [ ] 3.5 Run `rtk pnpm run check-types --filter @gitpaas/backend`.

## Phase 4 — The migration of the networks that exist

**Agent:** implementer
**Paths:** iac/production/migrations/, apps/backend/src/features/networks/

- [ ] 4.1 Write `026_project_networks_daemon_name.sql`, which recomputes `daemonName` of every row from the name of its namespace, of its project and of itself.
- [ ] 4.2 Add the unique index on `daemonName` if the file `017` did not create one that survives the change.
- [ ] 4.3 Add a task of the start of the backend that reconciles the daemon: it recreates every network whose name on Docker does not match its row, and it reattaches the containers.
- [ ] 4.4 Run `rtk pnpm run check-types --filter @gitpaas/backend`.

## Phase 5 — The user interface

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/networks/

- [ ] 5.1 Show one name alone in `project-networks.component.html`, and remove the second line that shows the name of the daemon.
- [ ] 5.2 Show the message of the error of a name that another network holds already.
- [ ] 5.3 Run `rtk pnpm run check-types --filter @gitpaas/frontend`.

## Phase 6 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 6.1 Change the format of the name, the rule of the orphan network and the rule of the sweep in `docs/business/networks.md`.
- [ ] 6.2 Write the behavior of the rename of a namespace and of a project into the same page.
- [ ] 6.3 Delete the folder `docs/roadmap/custom-network-names/`, and its line of `docs/roadmap.md`.
