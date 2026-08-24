# Installation

## One-line installer

One command changes a new server into a GitPaaS control plane that operates:

```sh
curl -fsSL https://raw.githubusercontent.com/GitOpsLovers/gitpaas/main/scripts/install.sh | sh
```

The installer (`scripts/install.sh`) is a POSIX `/bin/sh` script with no dependencies. It stops at the first error (`set -e`), it uses `sudo` if the user is not root, and you can run it again safely: it keeps an available `.env`, it does not apply a migration two times, and the admin seeding is idempotent. The host must have `curl`, `openssl` (for the generation of the secrets) and `tar`.

### Version selection

By default, the installer installs `latest`. It finds this version from the **latest release** tag on GitHub. If there is no release, it uses the newest tag. If there is no tag, or if the API is not available or has a rate limit, the installer **stops with an error** and tells the operator to run it again with a released version. There is no fallback to a branch. To select a specified version, use a flag or an environment variable:

```sh
# Flag form
curl -fsSL …/install.sh | sh -s -- --version v1.0.0

# Environment form
GITPAAS_VERSION=v1.0.0 sh -c "$(curl -fsSL …/install.sh)"
```

The source comes from the `codeload` tarball endpoint of GitHub, but `--version` accepts **only a released version tag** — `v1.2.3` or `1.2.3`. The `assert_version_tag` check applies this rule before the installer touches the host, and it refuses a branch name such as `main`. The reason is that the application images are published for each release: a branch would run release images against a source tree that is different from them.

### Options

Each option is a flag and has an equivalent environment variable:

| Flag | Environment variable | Default | Purpose |
|---|---|---|---|
| `--version <tag>` | `GITPAAS_VERSION` | `latest` | Released version tag to install (`v1.2.3` or `1.2.3`). A branch name is refused. |
| `--dir <path>` | `GITPAAS_DIR` | `/opt/gitpaas` | Install directory the source is unpacked into. |
| `--email <email>` | `GITPAAS_ADMIN_EMAIL` | *(prompted)* | First admin's email; skips the interactive prompt. |

### What the installer does

The script does seven steps in sequence:

1. **Make sure that Docker is available.** If Docker or the compose plugin is missing, the script installs the two parts with the official `get.docker.com` convenience script and enables the daemon.
2. **Find the version and get the source.** The script finds the version tag (see above) and downloads the tarball of the repository from `codeload.github.com` into `/tmp`. From that archive it extracts **only** `*/iac/production/*` into the install directory, and then it deletes the tarball. Thus the install directory holds the production stack alone: no `apps/`, no `scripts/`, and no root manifests. If there is an installation already (a directory that has `iac/production/docker-compose.yml`), the script uses it and does not download the source again.
3. **Write `.env`.** On a **fresh** install, the script copies `iac/production/.env.example` to `.env` and puts secure random secrets in it: one value for `POSTGRES_PASSWORD` and `DB_PASSWORD`, and 32-byte hex values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and `SECRETS_ENCRYPTION_KEY`. It sets `NODE_ENV=production` and points `CORS_ORIGIN` to the address of the host on port `8080`. It also writes `DOCKER_GID` and `IMAGE_TAG`. `DOCKER_GID` is the docker group id of the host, which the script finds with `getent group docker` or from the owning group of the socket; compose gives this value to the `group_add` of the backend, and then the non-root container can use the socket. If the script cannot find that GID, it stops with a clear message. `IMAGE_TAG` selects the published images to run (see [Conventions](./conventions.md#environment-contract)). The Redis keys are **not** written by the script on a fresh install: `REDIS_HOST` and `REDIS_PORT` come from `.env.example`. The stack holds no source control credential in the environment: the operator registers each GitHub App from the Providers screen after the first start.

   On a **pre-existing** `.env`, the script keeps the file and changes as little as possible: it refreshes `DOCKER_GID` and `IMAGE_TAG`, it adds `REDIS_HOST=redis` and `REDIS_PORT=6379` only if the keys are not there, and it adds `SECRETS_ENCRYPTION_KEY` with a fresh random value only if the key is not there. It never touches the secrets or the ports that are already set.
4. **Start only the database.** The script runs `docker compose … up -d postgres` and not a full `up -d`. Then it examines the health of the `gitpaas-postgres` container until the container is `healthy` (for a maximum of approximately 5 minutes). At this step, the backend and the frontend do not run.
5. **Apply the SQL migrations.** See [Schema bootstrap](./key-flows.md#schema-bootstrap).
6. **Make the first admin.** See [Interactive admin seeding](#interactive-admin-seeding).
7. **Get the images and start the application stack.** Only when the schema is current and the admin row is available, the script runs `docker compose … pull` to get the published images from `ghcr.io/gitopslovers` at the tag in `IMAGE_TAG`. If the pull fails, the script stops and names that tag. Then it runs `docker compose … up -d`. Nothing is built on the server. This starts the backend and then the frontend, and the script examines the health of the `gitpaas-backend` container until the container is `healthy` (for a maximum of approximately 5 minutes).

At the end, the script shows a summary with the frontend URL and the API URL, the admin credentials, and the manual steps that stay.

### Interactive admin seeding

When the schema is available — and **before the first start of an application container** — the installer makes the **first** administrator directly in the database. If `--email` or `GITPAAS_ADMIN_EMAIL` did not give an email, the script asks for an email on the controlling terminal (`/dev/tty`, because stdin is the piped script). Then it does these steps:

1. **It makes a hash of a random alphanumeric password** in a temporary `alpine` container that runs the `argon2` CLI. The parameters are the same as the defaults of node-argon2. Thus the argon2id verifier of the backend accepts the encoded string without a change:

   ```sh
   docker run --rm -e GITPAAS_PW=… -e GITPAAS_SALT=… alpine:3.22 \
     sh -c 'apk add --no-cache argon2 >/dev/null 2>&1 || exit 1; printf %s "$GITPAAS_PW" | argon2 "$GITPAAS_SALT" -id -t 3 -m 16 -p 4 -l 32 -e'
   ```

   The password and a random 16-byte hex salt go as environment variables and never as arguments. Thus they do not show in `ps`. The installer stops if the result does not start with `$argon2id$v=19$m=65536,t=3,p=4$`.
2. **It adds the row** with `INSERT INTO "users" … VALUES (:'email', :'hash', 'admin', true) ON CONFLICT ("email") DO NOTHING`. The email and the hash go as psql variables (`-v`). Thus psql, and not the shell, puts the quotes, and no value can get out of the statement. `ON CONFLICT` lets you run the installation again: an admin that is already there does not change, and the script does not change its password.

The full bootstrap speaks only to Postgres. Thus the backend image is not necessary, and the application never starts against a database without an admin. The generated password is shown one time in the final summary. It is never stored in a readable form, and the operator must copy it immediately.

### Manual follow-ups

The installer starts a control plane that operates, but the source integration still needs input from the operator. The summary tells the operator to open the Providers screen of the frontend and register a GitHub App there: its name, its application id, its installation id and its private key (PEM). The backend stores that key encrypted with `SECRETS_ENCRYPTION_KEY`, and no manual edit of `.env` or restart of the stack is necessary for this step. Every service that the operator wants to deploy must then point at a registered provider, in the tab "Provider" of its detail page.

The summary also warns the operator to back up `SECRETS_ENCRYPTION_KEY`: a lost key makes every stored secret unreadable, a provider's private key as well as a secret variable of a service (see the capability [service-environment](../../business/service-environment.md)); the only recovery for a provider is to register the GitHub Apps again, and for a service variable is to set it again.

### Upgrade from a version with `GITHUB_APP_*` variables

A version before this change kept one GitHub App for the whole installation, in the three environment variables `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and `GITHUB_APP_INSTALLATION_ID`. An installation that upgrades from that version, and that already holds services, must register a provider **before** it applies the migration `iac/production/migrations/011_services_provider.sql`. That migration adds the column `providerId` to the table `services` and, when the installation holds exactly one provider, it fills the column from that provider. An installation with no provider yet, or with more than one, leaves the column empty, and every affected service stops being deployable until the operator opens it and sets its provider by hand.

To avoid that manual step, run the helper script `scripts/import-github-app-provider.sh` before the upgrade. The script reads the three `GITHUB_APP_*` variables of the existing `.env` file and creates a provider named `default` through the API, so the migration finds exactly one provider and fills `providerId` for every existing service. The header of the script also documents the manual alternative: register the provider from the Providers screen, then open and save each service again.

> **Known limitation.** The production frontend image contains `apiBaseUrl: http://localhost:3000/api/v1` from the build. Thus, if you open the UI from a machine that is **not** the server, the UI currently calls the incorrect API host. A future build argument for the frontend will make the API base configurable at the installation.
