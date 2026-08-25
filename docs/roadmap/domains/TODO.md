# The public address of a service

GitPaaS deploys a compose stack, and nothing sends traffic to it: no proxy holds the ports `80` and `443`, and no certificate exists, so an operator reaches a service by a port of the container without TLS. We add a reverse proxy to the runtime, a record of the domains in the backend, the labels of the routing at the deployment, and a tab that manages the domains of a service. A domain names its compose service, its port, and a choice of HTTPS; the proxy gets and renews the certificate of Let's Encrypt by itself. A new domain answers after the next deployment, because the routing travels in the labels of the stack. Out of scope: several servers, a certificate that the operator uploads, a route by path, a wildcard, a redirection of `www`, and a check of the record of DNS before the claim.

## Phase 1 — The proxy in the runtime

**Agent:** implementer
**Paths:** iac/production/, scripts/install.sh, docs/roadmap/security-hardening/TODO.md

- [ ] 1.1 Prove with a probe that `dockerode-compose` keeps a container on both its own network and one external network. If it does not, stop and report, because the plan of the labels fails.
- [ ] 1.2 Add the reverse proxy Traefik to `iac/production/docker-compose.yml`, holding the ports `80` and `443` of the server.
- [ ] 1.3 Create the external network of the proxy, and give the proxy read access to the socket of the Docker daemon.
- [ ] 1.4 Configure the resolver of Let's Encrypt with the challenge HTTP-01, and give the operator a switch between the staging service and the production service.
- [ ] 1.5 Move GitPaaS behind the proxy, and keep the port of today until the operator gives a domain of the control plane.
- [ ] 1.6 Add the domain of the control plane, the email address of Let's Encrypt and the switch of the staging to `scripts/install.sh` and to `iac/production/.env.example`.
- [ ] 1.7 Make the installer check that the ports `80` and `443` are free, and stop with a message that names the process that holds one.
- [ ] 1.8 Change the task 1.3 of `docs/roadmap/security-hardening/TODO.md`, so the rule accepts the one network of the proxy and refuses every other external network.

## Phase 2 — The contract and the record

**Agent:** implementer
**Paths:** packages/contracts/src/domains/, apps/backend/src/features/domains/, iac/production/migrations/

- [ ] 2.1 Create `packages/contracts/src/domains/domain.contract.ts`, with the fields `host`, `targetService`, `port`, `https` and the state of the certificate.
- [ ] 2.2 Create the feature `apps/backend/src/features/domains/`, with the division that `namespaces` uses.
- [ ] 2.3 Create the domain model, the data transfer objects of the claim, of the change and of the removal, and check the form of the name and the range of the port.
- [ ] 2.4 Put the name into small letters before the write, so one domain cannot be claimed in two forms.
- [ ] 2.5 Create the errors `DOMAIN_NOT_FOUND` and `DOMAIN_TAKEN`, and register them in the translator with `404` and `409`.
- [ ] 2.6 Create the repository, the entity and the transformer, with the rule that a domain is unique across the installation.
- [ ] 2.7 Create the migration `014`, which adds the table of the domains with the foreign key to the service and the removal in cascade.
- [ ] 2.8 Create the use cases: claim, change, remove, and list by service.
- [ ] 2.9 Create the controller and the service of the feature, under the path of the service that owns the domain.
- [ ] 2.10 Create the specs of the use cases, of the repository and of the controller.

## Phase 3 — The port of the proxy

**Agent:** implementer
**Paths:** apps/backend/src/features/domains/

- [ ] 3.1 Create the port `ReverseProxy` with the operations that build the routing of a service and that report the state of a certificate.
- [ ] 3.2 Create the adapter of Traefik, which builds the labels of one compose service from the records of the domains, with the port and the choice of HTTPS of each one.
- [ ] 3.3 Read the state of the certificate of each domain from the store of ACME of the proxy, and write it onto the record.
- [ ] 3.4 Create the specs of the adapter: no domain, one domain of HTTP, one domain of HTTPS, and several domains on two compose services.

## Phase 4 — The routing at the deployment

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/, apps/backend/src/features/services/

- [ ] 4.1 Add the endpoint that lists the compose services of the last deployment of a service, from the parsed recipe.
- [ ] 4.2 Read the domains of the service in the run of the deployment, before the executor starts the stack.
- [ ] 4.3 Stamp the labels of the routing onto the compose service that each domain names, beside `stampLabels`.
- [ ] 4.4 Attach that compose service to the external network of the proxy, and keep its own network.
- [ ] 4.5 Remove the routing of a service when that service goes away, beside the removal of its containers and its networks.
- [ ] 4.6 Update the specs of the run: a service with domains, a service without them, and a domain that names a compose service that the recipe lost.

## Phase 5 — The tab of the domains

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/domains/, apps/frontend/src/app/features/services/, apps/frontend/src/app/pages/services/

- [ ] 5.1 Create the model and the repository of the API of the domains in the frontend.
- [ ] 5.2 Add the tab `domains` to the detail of a service, after the tab `logs`, and add its value to the union of the tabs.
- [ ] 5.3 List each domain with its compose service, its port, its choice of HTTPS, the state of its certificate, and the reason when that state is `failed`.
- [ ] 5.4 Give the form that claims a domain: the name, a list of the compose services of the last deployment, the port, and the box of HTTPS.
- [ ] 5.5 Give the action that changes a domain, and the action that removes one.
- [ ] 5.6 Say that a domain answers after the next deployment, and that the certificate arrives some minutes later.
- [ ] 5.7 Show the message of the domain that another service holds, when the API answers `409`.
- [ ] 5.8 Create the specs of the tab, one per rule that this plan adds to the behavior of a service.

## Phase 6 — The documentation

**Agent:** documenter
**Paths:** docs/business/, docs/architecture/infrastructure/, README.md
**This is the last phase.**

- [ ] 6.1 Add the proxy, its network and its ports to the pages of `docs/architecture/infrastructure/`, and correct the count of the services of the runtime.
- [ ] 6.2 Add the step of the domain and of the email of Let's Encrypt to the section of the installation of `README.md`.
- [ ] 6.3 Write `docs/business/domains.md` with the rules of a domain, and add its line to `docs/business.md`.
- [ ] 6.4 Correct `docs/business/services.md` for the new tab, and `docs/business/networks.md` for the network of the proxy.
- [ ] 6.5 Delete `docs/roadmap/domains/`, and remove its line from `docs/roadmap.md`.
