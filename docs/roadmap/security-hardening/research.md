# Research — the security of the platform

This file holds the result of an audit of the code of the three areas, and of the workflow of the project.
The audit read the code. It ran no attack against a live server, so each attack below is a path that the
code allows, and not an exploit that somebody proved on a machine.

## The method

The audit followed the data from the outside to the daemon of the containers:

1. The edge: `iac/production/nginx.conf`, `iac/production/docker-compose.yml`, `scripts/install.sh`.
2. The authentication and the authorization: `apps/backend/src/features/authentication/`.
3. The controllers of each feature, and the pipes that validate their input.
4. The executor of the deployments, which is the one path from a user to the daemon.
5. The store of the secrets, of the tokens and of the logs.
6. The pipeline of the pull request and of the release.

## The model of the threat

| The actor | What it holds | What it wants |
|---|---|---|
| **The anonymous client** | The address of the server | A session, or the fall of the service |
| **The authenticated user** (role `user`) | One valid account | The server, the secrets of another project, the source of a private repository |
| **The author of a repository** | A repository that a service deploys | Code that runs on the host |
| **The local user of the host** | A shell with no privilege | The secrets of the platform |
| **The author of a dependency** | A package or an action of the pipeline | The image that the release publishes |

The asset of the highest value is the socket `/var/run/docker.sock`. `iac/production/docker-compose.yml:44`
mounts it into the container of the backend. Access to it equals root on the host, because a container
starts with the root filesystem of the host mounted inside it. Each finding below is measured against that
asset.

---

## The findings of a critical severity

### C1 — A compose file of a repository asks for any privilege of the host

`apps/backend/src/features/deployments/infrastructure/docker/docker-executor.adapter.ts:52` extracts the
archive of the repository and runs the compose file that it carries. The transformer
`compose-recipe.transformer.ts` reads the file to normalize the healthchecks, to stamp the labels and to
inject the environment. It refuses no key.

A compose file therefore declares `privileged: true`, `volumes: ["/:/host"]`, `network_mode: host`,
`pid: host`, `cap_add: [SYS_ADMIN]`, `devices:` and the mount of the socket of the daemon itself.

**The attack.** An authenticated user creates a service that points at a repository that they control. The
repository holds this file:

```yaml
services:
  x:
    image: alpine
    privileged: true
    pid: host
    volumes: ["/:/host"]
    command: sh -c "echo KEY >> /host/root/.ssh/authorized_keys; sleep infinity"
```

They trigger the deployment. The stack starts, and the attacker holds a key of root on the host. The whole
platform, every secret of the environment and every other stack fall with it.

**The severity is critical.** One valid account of the lowest role reaches root on the machine.

### C2 — Each authenticated user reaches each record

`RolesGuard` exists (`features/authentication/ui/guards/roles.guard.ts`), but only
`providers.controller.ts:52` applies it. No other controller declares a role, and no record carries an
owner: a search for `ownerId` or `userId` outside the feature of the authentication returns nothing.

So a user of the role `user` reads, changes and deletes every namespace, every project, every service and
every variable of every other user. They trigger a deployment of a service that belongs to somebody else.
They also reach `POST /server/prune/*` and `POST /server/containers/orphaned`
(`features/server/ui/controllers/server.controller.ts:75 and :108`), which force-remove the containers of the
platform, and `PUT /server/settings`, which changes the parameters of the deployment system.

**The attack.** An account that an operator made for a colleague reads the list of the services, calls
`POST /server/containers/orphaned`, and every stack of the platform stops. The same account changes the
repository of a service of another project to a repository of its own, and then runs C1.

**The severity is critical**, because the role `user` is documented as narrower than `admin`
(`docs/business/users.md:11`) and it is not.

---

## The findings of a high severity

### H1 — The path of the compose file escapes the directory of the extraction

`composerPath` is `z.string()` with no constraint (`packages/contracts/src/services/service.contract.ts:13`),
and the executor writes `join(directory, composePath)`. A value such as `../../../../etc/x.yml` leaves the
temporary directory. `resolveBuild` then resolves the context of the build against the directory of that
file, so the context becomes a directory of the filesystem of the container of the backend. That directory
is packed into a tarball and sent to the daemon, and a `Dockerfile` of the repository copies it into an
image that the attacker then reads.

**The attack.** The attacker points `composerPath` at a path outside the archive, gives a build context of
`/`, and reads the filesystem of the container of the backend out of the log of the build.

### H2 — The secrets of a service reach the archive of the logs, which every user reads

`runDeploymentUseCase` decrypts every secret of the service and hands it to the executor
(`run-deployment.use-case.ts:88`). `injectEnvironment` writes those values into **every** service of the
stack, and not only into the service that needs them. The executor then captures the first 100 lines of the
output of each container (`docker-executor.adapter.ts:275`) and appends them to the archive of the logs.

`GET /logs?deploymentId=…` (`features/logs/ui/controllers/logs.controller.ts:29`) carries no check of the
owner, because of C2. So one container that prints its environment at the start publishes the secrets of the
service to every authenticated user of the platform, and the platform stores them.

### H3 — The rate limit counts the address of the proxy

The application never enables `trust proxy`, and `nginx.conf:21` proxies every call. `ThrottlerGuard`
therefore reads the address of the container of nginx for every client, and the whole platform shares one
counter. The login carries `@Throttle({ default: { limit: 5, ttl: 60_000 } })`.

**The attack.** One anonymous client sends five failed logins per minute, for ever. Nobody else logs in. A
denial of the service costs the attacker five requests per minute. The store of the counter is also the
store in memory of the process, so a restart clears it and a second instance does not share it.

### H4 — The file `.env` of the production is readable by the world

`scripts/install.sh:294` copies `.env.example` into `.env` and writes the secrets into it. No `chmod` and no
`umask` follows. With the usual mask of a server the file lands at the mode `644`. It holds
`DB_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and `SECRETS_ENCRYPTION_KEY`.

**The attack.** Any local account on the host reads `/opt/gitpaas/iac/production/.env`. With
`JWT_ACCESS_SECRET` it signs an access token of the administrator, because the strategy trusts the
signature and reads `sub` alone (`jwt.strategy.ts:47`). With `SECRETS_ENCRYPTION_KEY` it opens every secret
of every service. The same script also passes each secret in the argument of `sed`, where `ps` shows it.

### H5 — The environment accepts a secret of one character

`env-validation.config.ts` types `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and `SECRETS_ENCRYPTION_KEY` as
`z.string().min(1)`. The installer generates 32 random bytes, but an operator who edits `.env` by hand, or
who copies an example, boots with a secret that a laptop breaks offline. A forged access token follows, and
`SECRETS_ENCRYPTION_KEY` fails late, at the first decryption, and not at the boot.

### H6 — A user reaches every repository of the installation of the GitHub App

`repositoryId` of a service is a free string, and nothing checks that the repository belongs to the project
or that the user may read it. `getRepositoryArchive` resolves it through `GET /repositories/{id}` with the
credentials of the provider (`github-provider-client.adapter.ts:89`).

**The attack.** The attacker sets the `repositoryId` of a service of their own to the identifier of a private
repository of the organisation, and triggers a deployment. The archive of that repository is extracted and
built on the host, and its content reaches the log of the build.

### H7 — The stack ships no TLS, and it publishes the backend on every interface

`nginx.conf` listens on 8080 in clear, and `docker-compose.yml:42` publishes `${BACKEND_PORT:-3000}` on
every interface of the host. `.env.example` carries `http://` for `CORS_ORIGIN` and for `APP_BASE_URL`.
`helmet()` sets `Strict-Transport-Security`, and a client that never speaks TLS never honours it.

So the access token and the refresh token of every operator travel in clear over the network. The refresh
token lives seven days (`JWT_REFRESH_EXPIRES_IN=7d`). One capture on the path gives a week of access.

---

## The findings of a medium severity

| # | The finding | Where |
|---|---|---|
| M1 | The rotation of the refresh token detects no reuse. A stolen token that the attacker rotates first keeps working, and the theft raises nothing. No family of tokens is revoked, no limit caps the live tokens of a user, and a change of the password revokes none. | `application/refresh.use-case.ts:41` |
| M2 | The login tells the accounts apart. An unknown email answers `INVALID_CREDENTIALS` without a hash, and a known but inactive email answers a different message. The absent call to argon2 also shows in the time of the answer. | `application/validate-user.use-case.ts:29` |
| M3 | Redis starts with no password, and Postgres with no TLS. Every service shares one network of the compose file, and a stack that a user deploys joins that network with one declaration of an external network. | `iac/production/docker-compose.yml:22` |
| M4 | The SPA carries no header of the security. `helmet()` protects the answers of the API alone, and `nginx.conf` adds no `Content-Security-Policy`, no `X-Frame-Options`, no `X-Content-Type-Options` and no `Referrer-Policy`. The dashboard is framed. | `iac/production/nginx.conf` |
| M5 | The tokens live in `localStorage` or in `sessionStorage`, so one XSS carries a session of seven days away. | `features/authentication/infrastructure/storage/token-storage.service.ts` |
| M6 | `bypassSecurityTrustHtml` feeds an `[innerHTML]` of a button. Every caller passes a literal today, so the hole is latent, and one binding of a name of a record opens it. | `shared/pipes/safe-html.pipe.ts:13` |
| M7 | The message of a failed deployment is stored and given back. It carries the message of Docker and of the API of GitHub, which name internal paths and identifiers. | `application/run-deployment.use-case.ts:100` |
| M8 | The cache of the clients of Octokit is never cleared. A provider whose credentials rotate, or which an administrator deletes, keeps working from the cache until the process restarts. | `github-provider-client.adapter.ts:177` |
| M9 | The sealed secret carries no associated data. The ciphertext is not bound to the row, so whoever writes the database moves a ciphertext of a variable of another service into a variable of their own, and reads it in a deployment. | `core/infrastructure/crypto/secret-cipher.adapter.ts:95` |
| M10 | `synchronize` is on outside the production. A boot with `NODE_ENV=development` against the database of the production rewrites the schema. The same variable seeds the administrator of the development, with the email `admin@gitpaas.dev` and the password `gitpaas`. | `core/infrastructure/database/data-source-options.ts:25`, `features/users/ui/services/users.service.ts:16` |
| M11 | `RolesGuard` is not global, and a route with no `@Roles` is open to each authenticated user. A new controller is therefore open by default, and the failure is silent. | `features/authentication/ui/guards/roles.guard.ts:27` |
| M12 | The `state` of a registration of a provider is a parameter of the path with no check of the format and no limit of the rate. It is a short-lived secret that a client guesses. | `providers.controller.ts:128` |

---

## The findings of the workflow of the project

| # | The finding | Where |
|---|---|---|
| W1 | Each action is pinned to a moving tag of a major version, and not to a commit. A tag that moves runs code of another author in a job that pushes an image and writes to the repository. | `.github/workflows/*.yml` |
| W2 | The installer runs through `curl \| sh`, and it checks no checksum and no signature, neither of the archive of the release nor of the script of `get.docker.com`. | `scripts/install.sh:198` |
| W3 | The images carry a provenance and an SBOM, and no signature. The installer pulls the tag `latest`, which moves. Nothing on the host proves the origin of the image that it runs. | `.github/workflows/release.yml:144` |
| W4 | No workflow scans anything: no audit of the dependencies, no analysis of the code, no scan of the images and no search of the secrets in the history. | `.github/workflows/` |
| W5 | The job of the release holds `contents: write`, `packages: write`, `issues: write` and `pull-requests: write` together, and the dispatch carries no environment that a person approves. | `.github/workflows/release.yml:17` |
| W6 | The repository holds no `SECURITY.md`, so a finder has no address to report to. | The root |
| W7 | The platform keeps no audit trail. The telemetry names the actor, and no record answers the question of who deployed, who pruned, and who read a secret. | `core/infrastructure/telemetry/` |

---

## What the audit found to be correct

The audit states these on purpose, so that a later change does not undo them.

- The hash of the password is argon2id with the parameters by default of the library.
- The seal of a secret is AES-256-GCM, with a fresh vector for each call, and the key is never cached.
- The refresh token is stored as a digest, and never in clear.
- The filter of the exceptions answers a generic message for every failure of the server, so no stack
  reaches a client.
- Every identifier of a path passes `ParseUUIDPipe`, and every body passes a schema of Zod. The audit found
  no path of an injection of SQL: every repository uses the query builder of TypeORM with parameters.
- The session carries no cookie, so the surface of a CSRF is empty.
- The stream of the SSE carries the token in the header, and never in the address.
- The image of the runtime drops the privilege to the user `node`, and nginx runs unprivileged.
- `allowBuilds` of `pnpm-workspace.yaml` names the packages that may run a script of an install, so a new
  dependency runs none.
- The pipeline of the pull request holds `contents: read` alone.
