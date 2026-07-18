# Deployment Roadmap — toward a self-hostable PaaS

This document tracks where Artifactory's deployment system stands today and the path to
turning it into a self-hostable Platform-as-a-Service (PaaS). It is a planning document,
not a specification of current behavior; for how the shipped system works, see
[backend-architecture.md](./backend-architecture.md), [backend-business.md](./backend-business.md),
and [frontend-architecture.md](./frontend-architecture.md).

## Vision

Artifactory aims to be a **self-hosted PaaS** in the spirit of Vercel, Dokploy, and Coolify:
a user installs it on their own VPS and deploys their applications through it. The product
promise is simple — point Artifactory at a git repository, and it builds, runs, and exposes
the app over HTTPS on a domain, all on infrastructure the user owns and controls. There is no
managed cloud in the middle: the control plane and the workloads it runs both live on the
user's own servers.

## Current state

Artifactory is already a **working single-tenant deploy engine**, not merely a data store with
a job queue. The control plane runs one deployment as a self-contained unit of work — "bring a
service's compose stack up on the VPS" — by cloning a GitHub repository at a resolved commit,
building the repo's `build:` services and pulling the rest, and running the resulting
`docker-compose` stack on a **remote Docker daemon reached over mTLS**. This control-plane →
remote-Docker-host split is the same runtime model Coolify and Dokploy use.

What works end to end today:

- **Deploy engine.** A manual trigger resolves the branch's head commit, persists a `pending`
  deployment, and hands it to the queue. The executor extracts the repository archive, builds
  and pulls images, tears down the previous stack, and brings the new one up.
- **Durable deployment queue.** The queue is DB-backed and at-least-once, with bounded retries,
  dead-lettering after the attempt limit, and restart recovery (in-flight work is re-queued when
  the control plane restarts). Runs are serialized per compose project while distinct projects
  run concurrently.
- **Log streaming.** Deployment output streams live to the browser over Server-Sent Events and is
  also persisted, so history is replayable after the run ends (Redis for the live buffer and
  pub/sub, PostgreSQL for durable history).
- **GitHub App source integration.** Listing repositories and branches, resolving commits, reading
  file contents, and downloading archives all go through a GitHub App.
- **Operational tooling.** Readiness probes for PostgreSQL, Redis, and Docker; image/volume/
  container pruning and orphan cleanup; read-only container and network inspection.
- **Authentication.** JWT with Passport, refresh-token rotation, and argon2 password hashing.
- **Hexagonal architecture.** Each feature is split into `domain` / `application` / `infrastructure`
  / `ui`, so most missing capabilities can be added as new adapters or new features rather than
  rewrites.

### Reusable building blocks

These existing pieces are the foundation the roadmap builds on. Each is production-shaped and
intended to be extended, not replaced:

| Building block | What it gives us |
|---|---|
| Durable retry/DLQ deployment queue | Reliable, restart-safe orchestration for any long-running deploy work |
| git → build → compose-up executor | Real deployment execution over remote Docker mTLS |
| Live + persisted log streaming | Observability for every deployment, replayable after the fact |
| GitHub App integration | Source access: repos, branches, commits, archives |
| Container/network inspection + server pruning | Operational visibility and housekeeping |
| Hexagonal ports/adapters layout | New sources, proxies, and build strategies plug in additively |
| JWT auth with refresh rotation | The base to grow into multi-tenant authorization |

## Gaps

The capabilities below are what separate today's single-tenant engine from the PaaS goal,
grouped by priority.

### Critical

- **Reverse proxy, automatic TLS, and domain routing for deployed apps.** This is the defining
  PaaS feature and it does not exist. The dev stack *reserves* the proxy ports (host `80`/`443`)
  but nothing routes traffic to deployed services or issues certificates. This needs a proxy
  adapter, a domain/route model, and Let's Encrypt automation.
- **A production deploy story for Artifactory itself.** There is no application Dockerfile, the
  production IaC directory is empty, and the schema is managed by TypeORM `synchronize` with no
  migrations. Without these, "install it on a VPS" is not yet possible.
- **A one-line installer.** Standing up the control plane today means manual, dev-oriented setup
  (generating mTLS certs, seeding an admin). A `curl | sh`-style installer is required for a
  self-host product.

### High

- **Environment variables and secrets management.** There is no model, UI, or injection path for
  per-service configuration or secrets. This is table stakes for running real apps.
- **Multi-tenant ownership and RBAC enforcement.** There is no ownership model: projects,
  services, and deployments have no owner, `triggeredBy` is hard-coded to `'system'`, and the
  persisted `role` is never enforced by a guard.
- **Build-packs / auto-build.** The repository must currently supply a Dockerfile or compose file.
  Auto-detecting the stack (Nixpacks/buildpacks-style) is a major convenience differentiator.

### Medium

- **Git webhooks and additional sources.** Deploys are manual and GitHub-App-only. Auto-deploy on
  push, plus more providers (GitLab/Bitbucket/public git URL/deploy-from-image), broaden reach.
- **Frontend configuration hardening.** The deployments repository uses a hard-coded
  `http://localhost:3000` API base instead of environment config, and the log stream uses the
  native `EventSource`, which cannot send the `Authorization` header the auth guard expects.
- **Redeploy and rollback.** Deployment history exists, but there is no action to redeploy a
  previous commit or roll back a failed rollout.

## Phased roadmap

The phases are ordered so each one unlocks the next. Phase 1 makes Artifactory installable;
Phase 2 makes the apps it deploys reachable; Phases 3–5 make it a real multi-user product.

### Phase 1 — Self-host foundation

**Goal:** a fresh VPS can be turned into a running Artifactory control plane with one command.

**Work items:**

- Add production **Dockerfile(s)** for the backend and frontend (multi-stage, production
  dependencies only). _DONE_
- Author a **production compose stack** under `iac/production/` (control plane + PostgreSQL +
  Redis + the remote Docker connection), parameterized by environment. _DONE_
- Introduce **real TypeORM migrations** and drop `synchronize` everywhere. Existing entities
  become the baseline migration; schema changes ship as versioned migrations from here on.
- Build a **one-line installer** that provisions Docker, generates the mTLS certificate material
  the control plane uses to reach the Docker host, brings up the stack, runs migrations, and
  seeds the first admin user. (Today only the dev compose SQL init seeds an admin; there is no
  installable path.)
- Fold in the two **frontend fixes** blocking any non-local install:
  - Replace the hard-coded `http://localhost:3000` API base with environment-driven configuration.
  - Replace the native `EventSource` log stream with a token-capable SSE client so the protected
    log endpoint works under the auth-by-default guard.

**Definition of done:** running the install script on a fresh VPS produces a reachable Artifactory
control plane, with the database created via migrations (no `synchronize`) and an admin account
seeded — no manual cert or database setup required.

### Phase 2 — Public URLs for deployed apps

**Goal:** an app deployed through Artifactory is reachable over HTTPS at a domain.

**Work items:**

- Introduce a **reverse proxy** (Traefik or Caddy) as part of the runtime, wired to the already-
  reserved host `80`/`443` ports.
- Add **automatic TLS** via Let's Encrypt (certificate issuance and renewal handled by the proxy).
- Add a **domain/route model** so a service can be assigned a domain or subdomain, and generate the
  proxy routing configuration from it as part of bringing the stack up.

**Definition of done:** a user assigns a domain to a deployed service and reaches it over HTTPS,
with a valid, auto-renewing certificate, at that domain.

### Phase 3 — Environment and secrets management

**Goal:** services can be configured with environment variables and secrets, injected at deploy time.

**Work items:**

- Add a **per-service env-var and secrets model**, with secrets encrypted at rest.
- **Inject** the resolved values into the compose stack when the executor brings it up.
- Add **UI** to manage env vars and secrets on the service detail surface.

**Definition of done:** a service's configured env vars and secrets are present in its running
containers on the next deployment, and secret values are stored encrypted and never returned in
plaintext to the client.

### Phase 4 — Multi-tenancy

**Goal:** multiple users can safely share one Artifactory instance, each owning their own apps.

**Work items:**

- Introduce an **ownership model**: users own projects, and ownership flows down to services and
  deployments. Scope every query by owner.
- Replace the hard-coded `triggeredBy: 'system'` with the **authenticated user** who triggered the
  deployment.
- **Enforce the already-persisted RBAC** `role` with a guard, and add user provisioning (and,
  optionally, sign-up).

**Definition of done:** a non-admin user sees and acts on only their own projects, services, and
deployments; deployments are attributed to the real user who triggered them; and role restrictions
are enforced by a guard rather than merely stored.

### Phase 5 — Developer experience

**Goal:** deploying feels effortless — push to deploy, no Dockerfile required, easy recovery.

**Work items:**

- **Git webhooks** for auto-deploy on push (starting with the existing GitHub App source).
- **Build-packs** that detect a project's stack and build it without a Dockerfile.
- **Redeploy and rollback**: redeploy a previous commit and roll back a failed rollout, reusing the
  existing deployment history.

**Definition of done:** pushing to a connected branch triggers a deployment automatically; a repo
without a Dockerfile can still be deployed via a build-pack; and a user can redeploy or roll back to
a previous successful deployment from the UI.

## Recommended starting point

Start with **Phase 1**, and within it the thin slice of **migrations + production compose +
installer**. Nothing else in the roadmap can be validated on real infrastructure until Artifactory
itself is installable on a VPS: Phase 2's proxy needs a running control plane to configure, and
Phases 3–5 all assume a durable, migration-managed schema rather than `synchronize`. Landing the
installable foundation first turns every later phase into an additive change on a system that can
actually be run in production.
