# service-network-state

The tab "Networks" of a service reads the daemon alone. When the user joins the service to a network of its project, no row appears, because GitPaaS connects the container only at the next deployment. The same silence follows a leave: the container keeps the network, and the table says nothing.

The list merges the join of the database with the two reads of the daemon. Two states carry the wait: `joining` and `leaving`. A network of the project shows the name that the user gave, and not the name of the daemon. The state of a container that already holds the network stays `connected`.

The attachment of the container itself does not change, and no deployment starts from this tab.

## Phase 1 — The merge of the join in the backend

**Agent:** implementer
**Paths:** packages/contracts/src/networks/, apps/backend/src/features/networks/

- [x] 1.1 Add `joining` and `leaving` to `networkStateSchema`, and make `driver`, `scope`, `internal`, `attachable` and `createdAt` optional in `networkSchema` (`packages/contracts/src/networks/network.contract.ts`).
- [x] 1.2 Mirror the two states and the optional fields in `NetworkState` and `Network` (`apps/backend/src/features/networks/domain/models/network.models.ts`).
- [x] 1.3 Add a read of one network by its name of the daemon to `NetworksRepository`, and implement it in `DockerNetworksRepository`.
- [x] 1.4 Take `ServiceNetworksRepository` as a third parameter of `getNetworksByServiceUseCase`, and merge its rows with the two reads of the daemon.
- [x] 1.5 Give a joined network the state `connected` when a container holds it, and `joining` when no container holds it.
- [x] 1.6 Give the state `leaving` to a network of the project that a container holds, and that the join no longer holds.
- [x] 1.7 Show the name of the user for every network of the project, and carry the identifier of the project network as the `id` of a row of the state `joining`.
- [x] 1.8 Inject `DatabaseServiceNetworksRepository` into `NetworksService`, and extend the unit tests of the use case, of the repository and of the service.

## Phase 2 — The two states in the tab

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/networks/

- [x] 2.1 Add `joining` and `leaving` to `STATE_LABELS` and to `stateBadgeClass` (`service-networks.component.ts`).
- [ ] 2.2 Show a hint on a row of the state `joining` or `leaving`, which states that the next deployment applies the change.
- [x] 2.3 Show a dash in the columns Driver, Scope, Internal, Attachable and Created when the field is absent.
- [ ] 2.4 Correct the description of the card, which says today that the list holds the networks of the stack and of the containers.
- [ ] 2.5 Extend the unit tests of the component and of `networks-api.repository.ts`.

## Phase 3 — The documentation of the behavior

**Agent:** documenter
**Paths:** docs/business/networks.md
**This is the last phase.**

- [ ] 3.1 Correct the four sections of `networks.md` that the feature makes false: the list (`:9`), the state (`:56`), the tab (`:78`) and the join (`:187`).
- [ ] 3.2 Write the two new states, and the rule of the name of the user.
- [ ] 3.3 Delete `docs/roadmap/service-network-state/`, and its line of `docs/roadmap.md`.
