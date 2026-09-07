# security-hardening

A repository that GitPaaS deploys reaches the host, because the transformer of the compose file passes every key to the daemon. A recipe also attaches a stack to a network that the platform owns, so a container of a user reaches the database of GitPaaS. The platform holds weak checks of the configuration, a rate limit that counts every client as one, and secrets that reach a log. This feature closes those holes, and it removes the layer of the roles, because GitPaaS gives every user the same rights. The endpoints of `/docker`, the session of the database debug and the routes of the prune keep the behavior of today, by the decision of the user. A rootless daemon and a tenant of a user stay out of scope.

## Phase 1 — The gate of the compose file

**Agent:** implementer
**Paths:** `apps/backend/src/features/deployments/infrastructure/docker/`, `apps/backend/src/features/services/application/`, `packages/contracts/src/services/`
**The gate runs after `interpolateRecipe`, because the interpolation rewrites the keys as well as the values.**

- [x] 1.1 Declare the list of the allowed keys of a service, and refuse an unknown key.
- [x] 1.2 Refuse `privileged`, `cap_add`, `devices`, `security_opt`, `userns_mode`, and `network_mode`, `pid` and `ipc` when the value names the host.
- [x] 1.3 Refuse a volume that binds a path of the host, and refuse the socket of Docker.
- [x] 1.4 Constrain `composerPath` of the contract to a relative path without `..`.
- [x] 1.5 Check `composerPath` again at the three sites that join it, in the adapter of the executor and in the use case of the final compose.
- [x] 1.6 Raise one error of the domain that names the key that failed.
- [x] 1.7 Write the unit tests of the gate, with a case of a key of the interpolation.

## Phase 2 — The removal of the roles

**Agent:** implementer
**Paths:** `apps/backend/src/`, `apps/frontend/src/`, `packages/contracts/src/`, `iac/production/migrations/`

- [x] 2.1 Delete the guard and the decorator of the roles, and their use on the sixteen routes of the three controllers.
- [x] 2.2 Remove the role from the payload of the token and from the use case that issues it.
- [x] 2.3 Remove the role from the contract, the models, the DTO, the transformers, the entity of the user and the enrichment of the telemetry.
- [x] 2.4 Rename the seed of the administrator to the seed of the first user, without the role.
- [x] 2.5 Write the migration `029_drop_user_role.sql`.
- [x] 2.6 Remove the role from the frontend.
- [x] 2.7 Repair the unit tests of the two applications.

## Phase 3 — The configuration and the identity

**Agent:** implementer
**Paths:** `apps/backend/src/core/infrastructure/`, `apps/backend/src/features/authentication/`, `apps/backend/src/bootstrap.ts`

- [ ] 3.1 Require 32 characters for the three secrets of the JWT, and validate `SECRETS_ENCRYPTION_KEY` at the boot as 32 bytes in hexadecimal.
- [ ] 3.2 Refuse the seed of the user, and refuse a local `DB_HOST`, when the environment is production.
- [ ] 3.3 Set `synchronize` to `false` in every environment.
- [ ] 3.4 Revoke the whole family of the refresh tokens when a revoked token returns, cap the live tokens of one user, and prune the oldest one.
- [ ] 3.5 Give one error and a constant time for an unknown email, a wrong password and an inactive user.
- [ ] 3.6 Bind the sealed secret to its row with additional authenticated data.

## Phase 4 — The edge

**Agent:** implementer
**Paths:** `apps/backend/src/app.module.ts`, `apps/backend/src/features/authentication/`, `iac/production/`

- [ ] 4.1 Trust the proxy, and count the requests per real address of the client.
- [ ] 4.2 Add a dedicated limit to `/auth/refresh` and to `/auth/logout`.
- [ ] 4.3 Publish the port of the backend on `127.0.0.1` alone, and add the headers of the security and a policy of the content to `nginx.conf`.
- [ ] 4.4 Give a password to redis, make `REDIS_PASSWORD` required, and put postgres and redis on a network of their own.
- [ ] 4.5 Move the counters of the limit into redis.

## Phase 5 — The leak of the data

**Agent:** implementer
**Paths:** `apps/backend/src/features/deployments/`, `apps/backend/src/features/providers/`, `apps/frontend/src/app/`

- [ ] 5.1 Mask every value of a secret in the lines of the log of a deployment.
- [ ] 5.2 Inject the variables of the environment into the services that declare them alone.
- [ ] 5.3 Store and return a generic message when the executor fails, and log the detail apart.
- [ ] 5.4 Delete the pipe of the HTML and its one use, draw the icons with the library of the icons, and make the viewer of the YAML safe.
- [ ] 5.5 Invalidate the cache of the client of the provider when its credential changes, and validate the parameter `state` of its two routes.
- [ ] 5.6 Hold the token of the access in the memory alone, and not in the storage of the web.

## Phase 6 — The supply chain and the installer

**Agent:** implementer
**Paths:** `.github/workflows/`, `scripts/install.sh`, `scripts/update.sh`, `SECURITY.md`

- [ ] 6.1 Pin every `uses:` of the three workflows to a commit.
- [ ] 6.2 Add a workflow that scans the dependencies and the images.
- [ ] 6.3 Sign the published images, and document the command that verifies one.
- [ ] 6.4 Write `SECURITY.md` with the private channel of a report.
- [ ] 6.5 Create the file `.env` with the mode 600 in the installer.
- [ ] 6.6 Delete the copy `.bak` of the two scripts on every path, and not on the success alone.
- [ ] 6.7 Record the sensitive actions in the telemetry that already exists.

## Phase 7 — The networks and the volumes of a recipe

**Agent:** implementer
**Paths:** `apps/backend/src/features/deployments/`, `apps/backend/src/features/services/`, `apps/backend/src/features/volumes/`

- [ ] 7.1 Declare the names of the networks that GitPaaS owns, in one place.
- [ ] 7.2 Refuse an external network of a recipe when its name is one of those, and raise the error of the domain of the phase 1.
- [ ] 7.3 Check that the mask of the environment of the final compose covers every variable of a secret.
- [ ] 7.4 Validate the path of a mount of the feature of the volumes against a traversal.
- [ ] 7.5 Write the unit tests of the three checks.

## Phase 8 — The documents

**Agent:** documenter
**This is the last phase.**

- [ ] 8.1 Write the rule of the gate of the compose file, and the rule of the networks owned, into `docs/business/`.
- [ ] 8.2 Correct `docs/business/auth.md` and `docs/business/users.md` for the seed and for the removal of the role.
- [ ] 8.3 Correct the page of the conventions for `SECRETS_ENCRYPTION_KEY` and for `REDIS_PASSWORD`, and document the limits of the frequency, the headers and the place of the token.
- [ ] 8.4 Delete this folder, and its line of `docs/roadmap.md`.
