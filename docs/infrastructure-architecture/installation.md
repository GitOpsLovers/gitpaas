# Installation

## One-line installer

One command changes a new server into a GitPaaS control plane that operates:

```sh
curl -fsSL https://raw.githubusercontent.com/GitOpsLovers/gitpaas/main/scripts/install.sh | sh
```

The installer (`scripts/install.sh`) is a POSIX `/bin/sh` script with no dependencies. It stops at the first error (`set -e`), it uses `sudo` if the user is not root, and you can run it again safely: it keeps an available `.env`, it does not apply a migration two times, and the admin seeding is idempotent. The host must have `curl`, `openssl` (for the generation of the secrets) and `tar`.

### Version selection

By default, the installer installs `latest`. It finds this version from the **latest release** tag on GitHub. If there is no release, it uses the newest tag. If there is no tag or the API has a rate limit, it uses `main`. To select a specified ref, use a flag or an environment variable:

```sh
# Flag form
curl -fsSL …/install.sh | sh -s -- --version v1.0.0

# Environment form
GITPAAS_VERSION=v1.0.0 sh -c "$(curl -fsSL …/install.sh)"
```

The source comes from the `codeload` tarball endpoint of GitHub. Thus `--version` accepts a tag name **or** a branch name.

### Options

Each option is a flag and has an equivalent environment variable:

| Flag | Environment variable | Default | Purpose |
|---|---|---|---|
| `--version <ref>` | `GITPAAS_VERSION` | `latest` | Tag or branch to install. |
| `--dir <path>` | `GITPAAS_DIR` | `/opt/gitpaas` | Install directory the source is unpacked into. |
| `--email <email>` | `GITPAAS_ADMIN_EMAIL` | *(prompted)* | First admin's email; skips the interactive prompt. |

### What the installer does

The script does seven steps in sequence:

1. **Make sure that Docker is available.** If Docker or the compose plugin is missing, the script installs the two parts with the official `get.docker.com` convenience script and enables the daemon.
2. **Find the version and get the source.** The script finds the ref (see above) and downloads the tarball of the repository from `codeload.github.com` into the install directory. If there is an installation already (a directory that has `iac/production/docker-compose.yml`), the script uses it and does not download the source again.
3. **Write `.env`.** The script copies `iac/production/.env.example` to `.env` and puts secure random secrets in it: one value for `POSTGRES_PASSWORD` and `DB_PASSWORD`, and 32-byte hex values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. It sets `NODE_ENV=production` and points `CORS_ORIGIN` to the address of the host on port `8080`. It also finds the docker group id of the host (with `getent group docker`, or from the owning group of the socket) and writes it as `DOCKER_GID`. Compose gives this value to the `group_add` of the backend, and then the non-root container can use the socket. If the script cannot find that GID, it stops with a clear message. The GitHub App credentials stay as placeholders.
4. **Start only the database.** The script runs `docker compose … up -d postgres` and not a full `up -d`. Then it examines the health of the `gitpaas-postgres` container until the container is `healthy` (for a maximum of approximately 5 minutes). At this step, the backend and the frontend do not run.
5. **Apply the SQL migrations.** See [Schema bootstrap](./key-flows.md#schema-bootstrap).
6. **Make the first admin.** See [Interactive admin seeding](#interactive-admin-seeding).
7. **Start the application stack.** Only when the schema is current and the admin row is available, the script runs `docker compose … up -d --build`. This starts the backend and then the frontend, and the script examines the health of the `gitpaas-backend` container until the container is `healthy` (for a maximum of approximately 5 minutes).

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

The installer starts a control plane that operates, but the source integration still needs input from the operator. The summary tells the operator to do this in `iac/production/.env`:

- Put in the GitHub App credentials: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` (a base64-encoded PEM) and `GITHUB_APP_INSTALLATION_ID`.

After the change of `.env`, apply the change with `docker compose -f <dir>/iac/production/docker-compose.yml up -d`.

> **Known limitation.** The production frontend image contains `apiBaseUrl: http://localhost:3000/api/v1` from the build. Thus, if you open the UI from a machine that is **not** the server, the UI currently calls the incorrect API host. A future build argument for the frontend will make the API base configurable at the installation.
