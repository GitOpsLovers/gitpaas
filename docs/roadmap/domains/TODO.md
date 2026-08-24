# The public address of a service

GitPaaS deploys a compose stack, and nothing sends traffic to it: no proxy holds the ports `80` and `443`, and no certificate exists, so an operator reaches a service by a port of the container without TLS. This is the first function that a Platform-as-a-Service owes its user, and GitPaaS lacks it. We add a reverse proxy to the runtime, a record of the domains in the backend, a step of the routing at the deployment, and a tab that manages the domains of a service. The proxy gets and renews the certificates of Let's Encrypt by itself. Out of scope: several servers, a certificate that the operator uploads, a route by path, a wildcard and a redirection of `www`.

## Phase 1 — The proxy in the runtime

**Agent:** implementer
**Paths:** iac/production/, scripts/install.sh

- [ ] 1.1 Add the reverse proxy to `iac/production/docker-compose.yml`, holding the ports `80` and `443` of the server.
- [ ] 1.2 Give the proxy read access to the socket of the Docker daemon, so it reads the labels of the stacks.
- [ ] 1.3 Configure the resolver of Let's Encrypt, with the staging service until a domain answers its first check.
- [ ] 1.4 Move GitPaaS behind the proxy, and keep the port of today until the operator gives a domain of the control plane.
- [ ] 1.5 Add the domain of the control plane and the email address of Let's Encrypt to `scripts/install.sh` and to `iac/production/.env.example`.
- [ ] 1.6 Make the installer check that the ports `80` and `443` are free, and stop with a message that names the process that holds one.
- [ ] 1.7 State in the release notes that the proxy also reads the socket of the daemon, which gives it the equivalent of root on the host.

## Phase 2 — The domain record

**Agent:** implementer
**Paths:** apps/backend/src/features/domains/, iac/production/migrations/

- [ ] 2.1 Create the feature `apps/backend/src/features/domains/`, with the division that `namespaces` uses.
- [ ] 2.2 Create the domain model of a domain, with the state of the certificate and its reason.
- [ ] 2.3 Create the data transfer objects of the claim and of the removal, and check the form of the name.
- [ ] 2.4 Put the name into small letters before the write, so one domain cannot be claimed in two forms.
- [ ] 2.5 Create the errors `DOMAIN_NOT_FOUND` and `DOMAIN_TAKEN`, and register them in the translator with `404` and `409`.
- [ ] 2.6 Create the repository, the entity and the transformer, with the rule that a domain is unique across the installation.
- [ ] 2.7 Create the use cases: claim, remove, list by service, and read one.
- [ ] 2.8 Create the migration that adds the table of the domains, with the foreign key to the service and the removal in cascade.
- [ ] 2.9 Create the controller and the service of the feature, under the path of the service that owns the domain.
- [ ] 2.10 Create the specs of the use cases, of the repository and of the controller.

## Phase 3 — The port of the proxy

**Agent:** implementer
**Paths:** apps/backend/src/features/domains/

- [ ] 3.1 Create the port `ReverseProxy` with the operations that write the routing of a service, remove it, and report the state of a certificate.
- [ ] 3.2 Create the adapter of Traefik, which builds the labels of the stack from the records of the domains.
- [ ] 3.3 Read the state of the certificate of each domain from the proxy, and write it onto the record.
- [ ] 3.4 Create the specs of the adapter, with a service that holds no domain, one domain and several domains.

## Phase 4 — The routing at the deployment

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/, apps/backend/src/features/services/

- [ ] 4.1 Read the domains of the service in the run of the deployment, before the executor starts the stack.
- [ ] 4.2 Give the routing to the executor, so the new stack carries the labels of each domain.
- [ ] 4.3 Remove the routing of a service when that service goes away, beside the removal of its containers and its networks.
- [ ] 4.4 Update the specs of the run for a service with domains and for a service without them.

## Phase 5 — The tab of the domains

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/services/, apps/frontend/src/app/pages/services/

- [ ] 5.1 Create the model and the repository of the API of the domains in the frontend.
- [ ] 5.2 Add the tab `domains` to the detail of a service, between `provider` and `deployments`.
- [ ] 5.3 List each domain with the state of its certificate, and the reason when that state is `failed`.
- [ ] 5.4 Give the action that claims a domain, and the action that removes one.
- [ ] 5.5 Say that a domain that the operator just claimed answers after the next deployment.
- [ ] 5.6 Show the message of the domain that another service holds, when the API answers `409`.
- [ ] 5.7 Create the specs of the tab, one per rule that this plan adds to the behavior of a service.

## Phase 6 — The documentation

**Agent:** documenter
**Paths:** docs/architecture/infrastructure/, README.md
**This is the last phase.**

- [ ] 6.1 Add the proxy and the ports to `docs/architecture/infrastructure.md`.
- [ ] 6.2 Add the step of the domain to the section of the installation of `README.md`.
- [ ] 6.3 Write `docs/business/domains.md` with the rules of a domain, and add its line to `docs/business.md`.
- [ ] 6.4 Add the tab of the domains to the rules of `docs/business/services.md`.
- [ ] 6.5 Delete `docs/roadmap/domains/`, and remove its line from `docs/roadmap.md`.
