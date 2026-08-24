# Plan — the hardening of the security

The feature is stated in [TODO.md](./TODO.md). The findings are in [research.md](./research.md). This file
holds the decisions, the rules that the change adds, and the phases with their tasks.

## The context

The backend drives the daemon of the containers of the host through a socket that the compose file mounts.
The one path from a user to that daemon is the executor of the deployments, which runs the compose file that
a repository carries. Nothing between the two refuses a privilege.

The platform also carries two roles, `admin` and `user`, and it applies them on the providers alone. Every
other record is open to every authenticated user.

## The goals

**Goals:**

- A compose file of a repository asks for no privilege of the host, and the refusal names the key.
- A record belongs to a user, and an operation that changes the server belongs to an administrator.
- A secret of a service never reaches an archive of the logs, and never a file that the world reads.
- The pipeline proves what it runs and what it publishes.

**Non-Goals:**

- A platform for several customers. The ownership separates the users of one installation.
- A daemon without root, and a runtime other than Docker.
- A store of the secrets outside the database.
- A certificate that the platform issues; the feature [domains](../domains/TODO.md) owns it.

## The decisions

**1. The policy of the compose file is a list of what is allowed, and not a list of what is refused.**

A list of refused keys ages badly, because each version of the specification of compose adds a key. The
transformer therefore reads a fixed set of keys of a service, and it refuses the file that carries another
one. The message names the service and the key.

The keys that the platform allows are: `image`, `build`, `command`, `entrypoint`, `environment`, `env_file`,
`depends_on`, `healthcheck`, `restart`, `labels`, `expose`, `ports`, `networks`, `volumes` of a named volume
alone, `working_dir`, `user`, `deploy.resources` and `stop_grace_period`.

**Alternative that the change does not take:** a list of refused keys (`privileged`, `pid`, `cap_add`, …).
It is shorter to write, and one new key of compose opens the door again.

**2. A bind mount of the host is refused, and a named volume is allowed.**

A service declares a volume of the short form or of the long form. The transformer accepts the name of a
volume that the file declares at its top level. It refuses every path of the host, absolute or relative, and
it refuses `/var/run/docker.sock` by name so that the message is clear.

**3. The owner is a column of the record, and not a table of the permissions.**

Each namespace carries the identifier of the user who made it. A project, a service, a variable, a
deployment and a log belong to the namespace of their parent. So one join answers the question of the
access, and the model grows into a table of the permissions later if a team needs one.

An administrator reaches every record. A user reaches the record of a namespace that they own.

**Alternative that the change does not take:** an owner on every table. It repeats the column five times,
and it lets a project and its service disagree about who owns them.

**4. `RolesGuard` becomes global, and a route declares the role that it needs.**

The guard runs after the guard of the JWT, for every route. A route with no `@Roles` stays open to each
authenticated user, as today, and the new guard of the ownership narrows it. The operations of the server
declare `@Roles(UserRole.Admin)`.

**5. The archive of the logs hides the value of a secret.**

The executor holds the values that it injected. Before it appends a line, it replaces each value of a secret
of four characters or more with `***`. The platform cannot stop a container that encodes its environment, and
`TODO.md` of the release states that limit.

**6. The path of the compose file is validated, and the extraction stays inside its directory.**

`composerPath` becomes a relative path of a repository: no leading slash, no segment `..`, and it ends with
`.yml` or `.yaml`. The executor also resolves the joined path and refuses it if it leaves the temporary
directory, so a change of the schema alone cannot open the hole again.

**7. The installer writes the secrets with the mode 600, and it stops passing them in an argument.**

The script sets the mask before it writes, it changes the mode of `.env` after it writes it, and `set_env`
uses a here-document instead of the argument of `sed`.

**8. The pinning of an action is by the commit, and the image carries a signature.**

Each `uses:` names a commit, with the tag in a comment beside it. Dependabot keeps them fresh. The release
signs each image with cosign, without a key, and the installer verifies the signature before it starts the
stack.

## The rules that the change adds

These rules go into `docs/business/` when the last phase merges.

1. The system SHALL refuse a compose file that declares a key outside the allowed set, and the answer SHALL
   name the service and the key.
2. The system SHALL refuse a volume that names a path of the host.
3. The system SHALL refuse a path of a compose file that leaves the directory of the repository.
4. A user SHALL reach a record of a namespace that they own. An administrator SHALL reach every record.
5. An operation that prunes the server, that removes an orphan, or that changes the settings of the
   platform SHALL need the role `admin`.
6. The system SHALL replace the value of a secret with `***` in a line of a log that it stores.
7. The system SHALL refuse to boot when a secret of the environment holds fewer than 32 bytes.
8. The system SHALL revoke every refresh token of a user when it receives a refresh token that it already
   rotated.
9. The login SHALL answer the same message and take a comparable time for an unknown email, a wrong
   password, and an inactive account.
10. A deployment SHALL refuse a repository that the project of the service does not name.

## The risks

- **The policy of the compose file breaks a stack that works today.** A repository that mounts a path of the
  host deploys now, and it stops deploying. The phase 1 therefore ships the message that names the key, and
  the release notes state the change.
- **The ownership hides a record from the operator who made it.** The migration gives every record that
  exists to the first administrator, so nothing disappears at the update.
- **The mask of the secrets misses a value.** A short value, or a value that a container encodes, still
  reaches the log. The rule states the limit instead of promising more.

## The phases

### Phase 1 — The road to the host

The findings C1 and H1. This phase alone stops one account from taking the machine.

- [ ] Add `assertAllowedKeys` to `compose-recipe.transformer.ts`, with the set of the allowed keys of a
      service, and an error of the domain that names the service and the key.
- [ ] Add `assertSafeVolumes`: a named volume of the file alone, and a refusal of every path of the host.
- [ ] Refuse a top-level `network` that is external, and refuse `network_mode` on a service.
- [ ] Call both checks in `DockerExecutorAdapter.up`, before the build and before the pull.
- [ ] Constrain `composerPath` in `service.contract.ts`: relative, no `..`, ends with `.yml` or `.yaml`.
- [ ] Resolve the joined path in the executor, and refuse it when it leaves the temporary directory.
- [ ] Write the specs of the transformer: one allowed file, one file per refused key, one traversal.
- [ ] Show the message of the refusal in the log of the deployment of the frontend.

### Phase 2 — The model of the authorization

The finding C2, and M11.

- [ ] Write the migration `014_namespace_owner.sql`: the column `owner_id`, the foreign key, the index, and
      the assignment of every row that exists to the first administrator.
- [ ] Carry `ownerId` through the model, the transformer and the repository of the namespaces.
- [ ] Add a guard of the ownership that reads the namespace of the record of the route, and let an
      administrator through.
- [ ] Register `RolesGuard` as a global guard in `authentication.module.ts`, after the guard of the JWT.
- [ ] Declare `@Roles(UserRole.Admin)` on each route of `server.controller.ts` that changes the server.
- [ ] Filter the list of the namespaces, of the projects and of the services by the owner.
- [ ] Check the owner of the deployment in the controller of the logs and in the stream of the SSE.
- [ ] Write the specs of the guard, and one spec per controller that the change narrows.

### Phase 3 — The secrets and the identity

The findings H4, H5, M1, M2, M9, M10.

- [ ] Raise the minimum of `JWT_ACCESS_SECRET`, of `JWT_REFRESH_SECRET` and of `SECRETS_ENCRYPTION_KEY` to
      32 bytes in `env-validation.config.ts`, and check the hexadecimal form of the key at the boot.
- [ ] Refuse the boot when `NODE_ENV` is not `production` and `DB_HOST` is not a local address.
- [ ] Remove the seed of the administrator of the development from `bootstrap.ts`, and give the installer
      the one path that creates the first administrator.
- [ ] Detect the reuse of a refresh token: revoke every live token of the user, and record the event.
- [ ] Cap the live refresh tokens of a user, and revoke them all when the password changes.
- [ ] Make the login answer one message, and run a hash of a dummy when the email is unknown.
- [ ] Bind the identifier of the row into the associated data of the cipher, and keep the old payload
      readable for one release.
- [ ] Set `umask 077` in `install.sh`, change the mode of `.env` to 600, and replace the `sed` of `set_env`.

### Phase 4 — The edge

The findings H3, H7, M3, M4, M5.

- [ ] Enable `trust proxy` for one hop in `bootstrap.ts`, and key the throttler on the client.
- [ ] Move the store of the throttler to Redis, so the limit survives a restart and a second instance.
- [ ] Bind the published port of the backend to `127.0.0.1` in the compose file of the production.
- [ ] Add the headers of the security to `nginx.conf`: `Content-Security-Policy`, `X-Frame-Options`,
      `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.
- [ ] Give redis a password in the compose file of the production, and require it in the schema.
- [ ] Put the data stores on a network of the backend alone, separate from the network of the frontend.
- [ ] Document the reverse proxy with the TLS in the guide of the installation, and state the risk of the
      plain HTTP.
- [ ] Move the access token to memory, and keep the refresh token alone in the store of the browser.

### Phase 5 — The disclosure of the data

The findings H2, H6, M6, M7, M8, M12.

- [ ] Mask the value of every secret of the service in each line that the executor emits.
- [ ] Inject a variable into the service that declares it, and not into every service of the stack.
- [ ] Bind the repository of a deployment to the repository of the service, and refuse another.
- [ ] Store a generic message for a failed deployment, and keep the detail in the log of the server alone.
- [ ] Replace the pipe `safe-html` with the per-icon components of `@lucide/angular`, and delete the pipe.
- [ ] Clear the cache of the clients of Octokit when a provider changes or goes away.
- [ ] Validate the `state` of a registration as a UUID, and give the route its own limit of the rate.

### Phase 6 — The workflow of the project

The findings W1 to W7.

- [ ] Pin each `uses:` of the three workflows to a commit, with the tag in a comment.
- [ ] Add a workflow of the scan: the audit of the dependencies, the analysis of the code and the scan of
      the image of each pull request.
- [ ] Sign each published image with cosign, without a key, and publish the digest in the release.
- [ ] Verify the digest and the signature of the images in `install.sh`, and check the archive of the
      release against its checksum.
- [ ] Split the job of the release, so the job that publishes holds `packages: write` alone, and put the
      dispatch behind an environment that a person approves.
- [ ] Write `SECURITY.md` with the versions that are supported and the address of a report.
- [ ] Record an audit trail of every operation that deploys, that prunes, or that reads a secret.

### Phase 7 — The documentation

- [ ] Write the ten rules into the pages of `docs/business/` that own them.
- [ ] State in the guide of the installation that a repository that a user deploys runs on the host, and
      that the platform trusts the author of that repository.
- [ ] Delete this folder of the roadmap.
