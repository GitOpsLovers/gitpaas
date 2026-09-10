# remove-volume-creation

The tab "Volumes" of a service lets a user create a volume, rename it, attach it and detach it. Those writes touch no container: they write a row alone, so the database and the compose file disagree. This feature removes every write of a volume, and it makes the compose file the one source of truth. The tab becomes a read-only view, and it shows the path of the mount that the compose file declares. The reconciliation of the deployment prunes a row that no compose file declares any more. The creation of a volume on the daemon stays with Docker Compose, and this feature adds none.

## Phase 1 — The removal of the writes of the backend

**Agent:** implementer
**Paths:** `apps/backend/src/features/volumes/`, `packages/contracts/src/volumes/`

- [x] 1.1 Remove the routes of the creation, of the rename, of the mount and of the unmount from the controller of the volumes, and their methods of the service.
- [x] 1.2 Delete the use cases of the creation, of the rename, of the attach and of the detach, with their tests.
- [x] 1.3 Delete the helpers that assert that the path of the mount is free and safe, with their tests.
- [x] 1.4 Remove the schemas of the creation, of the rename and of the attach from the package of the contracts, and the field of the origin from the schema of the volume.
- [x] 1.5 Remove the write methods from the repository of the volumes and from its port, and keep the reads.
- [x] 1.6 Run `rtk pnpm run check-types --filter @gitpaas/backend` and the unit tests of the backend.

## Phase 2 — The reconciliation of the volumes of the compose file

**Agent:** implementer
**Paths:** `apps/backend/src/features/volumes/`, the use case of the deployment that adopts the volumes, `iac/production/migrations/`

- [x] 2.1 Turn the adoption of the volumes of the compose file into a full reconciliation, which inserts, updates and prunes, as the reconciliation of the domains does.
- [x] 2.2 Cache the path of the mount that the compose file declares for the service, so the tab reads it without the compose file.
- [x] 2.3 Remove the column of the origin from the entity of the volume and from its mapper.
- [x] 2.4 Write the migration SQL that deletes every row of the join table of the mounts, that deletes every volume row that the reconciliation does not own, and that drops the column of the origin.
- [x] 2.5 Write the unit tests of the reconciliation, for the insert, for the update and for the prune.
- [x] 2.6 Run `rtk pnpm run check-types --filter @gitpaas/backend` and the unit tests of the backend.

## Phase 3 — The tab read-only

**Agent:** implementer
**Paths:** `apps/frontend/src/app/features/volumes/`, `apps/frontend/src/app/features/services/ui/containers/service-detail/`

- [x] 3.1 Remove the form and the three modes from the component of the volumes of the service, and its four outputs.
- [x] 3.2 Remove the handlers of the creation, of the rename, of the attach and of the detach from the container of the detail of the service.
- [x] 3.3 Remove the write methods and the drafts from the repository of the API of the volumes and from its models.
- [x] 3.4 Show the path of the mount of the compose file in the table, and remove the display of the origin.
- [x] 3.5 Update the tests of the component and of the container, and delete the cases of the writes.
- [x] 3.6 Run `rtk pnpm run check-types --filter @gitpaas/frontend` and the unit tests of the frontend.

## Phase 4 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 4.1 Rewrite `docs/business/volumes.md`: one source of truth, a read-only tab, and no creation, no rename, no attach and no detach.
- [ ] 4.2 Correct the page of the architecture that describes the flow of the volumes and the flow of the deployment.
- [ ] 4.3 Delete the folder `docs/roadmap/remove-volume-creation/` and its line of `docs/roadmap.md`.
