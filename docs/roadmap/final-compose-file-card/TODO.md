# final-compose-file-card

A user reads the Compose file of the repository, but GitPaaS changes that file before it starts the stack. Nobody can see the result of those changes, so a wrong image name, a wrong label or a wrong network stays invisible. The feature saves the final Compose text at every deployment, and it shows that text in a new card of the tab General of a service. The card masks the value of every variable, so no secret leaves the server. The tab of a service that holds no deployment shows the file of the repository, or an empty state. The card never edits the file, and it never starts a deployment.

Two dependencies need an installation by the user, and no agent installs them: `yaml` in `apps/backend`, and `highlight.js` in `apps/frontend`.

## Phase 1 — The final Compose text of a deployment

**Agent:** implementer
**Paths:** `apps/backend/src/features/deployments/`, `apps/backend/src/core/infrastructure/docker/`

- [x] 1.1 Add the column `finalCompose` of type text, nullable, to `db-deployment.entity.ts`, and write its migration.
- [x] 1.2 In `DockerExecutorAdapter.up()`, after `injectEnvironment`, add to the recipe the proxy network and the project networks that `attachToProxy` and `attachToProjectNetworks` attach after the start.
- [x] 1.3 Rewrite every bind mount of the dumped copy back to its relative source, because `resolveBindMounts` makes it an absolute path of a temporary folder.
- [x] 1.4 Replace the value of every variable of the section `environment` with `****` in the dumped copy. The recipe that the daemon receives keeps its true values.
- [x] 1.5 Dump that copy to YAML with the package `yaml`, and save the text on the row of the deployment.
- [x] 1.6 Write the unit tests of the mask, of the rewrite of the bind mounts and of the entries of the networks.

## Phase 2 — The endpoint that reads the final Compose file

**Agent:** implementer
**Paths:** `apps/backend/src/features/services/`

- [x] 2.1 Add the use case that answers the final Compose file of a service: the text of the last deployment that ran, if one exists.
- [x] 2.2 If the service holds no deployment and it holds a provider, answer the Compose file of the repository, and mark the answer as the file of the repository.
- [x] 2.3 If the service holds no deployment and no provider, answer an empty result.
- [x] 2.4 Add the route `GET /api/v1/services/:id/final-compose` to `services.controller.ts`, with its DTO of the answer: the text, and the origin of the text.
- [x] 2.5 Write the unit tests of the three cases of the use case.

## Phase 3 — The card of the tab General

**Agent:** implementer
**Paths:** `apps/frontend/src/app/shared/components/`, `apps/frontend/src/app/features/services/`

- [x] 3.1 Create the shared component `yaml-viewer`: a scrollable block of a monospace font, the syntax highlighting of `highlight.js`, a button that copies the text, and a button that downloads it.
- [x] 3.2 Add the method of the API and the resource that call `GET /api/v1/services/:id/final-compose`.
- [x] 3.3 Add the card `final-compose` below `<app-service-deploy-actions>` in `service-detail.component.html`, expanded, with the viewer inside it.
- [x] 3.4 Show the state of the load, the empty state with its explanation, and the note that says when the text comes from the repository and not from a deployment.
- [x] 3.5 Show a note that says that GitPaaS masks the value of every variable.
- [x] 3.6 Write the unit tests of the viewer and of the card.

## Phase 4 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 4.1 Write the rule of the card and of the mask into `docs/business/services.md`, and correct the sentence of the line 396 that gives one action alone to the tab General.
- [ ] 4.2 Write into `docs/business/deployments.md` that a deployment saves its final Compose text.
- [ ] 4.3 Write the rule of the endpoint `compose-services`, which the pages of `docs/business/` do not hold today.
- [ ] 4.4 Add the note of the mask to `docs/business/service-environment.md`.
- [ ] 4.5 Delete the folder `docs/roadmap/final-compose-file-card/`, and its line of `docs/roadmap.md`.
