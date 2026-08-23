# Plan — the public address of a service

The feature is stated in [TODO.md](./TODO.md). This file holds the decisions and the phases.

## The context

See [TODO.md](./TODO.md) — Why.

The deployment already drives the local Docker daemon through its socket, and it starts a compose stack per
service. The name of the compose project comes from the slug of the service, and every resource of the
platform carries a label that marks it. A proxy that reads the labels of the Docker daemon therefore needs
no configuration file of its own for a service: the deployment writes the labels, and the proxy sees them.

The single-server model holds. GitPaaS and the applications it deploys share one machine and one daemon.

## The goals

**Goals:**

- A deployed service answers on its domain, over HTTPS, with a certificate that renews itself.
- The operator gives a domain in the browser, and edits no file on the server.
- The choice of the proxy stays behind a port, so a later change can replace it.

**Non-Goals:**

- A load balancer across several servers. The model stays one server.
- A certificate that the operator uploads. This change uses Let's Encrypt only. A later change can add one.
- A path that routes to a service (`example.com/api`). One domain routes to one service.
- A redirection of `www`, and a domain that carries a wildcard. Both are later changes.

## The decisions

**1. Traefik, and not Caddy.**

Traefik reads the labels of the Docker daemon, which is exactly the surface that a deployment already
writes. A service gets its route when the executor starts the stack, with no file to write and no signal to
send. Caddy needs a file of the configuration, or its API, and that adds a second path of the state that can
go out of step with the labels.

**Alternative that the change does not take:** Caddy with its API. Its configuration of the TLS is simpler
to read, and it makes the deployment write the route two times — once as a label for the daemon, and once
through the API.

**2. The route lives on the labels of the stack, and the record of the domain is the source.**

The table of the domains is what the operator edits, and what survives a restart. The labels are the form
that the proxy reads. The executor writes the labels from the records when it starts the stack.

Thus a domain that an operator adds takes effect at the next deployment of that service, and not
immediately. `tasks.md` carries an item that makes this visible in the screen, because an operator who adds
a domain and sees no effect will call it a defect.

**3. A domain is unique across the installation.**

Two services cannot claim one domain. The database holds the rule, and the API answers `409` on the second
claim. A proxy that receives two routes for one domain picks one of them, and the operator cannot see which.

**4. The proxy is a port with one adapter.**

`ReverseProxy` holds the operations that the platform needs: write the route of a service, remove it, and
report the state of the certificate. The adapter of Traefik implements it. A later change that replaces the
proxy writes a second adapter.

**5. GitPaaS moves behind the proxy.**

The control plane answers on a domain, and not on the port `8080`. This makes the platform reachable over
HTTPS, and it frees the port. The installer must ask for that domain, and the upgrade of an installation
that answers on a port must keep answering until the operator gives one.

## The risks

**The ports `80` and `443` must be free.** → The installer checks them before it starts, and it stops with a
message that names the process that holds them.

**Let's Encrypt limits the number of certificates for one domain.** A loop that asks again for a certificate
that fails will reach that limit and lock the domain for a week. → The adapter uses the staging service of
Let's Encrypt until a domain answers a first check, and the state of the certificate is a field of the
record that the screen shows.

**A domain that points at no server, or at the wrong one.** The operator adds a domain before the DNS points
at the machine, and the certificate fails. → The record holds the state, the screen shows it, and the
message names the check that failed. This is the most common failure of a first installation, and it must
read as a state and not as a defect.

**The upgrade moves the address of the control plane.** → The change keeps the port until the operator gives
a domain. An installation that upgrades and changes nothing keeps working.

**The socket of the daemon reaches the proxy too.** Traefik reads the labels through the same socket, which
gives it the equivalent of root on the host. → The security cost is the one that
`docs/architecture/infrastructure.md` already records for the backend. The change adds no new kind of
access, and it adds a second holder of it. The release notes must say so.

## The migration

1. The migration adds the table of the domains. It is empty, so nothing breaks.
2. The stack of the production gains the proxy. An installation that gives no domain keeps answering on its
   port.
3. The operator gives the domain of GitPaaS, and then a domain per service.
4. A rollback removes the proxy from the stack. The services answer on their ports again, and the records of
   the domains stay in the database with no effect.

## The rules that this feature adds

This section states the behavior that the feature must carry when it lands. `tester` derives
one test from one scenario. In the last phase, `documenter` moves each rule below into the page
of `docs/business/` that owns its capability.

## The capability `domains`

### Purpose

This capability gives a public address to a deployed service. It holds the domains that an operator claims,
it keeps the state of the certificate of each one, and it gives the routing that the reverse proxy reads.

### The domain record

The system SHALL keep one record per domain. The record holds the identifier, the name of the domain, the
identifier of the service, the state of the certificate, and the dates of the creation and of the last
change.

The state of the certificate is `pending`, `issued` or `failed`.

#### Scenario: The system gives a domain

- **WHEN** a client reads a domain
- **THEN** the system gives the identifier, the name, the identifier of the service and the state of the
  certificate

### A domain belongs to one service

The system SHALL refuse a domain that another service already claims. A domain is unique across the whole
installation.

A service can hold several domains. A domain cannot hold several services.

#### Scenario: The domain is free

- **WHEN** an operator claims a domain that no service holds
- **THEN** the system writes the record, and it answers `201`

#### Scenario: Another service holds the domain

- **WHEN** an operator claims a domain that another service already holds
- **THEN** the system raises `DOMAIN_TAKEN`, and it answers `409 Conflict`

#### Scenario: The service holds a second domain

- **WHEN** an operator claims a second domain for one service
- **THEN** the system writes the record, and the service answers on the two domains

### The name of a domain is checked

The system SHALL accept only a name that has the form of a domain. The system SHALL put the name into small
letters before it writes the record, so two operators cannot claim the same domain in two forms.

#### Scenario: The name is not a domain

- **WHEN** an operator claims a value that has no form of a domain
- **THEN** the system answers `400 Bad Request`

#### Scenario: The name carries capital letters

- **WHEN** an operator claims a name that carries capital letters
- **THEN** the system writes the name in small letters

### The routing takes effect at the next deployment

The system SHALL write the routing of a service when a deployment of that service starts its stack.

A domain that an operator adds therefore takes effect at the next deployment of the service, and not at the
moment of the claim. The system SHALL show this in the screen, so an operator does not read the delay as a
failure.

#### Scenario: The operator adds a domain

- **WHEN** an operator claims a domain for a service that already runs
- **THEN** the system writes the record, and it says that the domain answers after the next deployment

#### Scenario: The deployment starts the stack

- **WHEN** a deployment of the service starts its stack
- **THEN** the system writes the routing of every domain of that service, and the service answers on each
  one

### The certificate

The system SHALL get a certificate for each domain, and it SHALL renew that certificate with no action of
the operator.

The system SHALL keep the state of the certificate on the record, and it SHALL report the reason when the
certificate fails. The most common reason is a name of a domain whose DNS does not point at the server.

#### Scenario: The certificate arrives

- **WHEN** the proxy gets a certificate for a domain
- **THEN** the state of that domain becomes `issued`, and the service answers over HTTPS

#### Scenario: The DNS does not point at the server

- **WHEN** the check of the domain fails, because its DNS points at another address
- **THEN** the state becomes `failed`, and the record holds a reason that names the check that failed

#### Scenario: The certificate comes near its end

- **WHEN** a certificate comes near the end of its life
- **THEN** the proxy renews it, and the operator does nothing

### The removal of a domain

The system SHALL remove a domain at the request of the operator, and it SHALL remove the routing of that
domain.

#### Scenario: The operator removes a domain

- **WHEN** an operator removes a domain of a service
- **THEN** the system removes the record and the routing, and the domain no longer answers

#### Scenario: The service goes away

- **WHEN** an operator removes a service that holds domains
- **THEN** the system removes the domains of that service and their routing

## The capability `deployments`

### The steps of the background run

The system SHALL do these steps for each run task:

1. Set the status of the deployment to `running`.
2. Get the archive of the repository at the selected commit from the source control.
3. Read the domains of the service, and build the routing that the reverse proxy reads.
4. Run the Docker executor. It extracts the archive, it builds the local services, it pulls the images of
   the registry, it stops the previous stack, and it starts the new stack with that routing.
5. Set the status to `success` or to `failed`.

The runner SHALL NOT keep the output itself. It SHALL send each line of the executor to the write port of
the logs, and it SHALL call the completion of that port with the terminal status.

#### Scenario: The executor emits a line

- **WHEN** the Docker executor emits one line of output
- **THEN** the runner sends that line to the write port of the logs

#### Scenario: The run ends

- **WHEN** the run reaches a terminal status
- **THEN** the runner calls the completion of the write port with `success` or with `failed`

#### Scenario: The run fails

- **WHEN** a step of the run raises an error
- **THEN** the runner writes one more line that holds the message of the error, and then it calls the
  completion with `failed`

#### Scenario: The service holds domains

- **WHEN** the service holds one domain or more
- **THEN** the new stack carries the routing of each domain, and the service answers on each one when the
  run ends

#### Scenario: The service holds no domain

- **WHEN** the service holds no domain
- **THEN** the run starts the stack with no routing, and the service answers on no public address

#### Scenario: The provider went away

- **WHEN** the runner cannot load the credentials of the provider of the service
- **THEN** the run fails with a message that names the provider, and the deployment gets the status `failed`

## The capability `services`

### The six tabs of the screen

The system SHALL show seven tabs, in this order: `general`, `provider`, `domains`, `deployments`,
`containers`, `network` and `logs`.

The path holds the tab. A path that names no tab opens `general`. A path that names an unknown tab also
shows `general`.

When the user chooses a tab, the system SHALL open the path of that tab. Thus the address of the browser
always names the tab that the screen shows.

#### Scenario: The path names no tab

- **WHEN** the user opens the service without a tab in the path
- **THEN** the system opens the path of the tab `general`

#### Scenario: The path names an unknown tab

- **WHEN** the path holds a word that no tab carries
- **THEN** the system shows the tab `general`

#### Scenario: The user chooses a tab

- **WHEN** the user chooses a tab
- **THEN** the system opens the path of that tab, and the screen shows it

### The tab "Domains" manages the public addresses

The tab `domains` SHALL list the domains of the service, and it SHALL give an action that claims a domain
and an action that removes one.

Each line holds the name of the domain, the state of its certificate, and the reason when that state is
`failed`.

The tab SHALL say that a domain that the operator just claimed answers after the next deployment of the
service. Without that sentence, an operator reads the delay as a defect.

#### Scenario: The service holds domains

- **WHEN** the user opens the tab, and the service holds domains
- **THEN** the tab lists each domain with the state of its certificate

#### Scenario: The service holds no domain

- **WHEN** the service holds no domain
- **THEN** the tab shows an empty state, and an action that claims the first domain

#### Scenario: The operator claims a domain

- **WHEN** the operator claims a domain that no service holds
- **THEN** the tab adds the line, and it says that the domain answers after the next deployment

#### Scenario: Another service holds the domain

- **WHEN** the operator claims a domain that another service holds
- **THEN** the tab says that the domain is already in use, and it adds no line

#### Scenario: The certificate failed

- **WHEN** the state of a domain is `failed`
- **THEN** the line shows the reason, so the operator can correct the DNS

## The phases

### Phase 1 — The proxy in the runtime

**Agent:** implementer
**Paths:** iac/production/, scripts/install.sh

- [ ] 1.1 Add the reverse proxy to `iac/production/docker-compose.yml`, holding the ports `80` and `443` of the server.
- [ ] 1.2 Give the proxy read access to the socket of the Docker daemon, so it reads the labels of the stacks.
- [ ] 1.3 Configure the resolver of Let's Encrypt, with the staging service until a domain answers its first check.
- [ ] 1.4 Move GitPaaS behind the proxy, and keep the port of today until the operator gives a domain of the control plane.
- [ ] 1.5 Add the domain of the control plane and the email address of Let's Encrypt to `scripts/install.sh` and to `iac/production/.env.example`.
- [ ] 1.6 Make the installer check that the ports `80` and `443` are free, and stop with a message that names the process that holds one.
- [ ] 1.7 State in the release notes that the proxy also reads the socket of the daemon, which gives it the equivalent of root on the host.

### Phase 2 — The domain record

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

### Phase 3 — The port of the proxy

**Agent:** implementer
**Paths:** apps/backend/src/features/domains/

- [ ] 3.1 Create the port `ReverseProxy` with the operations that write the routing of a service, remove it, and report the state of a certificate.
- [ ] 3.2 Create the adapter of Traefik, which builds the labels of the stack from the records of the domains.
- [ ] 3.3 Read the state of the certificate of each domain from the proxy, and write it onto the record.
- [ ] 3.4 Create the specs of the adapter, with a service that holds no domain, one domain and several domains.

### Phase 4 — The routing at the deployment

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/, apps/backend/src/features/services/

- [ ] 4.1 Read the domains of the service in the run of the deployment, before the executor starts the stack.
- [ ] 4.2 Give the routing to the executor, so the new stack carries the labels of each domain.
- [ ] 4.3 Remove the routing of a service when that service goes away, beside the removal of its containers and its networks.
- [ ] 4.4 Update the specs of the run for a service with domains and for a service without them.

### Phase 5 — The tab of the domains

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/services/, apps/frontend/src/app/pages/services/

- [ ] 5.1 Create the model and the repository of the API of the domains in the frontend.
- [ ] 5.2 Add the tab `domains` to the detail of a service, between `provider` and `deployments`.
- [ ] 5.3 List each domain with the state of its certificate, and the reason when that state is `failed`.
- [ ] 5.4 Give the action that claims a domain, and the action that removes one.
- [ ] 5.5 Say that a domain that the operator just claimed answers after the next deployment.
- [ ] 5.6 Show the message of the domain that another service holds, when the API answers `409`.
- [ ] 5.7 Create the specs of the tab, one per rule that this plan adds to the behavior of a service.

### Phase 6 — The documentation

**Agent:** documenter
**Paths:** docs/architecture/infrastructure/, README.md
**This is the last phase.**

- [ ] 6.1 Add the proxy and the ports to `docs/architecture/infrastructure.md`.
- [ ] 6.2 Add the step of the domain to the section of the installation of `README.md`.
- [ ] 6.3 Write `docs/business/domains.md` with the rules of a domain, and add its line to `docs/business.md`.
- [ ] 6.4 Add the tab of the domains to the rules of `docs/business/services.md`.
- [ ] 6.5 Delete `docs/roadmap/domains/`, and remove its line from `docs/roadmap.md`.
