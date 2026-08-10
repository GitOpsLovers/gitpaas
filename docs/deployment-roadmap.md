# Deployment Roadmap — toward a self-hostable PaaS

This document gives the current condition of the GitPaaS deployment system and the steps
to make it a self-hostable Platform-as-a-Service (PaaS). This is a plan and
not a specification of the current behavior. For the operation of the released system, see
[backend-architecture.md](./backend-architecture.md), [backend-business.md](./backend-business.md)
and [frontend-architecture.md](./frontend-architecture.md).

## Vision

The goal of GitPaaS is to be a **self-hosted PaaS**, as Vercel, Dokploy and Coolify are.
A user installs it on their own server and deploys their applications with it. The promise of
the product is simple: point GitPaaS at a git repository, and GitPaaS builds the application, runs it
and makes it available over HTTPS on a domain. All of this occurs on infrastructure that the user
owns and controls. There is no managed cloud in the middle. GitPaaS and the workloads that it runs
stay on the user's own server.

## Current state

GitPaaS is already a **functional single-tenant deploy engine**, and not only a data store with
a job queue. The control plane runs one deployment as an independent unit of work: "start the compose
stack of a service on the server". To do this, it clones a GitHub repository at a known commit,
builds the `build:` services of the repository, pulls the other images, and runs the
`docker-compose` stack on the **local Docker daemon, which it reaches through the `/var/run/docker.sock`
unix socket**. Thus GitPaaS and the applications that it deploys use the same machine. Coolify and
Dokploy start from the same single-server model.

An earlier version divided the two parts: GitPaaS on one host controlled a *remote* Docker daemon
over TCP with mTLS. This division was removed. The daemon is now always local, the socket is
bind-mounted into the backend container in production, and there is no certificate material in the
topology. The mount of that socket gives the backend the equivalent of root access on the host,
and this is the security cost of the model (see
[infrastructure-architecture.md](./infrastructure-architecture.md)). Access to more than one
server is not in this roadmap. Such access would come back as a second executor adapter behind the
current `DockerExecutor` port.

These functions operate fully today:

- **Deploy engine.** A manual trigger finds the head commit of the branch, writes a `pending`
  deployment, and sends it to the queue. The executor extracts the repository archive, builds the
  images and pulls the other images, stops the previous stack, and starts the new stack.
- **Durable deployment queue.** The queue uses the database and is at-least-once. It has a limited
  number of new attempts, a dead-letter state after the attempt limit, and a recovery at restart
  (the work in progress goes into the queue again when the control plane restarts). The runs of one
  compose project occur one after the other, but different projects run at the same time.
- **Log streaming.** The deployment output goes live to the browser over Server-Sent Events from a
  store with two tiers: Redis holds the output of a run that is in progress, and PostgreSQL is the
  archive, which receives the full output one time, when the run ends. A subscriber reads the
  recorded output and then the live output on one cursor. Thus there is no merge and no
  deduplication, and the full history of a completed run is available for a replay. A line cap for
  each deployment limits the size of one log, and the archived rows stay until the deployment is
  deleted.
- **GitHub App source integration.** A GitHub App gives the list of the repositories and the
  branches, finds the commits, reads the file contents, and downloads the archives.
- **Operational tooling.** There are readiness probes for PostgreSQL and Docker, a function that
  removes unused images, volumes and containers, a cleanup of the orphan resources, and a read-only
  view of the containers and the networks.
- **Authentication.** JWT with Passport, refresh-token rotation, and argon2 password hashing.
- **Hexagonal architecture.** Each feature is divided into `domain` / `application` / `infrastructure`
  / `ui`. Thus you can add almost all the missing capabilities as new adapters or new features, and
  a rewrite is not necessary.

### Reusable building blocks

These available parts are the base of the roadmap. Each part has a production shape and is
made to be extended and not replaced:

| Building block | What it gives us |
|---|---|
| Durable retry/DLQ deployment queue | Reliable, restart-safe orchestration for any long-running deploy work |
| git → build → compose-up executor | Real deployment execution on the server's own Docker daemon |
| Live + persisted log streaming | Observability for every deployment, replayable after the fact |
| GitHub App integration | Source access: repos, branches, commits, archives |
| Container/network inspection + server pruning | Operational visibility and housekeeping |
| Hexagonal ports/adapters layout | New sources, proxies, and build strategies plug in additively |
| JWT auth with refresh rotation | The base to grow into multi-tenant authorization |

## Gaps

The capabilities that follow are the difference between the single-tenant engine of today and the
PaaS goal. They are in groups by priority.

### Critical

- **Reverse proxy, automatic TLS and domain routing for the deployed applications.** This is the
  most important PaaS function, and it is not available. No stack runs a proxy: nothing sends the
  traffic to the deployed services or gives the certificates, and the ports `80` and `443` of the
  server are free. This function needs a proxy adapter, a model for the domains and the routes, and
  automation for Let's Encrypt.

### High

- **Environment variables and secrets management.** There is no model, no UI and no injection path
  for the configuration or the secrets of a service. Real applications need this function.
- **Multi-tenant ownership and RBAC enforcement.** There is no ownership model: the projects,
  the services and the deployments have no owner, `triggeredBy` always has the value `'system'`, and
  no guard enforces the stored `role`.
- **Build-packs / auto-build.** Currently the repository must give a Dockerfile or a compose file.
  The automatic detection of the stack (as Nixpacks or buildpacks do) is an important convenience
  difference.

### Medium

- **Git webhooks and more sources.** The deployments are manual and use only the GitHub App. An
  automatic deployment after a push, plus more providers (GitLab, Bitbucket, a public git URL, or a
  deployment from an image), make the product available to more users.
- **Redeploy and rollback.** The deployment history is available, but there is no action to deploy a
  previous commit again or to go back after a failed rollout.
- **Log retention.** There is no age-based deletion: the archived rows of a deployment stay until
  the deployment is deleted, because the foreign key removes them in a cascade. Only
  `LOGS_MAX_LINES` limits the size of one log. Thus the table grows with the number of deployments,
  and a scheduled policy that removes old rows is still necessary.

## Phased roadmap

The phases are in the correct sequence, because each phase makes the next phase possible. Phase 1
makes GitPaaS installable. Phase 2 makes the deployed applications available. Phases 3 to 5 make
GitPaaS a full multi-user product.

### Phase 1 — Self-host foundation

**Goal:** one command changes a new server into a GitPaaS control plane that operates.

**Definition of done:** when you run the install script on a new server, you get a GitPaaS control
plane that you can reach. The installer makes the database with its SQL migrations (there is no
`synchronize`) and makes an admin account. No manual database setup is necessary, and no
configuration is necessary but the host's own Docker socket.

### Phase 2 — Public URLs for deployed apps

**Goal:** an application that GitPaaS deploys is available over HTTPS at a domain.

**Work items:**

- Add a **reverse proxy** (Traefik or Caddy) as a part of the runtime. The proxy publishes the ports
  `80` and `443` of the server and is in front of GitPaaS and of the applications that GitPaaS
  deploys.
- Add **automatic TLS** with Let's Encrypt (the proxy gets and renews the certificates).
- Add a **model for the domains and the routes**. Thus you can give a domain or a subdomain to a
  service, and the system can make the proxy routing configuration from it when it starts the stack.

**Definition of done:** a user gives a domain to a deployed service and reaches the service over
HTTPS at that domain, with a valid certificate that is renewed automatically.

### Phase 3 — Environment and secrets management

**Goal:** you can configure a service with environment variables and secrets, which are injected at the deployment.

**Work items:**

- Add a **model for the environment variables and the secrets of each service**, with encrypted
  secrets in the store.
- **Inject** the values into the compose stack when the executor starts the stack.
- Add a **UI** to control the environment variables and the secrets on the service detail screen.

**Definition of done:** the configured environment variables and secrets of a service are in its
containers at the next deployment. The secret values are stored with encryption and are never sent
in plain text to the client.

### Phase 4 — Multi-tenancy

**Goal:** more than one user can safely use one GitPaaS installation, and each user owns their own applications.

**Work items:**

- Add an **ownership model**: a user owns projects, and the ownership goes down to the services and
  the deployments. Each query must be limited to the owner.
- Replace the fixed value `triggeredBy: 'system'` with the **authenticated user** who started the
  deployment.
- **Enforce the `role` that is already stored** with a guard, and add a function to make users (and,
  as an option, a sign-up).

**Definition of done:** a user who is not an admin sees and controls only their own projects,
services and deployments. Each deployment shows the real user who started it. A guard enforces the
role restrictions, and the roles are not only stored.

### Phase 5 — Developer experience

**Goal:** a deployment is very easy: push to deploy, no Dockerfile is necessary, and the recovery is simple.

**Work items:**

- **Git webhooks** for an automatic deployment after a push (first with the available GitHub App
  source).
- **Build-packs** that find the stack of a project and build it without a Dockerfile.
- **Redeploy and rollback**: deploy a previous commit again and go back after a failed rollout, with
  the available deployment history.

**Definition of done:** a push to a connected branch starts a deployment automatically. A repository
without a Dockerfile can be deployed with a build-pack. A user can deploy a previous successful
deployment again or go back to it from the UI.
