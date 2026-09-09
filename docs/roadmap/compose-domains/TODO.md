# The domain of the compose file

Today the user claims the domain of a service from the tab `Domains` alone, and the reverse proxy answers after the next deployment. A team that keeps its service in a repository cannot declare that domain beside the service.

This feature adds a key of GitPaaS inside the service of the `docker-compose.yaml`, which carries the host, the port and the flag `https`. A refresh caches the declaration, and a deployment creates, updates or deletes the domain as the tab does today. A value that the user saved in the tab always wins, and the compose file itself stays untouched.

Out of scope: the middlewares, the rules of the path, and every change of the generation of the certificate.

## Phase 1 — The declaration and its cache

**Agent:** implementer
**Paths:** `packages/contracts/src/domains/`, `apps/backend/src/features/services/`, `apps/backend/src/features/deployments/infrastructure/docker/compose-guard.ts`

- [x] 1.1 Add the schema of the declared domain to the contracts: the host, the port and the flag `https`.
- [x] 1.2 Permit the key `x-gitpaas-domain` of a service in the list of the keys of `compose-guard.ts`, and refuse a value that the schema rejects.
- [x] 1.3 Add a use case that parses the key `x-gitpaas-domain` of every service of the compose file, on the model of `parse-compose-environment.use-case.ts`.
- [x] 1.4 Add the column `jsonb` `composeDomains` to the entity of the service, with its migration.
- [x] 1.5 Add the use case of the refresh of that cache, and call it from the same two triggers as the environment: the save of the tab of the provider, and an endpoint of the refresh.
- [x] 1.6 Write the unit tests of the parser, of the guard and of the refresh.

## Phase 2 — The reconciliation at the deployment

**Agent:** implementer
**Paths:** `apps/backend/src/features/deployments/application/`, `apps/backend/src/features/domains/application/`

- [x] 2.1 Add the field `origin` (`user` or `compose`) to the entity of the domain, with its migration; every existing record takes `user`.
- [x] 2.2 Add a use case that reconciles the declared domains of a service before the routing of the deployment.
- [x] 2.3 Create the domain of a declaration that holds no record, and update the record of the origin `compose` when the declaration changed.
- [x] 2.4 Keep the record of the origin `user` unchanged, and never overwrite it from the compose file.
- [x] 2.5 Delete the record of the origin `compose` when its host left the compose file.
- [x] 2.6 Fail the deployment, with the host and the reason in the error, when another service already holds that host.
- [x] 2.7 Call the reconciliation from `run-deployment.use-case.ts` before the build of the routing.
- [x] 2.8 Write the unit tests of the reconciliation and of the deployment.

## Phase 3 — The tab of the domains

**Agent:** implementer
**Paths:** `apps/backend/src/features/domains/`, `apps/frontend/src/app/features/domains/`

- [x] 3.1 Carry the field `origin` of a domain in the response of the list of the domains of a service.
- [x] 3.2 Show the declared domain that holds no record yet as a row of the list, with the identifier null.
- [x] 3.3 Show the badge `Compose` on a row of the origin `compose`, as the tab of the variables does.
- [x] 3.4 Permit the edit and the delete of such a row from the tab, and turn its origin into `user` when the user saves it.
- [x] 3.5 Write the unit tests of the component and of the endpoint.

## Phase 4 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 4.1 Write the new behavior into `docs/business/domains.md`, and correct the rule of the one record for one domain.
- [ ] 4.2 Document the key `x-gitpaas-domain` in the page that covers the compose file of a service.
- [ ] 4.3 Delete the folder `docs/roadmap/compose-domains/`, and its line of `docs/roadmap.md`.
