# project-networks

Two services of one project cannot talk to each other over a private route today, so the traffic leaves to the Internet. The tab `Networks` of a service is also empty for almost every service, because only a network that the recipe declares carries the label of GitPaaS.

This feature adds a network that belongs to a project. The user creates the network, and a service joins it by choice. The network is internal, so it holds no route to the Internet, and the tab shows the declared networks and the connected networks together.

A network that crosses two projects stays out of scope.

## Phase 1 — The port of the runtime

**Agent:** implementer
**Paths:** apps/backend/src/core/

- [x] 1.1 Add the method `createNetwork` to `container-runtime.port.ts`, with the name, the driver and the flag `internal`.
- [x] 1.2 Add the optional parameter `aliases` to the method `connectNetwork` of the same port.
- [x] 1.3 Add the networks of a container to the model `RuntimeContainerSummary`.
- [x] 1.4 Implement the three changes in `docker-container-runtime.adapter.ts` and in its transformer, with their unit tests.

## Phase 2 — The persistence of a network of a project

**Agent:** implementer
**Paths:** apps/backend/src/features/networks/, packages/contracts/src/networks/, iac/production/migrations/

- [x] 2.1 Add the model `ProjectNetwork`, with the identifier, the project, the display name, the name of the daemon and the state.
- [x] 2.2 Add the entity `db-project-network.entity.ts` and the entity of the join between a service and a network.
- [x] 2.3 Write the migration `017_project_networks.sql` for the two tables (015 and 016 were taken).
- [x] 2.4 Add the repository of the database, and its port in `domain/repositories/`.
- [x] 2.5 Add the contract of a network of a project, with the state `ready`, `missing` or `orphan`.

## Phase 3 — The API of the networks of a project

**Agent:** implementer
**Paths:** apps/backend/src/features/networks/

- [x] 3.1 Write the use case that creates a network, and give it the name `gitpaas-<projectId>-<networkId>` on the daemon.
- [x] 3.2 Write the use cases that list, that rename and that delete a network of a project.
- [x] 3.3 Refuse the deletion with a `409` when a container holds the network.
- [x] 3.4 Write the use cases that join a service to a network, and that remove it from the network.
- [x] 3.5 Add the controller of the routes `/api/v1/projects/:projectId/networks`, and the transformer of the response.
- [x] 3.6 Write the unit tests of the six use cases.

## Phase 4 — The attachment at the deployment

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/, apps/backend/src/features/services/, apps/backend/src/features/projects/

- [ ] 4.1 Load the networks of the project in `run-deployment.use-case.ts`, for the services that joined one.
- [ ] 4.2 Connect each container to those networks after `compose.up()`, with the slug of the service as the alias.
- [ ] 4.3 Keep the network `gitpaas-proxy` on a routed container, and never disconnect the network of the project in `removeRouting`.
- [ ] 4.4 Remove the networks of a project on the daemon when the use case deletes the project.
- [ ] 4.5 Put the label of GitPaaS on the network `<project>_default` that Docker Compose creates, so the tab shows it.
- [ ] 4.6 Write the unit tests of the four changes.

## Phase 5 — The read of the networks of a service

**Agent:** implementer
**Paths:** apps/backend/src/features/networks/

- [ ] 5.1 Read the networks that the containers of the service hold, through the model of the runtime.
- [ ] 5.2 Merge that list with the networks that the service declares, by the name of the network.
- [ ] 5.3 Give each network of the answer a state: declared and connected, declared alone, or connected alone.
- [ ] 5.4 Write the unit tests of the merge.

## Phase 6 — The interface of the user

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/networks/, apps/frontend/src/app/features/projects/

- [ ] 6.1 Show the state of each network in the table of the component `service-networks`.
- [ ] 6.2 Add the page that lists the networks of a project, and the form that creates one.
- [ ] 6.3 Add the actions that rename a network and that delete a network, with the message of the error `409`.
- [ ] 6.4 Add the control that joins a service to a network of its project.
- [ ] 6.5 Write the unit tests of the components and of the repository of the API.

## Phase 7 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 7.1 Write the behavior of the networks of a project in `docs/business/networks.md`, which says today that the capability only reads.
- [ ] 7.2 Correct `docs/business/projects.md`, because the deletion of a project now removes its networks.
- [ ] 7.3 Correct `docs/architecture/backend/structure.md`, because the feature `networks` now holds a folder of the database.
- [ ] 7.4 Delete the folder `docs/roadmap/project-networks/`, and its line of `docs/roadmap.md`.
