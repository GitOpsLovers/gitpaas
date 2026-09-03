# security-hardening

A repository that GitPaaS deploys reaches the host, because the transformer of the compose file passes every key to the daemon. The platform also holds weak checks of the configuration, a rate limit that counts every client as one, and secrets that reach a log. This feature closes those holes, and it removes the layer of the roles, because GitPaaS gives every user the same rights. A rootless daemon and a tenant of a user stay out of scope.

## Phase 1 — The gate of the compose file

**Agent:** implementer
**Paths:** `apps/backend/src/features/deployments/infrastructure/docker/`, `packages/contracts/src/services/`

- [ ] 1.1 Declare the list of the allowed keys of a service, and refuse an unknown key.
- [ ] 1.2 Refuse `privileged`, `cap_add`, `devices`, `security_opt` and `userns_mode`.
- [ ] 1.3 Refuse `network_mode`, `pid` and `ipc` when the value names the host.
- [ ] 1.4 Refuse a volume that binds a path of the host, and refuse the socket of Docker.
- [ ] 1.5 Constrain `composerPath` of the contract to a relative path without `..`.
- [ ] 1.6 Check `composerPath` again before the join of the path in the adapter of the executor.
- [ ] 1.7 Raise one error of the domain that names the key that failed.
- [ ] 1.8 Write the unit tests of the gate.

## Phase 2 — The removal of the roles

**Agent:** implementer
**Paths:** `apps/backend/src/`, `apps/frontend/src/`, `packages/contracts/src/`, `iac/production/migrations/`

- [ ] 2.1 Delete the guard and the decorator of the roles, and their use in the three controllers.
- [ ] 2.2 Remove the role from the payload of the token and from the use case that issues it.
- [ ] 2.3 Remove the role from the contract, from the models, from the DTO and from the transformers.
- [ ] 2.4 Remove the role from the entity of the user and from the enrichment of the telemetry.
- [ ] 2.5 Rename the seed of the administrator to the seed of the first user, without the role.
- [ ] 2.6 Write the migration `024_drop_user_role.sql`.
- [ ] 2.7 Remove the role from the frontend.
- [ ] 2.8 Repair the unit tests of the two applications.

## Phase 3 — The configuration and the identity

**Agent:** implementer
**Paths:** `apps/backend/src/core/infrastructure/`, `apps/backend/src/features/authentication/`, `apps/backend/src/bootstrap.ts`

- [ ] 3.1 Require a minimum length of 32 characters for the three secrets of the JWT.
- [ ] 3.2 Validate `SECRETS_ENCRYPTION_KEY` at the boot, as 32 bytes in hexadecimal.
- [ ] 3.3 Refuse the seed of the user, and refuse a local `DB_HOST`, when the environment is production.
- [ ] 3.4 Set `synchronize` to `false` in every environment.
- [ ] 3.5 Revoke the whole family of the refresh tokens when a revoked token returns.
- [ ] 3.6 Cap the live refresh tokens of one user, and prune the oldest one.
- [ ] 3.7 Give one error and a constant time for an unknown email, a wrong password and an inactive user.
- [ ] 3.8 Bind the sealed secret to its row with additional authenticated data.

## Phase 4 — The edge

**Agent:** implementer
**Paths:** `apps/backend/src/app.module.ts`, `apps/backend/src/features/authentication/`, `iac/production/`

- [ ] 4.1 Trust the proxy, and count the requests per real address of the client.
- [ ] 4.2 Give the challenge of the second factor its own budget of attempts.
- [ ] 4.3 Add a dedicated limit to `/auth/refresh` and to `/auth/logout`.
- [ ] 4.4 Publish the port of the backend on `127.0.0.1` alone.
- [ ] 4.5 Add the headers of the security and a policy of the content to `nginx.conf`.
- [ ] 4.6 Give a password to redis, and make `REDIS_PASSWORD` required.
- [ ] 4.7 Put postgres and redis on a network of their own.
- [ ] 4.8 Move the counters of the limit into redis.

## Phase 5 — The leak of the data

**Agent:** implementer
**Paths:** `apps/backend/src/features/deployments/`, `apps/backend/src/features/providers/`, `apps/frontend/src/app/`

- [ ] 5.1 Mask every value of a secret in the lines of the log of a deployment.
- [ ] 5.2 Inject the variables of the environment into the services that declare them alone.
- [ ] 5.3 Store and return a generic message when the executor fails, and log the detail apart.
- [ ] 5.4 Delete the pipe of the HTML and its two uses, and draw the icons with the library of the icons.
- [ ] 5.5 Invalidate the cache of the client of the provider when its credential changes.
- [ ] 5.6 Validate the parameter `state` of the two routes of the provider.
- [ ] 5.7 Hold the token of the access in the memory alone, and not in the storage of the web.

## Phase 6 — The supply chain and the installer

**Agent:** implementer
**Paths:** `.github/workflows/`, `scripts/install.sh`, `SECURITY.md`

- [ ] 6.1 Pin every `uses:` of the two workflows to a commit.
- [ ] 6.2 Add a workflow that scans the dependencies and the images.
- [ ] 6.3 Sign the published images, and document the command of the verification.
- [ ] 6.4 Write `SECURITY.md` with the private channel of a report.
- [ ] 6.5 Create the file `.env` with the mode 600 in the installer.
- [ ] 6.6 Stop the installer from writing the copy `.bak` that holds the secrets.
- [ ] 6.7 Record the sensitive actions in the telemetry that already exists.

## Phase 7 — The documents

**Agent:** documenter
**This is the last phase.**

- [ ] 7.1 Write the rule of the gate of the compose file into `docs/business/`.
- [ ] 7.2 Correct `docs/business/auth.md`, and remove every statement about a role.
- [ ] 7.3 Correct `docs/business/users.md` for the seed and for the removal of the role.
- [ ] 7.4 Correct the page of the conventions for `SECRETS_ENCRYPTION_KEY` and for `REDIS_PASSWORD`.
- [ ] 7.5 Document the limits of the frequency, the headers and the place of the token.
- [ ] 7.6 Delete this folder, and its line of `docs/roadmap.md`.
