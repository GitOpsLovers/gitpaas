# volumes-tab

A service of GitPaaS keeps no record of its volumes, so a user cannot see the data of a service, and cannot attach a volume to it. We add a tab `volumes` to the detail of a service, with the same parity as the networks: the tab lists the volumes, and it creates, renames, attaches and detaches one. A volume of GitPaaS and a volume that the Compose file declares share one table, and the table marks the origin of each row. An attach and a detach take effect at the next deployment, because Docker fixes a mount when it creates the container. The removal of a service removes the volumes that GitPaaS owns. The tab offers no action that removes one volume alone.

## Phase 1 — The port of the runtime, and the adapter of Docker

**Agent:** implementer
**Paths:** apps/backend/src/core/domain/, apps/backend/src/core/infrastructure/docker/

- [x] 1.1 Prove that `dockerode-compose` accepts a top-level volume with `external: true`, and report the result. If it fails, stop and report; the plan changes.
- [x] 1.2 Add the model `RuntimeVolumeSummary` to `core/domain/models/container-runtime.models.ts`.
- [x] 1.3 Add the field `mounts` to `RuntimeContainerSummary`, from the array `Mounts` of `listContainers`.
- [x] 1.4 Add `listVolumes`, `createVolume` and `removeVolume` to `container-runtime.port.ts`.
- [x] 1.5 Implement the three methods in `docker-container-runtime.adapter.ts`.
- [x] 1.6 Write the unit tests of the adapter, and run the checks of the backend.

## Phase 2 — The feature `volumes` of the backend

**Agent:** implementer
**Paths:** apps/backend/src/features/volumes/, packages/contracts/src/volumes/

- [x] 2.1 Write the contracts of `packages/contracts/src/volumes/`: the volume, its state and the payloads of the write.
- [x] 2.2 Write the entity `DbVolumeEntity` and the join entity `DbServiceVolumeEntity`, with `serviceId`, `volumeId`, `containerPath`, `readOnly` and `composeServiceName`.
- [x] 2.3 Ask the user how the schema of production takes the two new tables, because `synchronize` is false there.
- [x] 2.4 Write `DockerVolumesRepository`, which selects by the labels of GitPaaS and by the slug of the service.
- [x] 2.5 Write the use cases: list by service, create, rename, attach and detach.
- [x] 2.6 Derive the state of each volume: `mounted`, `pending`, `missing`, `declared` or `orphan`.
- [x] 2.7 Validate the mount path: it starts with `/`, it is not `/` and not a path of the system, and it is unique in the service.
- [x] 2.8 Write the controller, the service of the UI, the transformer and the module, and write their unit tests.

## Phase 3 — The deployment, and the removal of a service

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/infrastructure/docker/, apps/backend/src/features/services/

- [ ] 3.1 Add the key `volumes` to the interface `ComposeService` of `compose-recipe.transformer.ts`.
- [ ] 3.2 Write `stampVolumes`, which writes the mounts of the join into the Compose service that the join names.
- [ ] 3.3 Declare each attached volume as a top-level volume with `external: true`. The name of the real volume of Docker is `<composeProjectName>_<key>`, because `dockerode-compose` always prefixes the reference of the service.
- [ ] 3.4 Remove the volumes that GitPaaS owns when the user removes the service, through `removeVolume` of the port. Never call `compose.down({ volumes: true })`, because it ignores `external`.
- [ ] 3.5 Write the unit tests of the transformer and of the removal, and run the checks of the backend.

## Phase 4 — The tab of the frontend

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/volumes/, apps/frontend/src/app/features/services/ui/containers/service-detail/

- [ ] 4.1 Write `VolumesApiRepository`, with the read of the list and the four writes.
- [ ] 4.2 Write the presentational component `ServiceVolumesComponent`: one table with the name, the origin, the state, the mount path, the mode and the containers that use the volume.
- [ ] 4.3 Write the form that creates a volume and attaches it: the Compose service, the mount path and the mode read-only.
- [ ] 4.4 Add the member `volumes` to the union `ServiceTab`, to the array `tabs` and to the `@switch` of the container.
- [ ] 4.5 Show the warning that an attach and a detach wait for the next deployment.
- [ ] 4.6 Write the unit tests of the component and of the repository, and run the checks of the frontend.

## Phase 5 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 5.1 Write `docs/business/volumes.md` with the behavior of the tab, its states and its rules.
- [ ] 5.2 Correct `docs/business/services.md` and `docs/business/networks.md` where the new tab makes them false.
- [ ] 5.3 Delete the folder `docs/roadmap/volumes-tab/`, and its line of `docs/roadmap.md`.
