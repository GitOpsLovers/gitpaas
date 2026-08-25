# The hardening of the security

GitPaaS drives the Docker daemon of the host, so whoever reaches the platform reaches the machine. Today a compose file of a repository asks for any privilege it wants, every authenticated user reaches every record, and the installer writes the secrets into a file that each local user reads. We add three lines of defence — the deployment, the authorization and the secrets — and we make the pipeline prove what it ships. Out of scope: a multi-tenant platform, a rootless daemon, an external store of the secrets, and the certificate that the feature [domains](../domains/TODO.md) owns.

## Phase 1 — The road to the host

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/, apps/backend/src/features/services/

- [ ] 1.1 Add `assertAllowedKeys` to `compose-recipe.transformer.ts`: a fixed set of allowed keys of a service, and an error that names the service and the key.
- [ ] 1.2 Add `assertSafeVolumes`: a named volume of the file alone, and a refusal of every path of the host.
- [ ] 1.3 Refuse every top-level network that is external, and refuse `network_mode` on a service. A service reaches the reverse proxy by the direct connect of the deployment, and never by a network that its own recipe declares external.
- [ ] 1.4 Call both checks in `DockerExecutorAdapter.up`, before the build and before the pull.
- [ ] 1.5 Constrain `composerPath` in `service.contract.ts`: relative, no `..`, ends with `.yml` or `.yaml`.
- [ ] 1.6 Resolve the joined path in the executor, and refuse it when it leaves the temporary directory.
- [ ] 1.7 Write the specs of the transformer: one allowed file, one file per refused key, one traversal.
- [ ] 1.8 Show the message of the refusal in the log of the deployment of the frontend.

## Phase 2 — The model of the authorization

**Agent:** implementer
**Paths:** apps/backend/src/features/namespaces/, apps/backend/src/features/authentication/, apps/backend/src/features/server/, apps/backend/migrations/

- [ ] 2.1 Write the migration `014_namespace_owner.sql`: the column `owner_id`, the key, the index, and every row that exists to the first administrator.
- [ ] 2.2 Carry `ownerId` through the model, the transformer and the repository of the namespaces.
- [ ] 2.3 Add a guard of the ownership that reads the namespace of the record of the route, and let an administrator through.
- [ ] 2.4 Register `RolesGuard` as a global guard, after the guard of the JWT.
- [ ] 2.5 Declare `@Roles(UserRole.Admin)` on each route of `server.controller.ts` that changes the server.
- [ ] 2.6 Filter the list of the namespaces, of the projects and of the services by the owner.
- [ ] 2.7 Check the owner of the deployment in the controller of the logs and in the stream of the SSE.
- [ ] 2.8 Write the specs of the guard, and one spec per controller that the change narrows.

## Phase 3 — The secrets and the identity

**Agent:** implementer
**Paths:** apps/backend/src/features/authentication/, apps/backend/src/config/, scripts/install.sh

- [ ] 3.1 Raise the minimum of the three secrets of the environment to 32 bytes, and check the hexadecimal form at the boot.
- [ ] 3.2 Refuse the boot when `NODE_ENV` is not `production` and `DB_HOST` is not a local address.
- [ ] 3.3 Remove the seed of the administrator of the development, and give the installer the one path that creates the first administrator.
- [ ] 3.4 Detect the reuse of a refresh token: revoke every live token of the user, and record the event.
- [ ] 3.5 Cap the live refresh tokens of a user, and revoke them all when the password changes.
- [ ] 3.6 Make the login answer one message, and run a hash of a dummy when the email is unknown.
- [ ] 3.7 Bind the identifier of the row into the associated data of the cipher, and read the old payload for one release.
- [ ] 3.8 Set `umask 077` in `install.sh`, change the mode of `.env` to 600, and replace the `sed` of `set_env`.

## Phase 4 — The edge

**Agent:** implementer
**Paths:** apps/backend/src/, iac/production/, apps/frontend/src/app/core/

- [ ] 4.1 Enable `trust proxy` for one hop, and key the throttler on the client.
- [ ] 4.2 Move the store of the throttler to Redis, so the limit survives a restart and a second instance.
- [ ] 4.3 Bind the published port of the backend to `127.0.0.1` in the compose file of the production.
- [ ] 4.4 Add the headers of the security to `nginx.conf`, and give redis a password that the schema requires.
- [ ] 4.5 Put the data stores on a network of the backend alone, separate from the network of the frontend.
- [ ] 4.6 Move the access token to memory, and keep the refresh token alone in the store of the browser.

## Phase 5 — The disclosure of the data

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/, apps/backend/src/features/service-environment/, apps/frontend/src/app/

- [ ] 5.1 Mask the value of every secret of the service in each line that the executor emits.
- [ ] 5.2 Inject a variable into the service that declares it, and not into every service of the stack.
- [ ] 5.3 Bind the repository of a deployment to the repository of the service, and refuse another.
- [ ] 5.4 Store a generic message for a failed deployment, and keep the detail in the log of the server alone.
- [ ] 5.5 Replace the pipe `safe-html` with the per-icon components of `@lucide/angular`, and delete the pipe.
- [ ] 5.6 Clear the cache of the clients of Octokit when a provider changes or goes away.
- [ ] 5.7 Validate the `state` of a registration as a UUID, and give the route its own limit of the rate.

## Phase 6 — The workflow of the project

**Agent:** implementer
**Paths:** .github/, scripts/install.sh, SECURITY.md

- [ ] 6.1 Pin each `uses:` of the three workflows to a commit, with the tag in a comment.
- [ ] 6.2 Add a workflow of the scan: the audit of the dependencies, the analysis of the code and the scan of the image.
- [ ] 6.3 Sign each published image with cosign, without a key, and publish the digest in the release.
- [ ] 6.4 Verify the digest and the signature in `install.sh`, and check the archive of the release against its checksum.
- [ ] 6.5 Split the job of the release, and put the dispatch behind an environment that a person approves.
- [ ] 6.6 Write `SECURITY.md` with the versions that are supported and the address of a report.
- [ ] 6.7 Record an audit trail of every operation that deploys, that prunes, or that reads a secret.

## Phase 7 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 7.1 Write the rules of the three lines of defence into the pages of `docs/business/` that own them.
- [ ] 7.2 State in the guide of the installation that a repository that a user deploys runs on the host.
- [ ] 7.3 Delete this folder of the roadmap.
