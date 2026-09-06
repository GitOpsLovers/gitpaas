# ephemeral-container-state

A stack holds a container that runs one time, for an initialization or a migration, and that container exits. The bullet of the card of the service turns red, because the state of the service keeps the worst container, and the main container that runs correctly gives no green.

GitPaaS marks a one-shot compose service with the label `io.gitpaas.ephemeral` at the deployment, the contract carries that mark in the field `ephemeral`, and the state of the service ignores a one-shot container that exited.

The interface of GitPaaS gives no way to mark a service; the mark comes from the compose file of the user alone. A stack that the user deployed before this feature keeps its old bullet until he deploys it one more time.

## Phase 1 — The label of the deployment and the contract

**Agent:** implementer
**Paths:** apps/backend/src/core/, apps/backend/src/features/containers/, apps/backend/src/features/deployments/infrastructure/docker/, packages/contracts/src/containers/

- [x] 1.1 Add the constant `GITPAAS_EPHEMERAL_LABEL` with the value `io.gitpaas.ephemeral` to `apps/backend/src/core/domain/constants/gitpaas-labels.constants.ts`.
- [x] 1.2 Add the optional field `depends_on` to the interface `ComposeService` of `compose-recipe.transformer.ts`, in its two forms: the list of names, and the map of the conditions.
- [x] 1.3 In `stampLabels`, stamp the new label on a compose service when another service depends on it with the condition `service_completed_successfully`, or when the compose file of the user already holds that label on it.
- [x] 1.4 Add the field `ephemeral: boolean` to `RuntimeContainerSummary`, and read the label into it in `docker-container-runtime.transformer.ts`.
- [x] 1.5 Add the field `ephemeral: boolean` to the model `Container`, and copy it in `docker-containers.transformer.ts` and in `container-response.transformer.ts`.
- [x] 1.6 Add the required field `ephemeral` of the type boolean to `containerSchema` of `packages/contracts/src/containers/container.contract.ts`.
- [x] 1.7 Repair the fixtures of the tests of the backend that the new field breaks, and add the tests of the two rules of the detection and of the reading of the label.

## Phase 2 — The state of the service and the badge

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/services/, apps/frontend/src/app/features/containers/

- [ ] 2.1 Add the value `idle` to the type `ServiceState`, with the color `bg-gray-400` and the title `Completed` in `service-card.component.ts`.
- [ ] 2.2 In `compute-service-state.use-case.ts`, remove a container that holds `ephemeral` and that exited, then apply the rule of the worst container to the containers that stay.
- [ ] 2.3 In the same file, give the state `idle` when the removal empties the list, and keep a one-shot container that runs, which gives `ok`.
- [ ] 2.4 Show a badge `One-shot` on a container that holds `ephemeral` in `service-containers.component`, and keep its state as it is.
- [ ] 2.5 Repair the fixtures of the tests of the frontend that the new field breaks, and add the tests of the three cases: the main container runs and the one-shot exited, every container is one-shot and exited, and a one-shot container runs.

## Phase 3 — The documentation of the behavior

**Agent:** documenter
**Paths:** docs/business/, docs/roadmap/
**This is the last phase.**

- [ ] 3.1 Rewrite the rule of the state and its scenarios in `docs/business/services.md`, add the scenario of the one-shot container that exited, and add the state `idle`.
- [ ] 3.2 Add the field `ephemeral` and the badge to `docs/business/containers.md`, and write the paragraph that asks for one new deployment of a stack of before this feature.
- [ ] 3.3 Delete the folder `docs/roadmap/ephemeral-container-state/`, and delete its line of `docs/roadmap.md`.
