# container-naming

Today GitPaaS names a compose project from the name of the service alone, and it computes that name at every use. Two services with the same name in two projects share one name, and they delete the resources of each other; a rename of a service strands its containers and its volumes. This feature gives a container the name `<namespace>_<project>_<compose service>_1`, it stores the name of the compose project at the creation of the service, and it isolates the services of one project with the label `com.gitpaas.service`. The operator re-deploys every service by hand after the change, and the deployment copies the data of a volume that carries an old name. The frontend and the reverse proxy stay out of scope.

## Phase 1 — The persisted name of the compose project

**Agent:** implementer
**Paths:** apps/backend/src/features/{services,projects,namespaces}/, apps/backend/src/shared/application/, iac/production/migrations/

- [x] 1.1 Add a use case that builds the name of the compose project from the name of the namespace and the name of the project. Convert each segment to lowercase, replace every run of a character that is not `[a-z0-9]` with `_`, then join the two segments with `_`.
- [x] 1.2 Add the column `composeProject` to the entity of the service, to its domain model and to its repository.
- [x] 1.3 Fill the column one time at the creation of a service, and never change it after.
- [x] 1.4 Add the unique constraint `(projectId, name)` to the table `services`.
- [x] 1.5 Accept an uppercase letter and a space in the name of a namespace, of a project and of a service. Normalize the name for the daemon, and raise no error.
- [x] 1.6 Write the SQL migration: the column, the backfill with the new name, the unique constraint, and a query that reports the rows that block the constraint.
- [x] 1.7 Write the unit tests of the new use case and of the changed use cases.

## Phase 2 — The label of the service, and the selectors

**Agent:** implementer
**Paths:** apps/backend/src/core/infrastructure/docker/, apps/backend/src/features/{deployments,containers,networks,volumes,services,server}/

- [ ] 2.1 Stamp the label `com.gitpaas.service` with the identifier of the service on every container, network and volume that a deployment creates.
- [ ] 2.2 Read the stored column `composeProject` in place of the computed slug in every caller of `getServiceSlug`.
- [ ] 2.3 Select by the label `com.gitpaas.service` in place of the label of the compose project, in the repositories of the containers, of the networks and of the volumes.
- [ ] 2.4 Select by the same label in the cleanup of a service that the user deletes, and in the removal of an orphan container.
- [ ] 2.5 Stop the containers of the one service at the start of a deployment, in place of the whole compose project.
- [ ] 2.6 Serialize the queue of the deployments by the identifier of the service, in place of the name of the compose project.
- [ ] 2.7 Write the unit tests of the changed repositories and use cases.

## Phase 3 — The names that derive from the compose project

**Agent:** implementer
**Paths:** apps/backend/src/features/{deployments,volumes}/

- [ ] 3.1 Add the identifier of the service to the tag of a locally built image, because two services of one project can hold the same name of a compose service.
- [ ] 3.2 Give the default network a name that holds the identifier of the service, and remove that network on a delete.
- [ ] 3.3 Keep the short slug of the service as the DNS alias on a project network, because `_` is not valid in a hostname.
- [ ] 3.4 Confirm that the name of a volume on the daemon stays unique, and correct the prefix if it does not.
- [ ] 3.5 Write the unit tests of the three names.

## Phase 4 — The copy of the data of a volume

**Agent:** implementer
**Paths:** apps/backend/src/features/{volumes,deployments}/

- [ ] 4.1 At a deployment, find the volume that carries the old name when the volume of the new name is absent.
- [ ] 4.2 Create the new volume, and copy the data with a temporary container.
- [ ] 4.3 Write one line into the log of the deployment for each volume that the system copies.
- [ ] 4.4 Write the unit tests of the copy.

## Phase 5 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 5.1 Write the new convention of the name and the new label into `docs/business/containers.md`.
- [ ] 5.2 Correct `docs/business/{networks,volumes,server,deployments,services}.md`.
- [ ] 5.3 Write the manual step of the operator: re-deploy every service, then remove the containers that hold an old name.
- [ ] 5.4 Delete the folder `docs/roadmap/container-naming/`, and its line of `docs/roadmap.md`.
