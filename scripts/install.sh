#!/bin/sh
#
# GitPaaS one-line installer.
#
# Turns a fresh server into a running GitPaaS control plane with a single command:
#
#   curl -fsSL https://raw.githubusercontent.com/GitOpsLovers/gitpaas/main/scripts/install.sh | sh
#
# What it does, in order:
#   1. Ensures Docker + the compose plugin are installed (provisions them if not).
#   2. Resolves the version to install (the latest published release by default, or
#      the release tag you pass) and fetches iac/production/ at that version.
#   3. Writes iac/production/.env with secure random secrets (DB password, JWT
#      secrets and the SECRETS_ENCRYPTION_KEY that protects every stored secret), the
#      host's docker group id (DOCKER_GID, so the non-root backend container can
#      use the mounted Docker socket) and the image tag to pull. The operator
#      registers their GitHub App later, from the Providers screen of the frontend.
#   4. Starts ONLY the data store (postgres) and waits for it to become healthy.
#   5. Applies the SQL migrations in iac/production/migrations/ (in filename
#      order) straight into Postgres, tracking what ran in a `schema_migrations`
#      ledger table, so the schema is complete before anything else runs.
#   6. Bootstraps the FIRST admin straight into Postgres, with no application
#      container involved: prompts for your email, generates a random password,
#      hashes it as argon2id in a throwaway container, inserts the row, and
#      prints the password for you to copy.
#   7. Only then pulls and brings up the application stack — the reverse proxy,
#      the backend and the frontend — and waits for the backend to become healthy.

set -e

# ---------------------------------------------------------------------------
# Constants + defaults
# ---------------------------------------------------------------------------
REPO_OWNER="GitOpsLovers"
REPO_NAME="gitpaas"
REPO_SLUG="${REPO_OWNER}/${REPO_NAME}"

GITPAAS_VERSION="${GITPAAS_VERSION:-latest}"

# Installation directory.
GITPAAS_DIR="/opt/gitpaas"

# Every value below is asked on the terminal, by configure_control_plane() and by bootstrap_admin().
GITPAAS_ADMIN_EMAIL=""
GITPAAS_DOMAIN=""
GITPAAS_LETSENCRYPT_EMAIL=""
GITPAAS_LETSENCRYPT_STAGING="false"

ARGON2_IMAGE="alpine:3.22"

# Services of Let's Encrypt the operator switches between.
LETSENCRYPT_CA_PRODUCTION="https://acme-v02.api.letsencrypt.org/directory"
LETSENCRYPT_CA_STAGING="https://acme-staging-v02.api.letsencrypt.org/directory"

# Ports the reverse proxy needs for itself on this server.
PROXY_PORTS="80 443"

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
    C_BOLD="$(printf '\033[1m')"; C_GREEN="$(printf '\033[32m')"
    C_YELLOW="$(printf '\033[33m')"; C_RED="$(printf '\033[31m')"; C_RESET="$(printf '\033[0m')"
else
    C_BOLD=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_RESET=""
fi

log()  { printf '%s==>%s %s\n' "$C_GREEN$C_BOLD" "$C_RESET" "$*"; }
err()  { printf '%s[error]%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
die()  { err "$*"; exit 1; }

# ---------------------------------------------------------------------------
# Asking the operator
# ---------------------------------------------------------------------------
ask() {
    { : < /dev/tty; } 2>/dev/null \
        || die "This installer asks for the domain of the control plane and for the email of the first admin, so it needs a terminal. Run it from an interactive shell."

    if [ -n "$2" ]; then
        printf '%s%s%s %s: ' "$C_BOLD" "$1" "$C_RESET" "$2" > /dev/tty
    else
        printf '%s%s:%s ' "$C_BOLD" "$1" "$C_RESET" > /dev/tty
    fi
    read -r ANSWER < /dev/tty
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

# Only a released version is installable. The application images are published
# per release, so installing any other ref (a branch such as "main") would run
# release images against a source tree that does not match them.
assert_version_tag() {
    case "$1" in
        v[0-9]*.[0-9]*|[0-9]*.[0-9]*) : ;;
        *) die "'$1' is not a released GitPaaS version. Pass a published release tag, e.g. --version v1.2.3, or omit --version to install the latest release." ;;
    esac
}

# A flag written as "--flag value" needs a second argument. Fail with a clear
# message instead of letting "shift 2" abort the script on its own.
require_value() {
    [ "$1" -ge 2 ] || die "$2 needs a value, e.g. $2 $3 (try --help)."
}

while [ $# -gt 0 ]; do
    case "$1" in
        --version)     require_value $# --version v1.2.3; GITPAAS_VERSION="$2"; shift 2 ;;
        --version=*)   GITPAAS_VERSION="${1#*=}"; shift ;;
        -h|--help)
            awk 'NR == 1 { next } /^#/ { print; next } { exit }' "$0" 2>/dev/null || true
            exit 0 ;;
        *) die "Unknown argument: $1. The installer takes --version alone (try --help)." ;;
    esac
done

# Reject a non-release version straight away, before anything on this host is
# touched (no Docker install, no download, no directory created).
[ "$GITPAAS_VERSION" = "latest" ] || assert_version_tag "$GITPAAS_VERSION"

# ---------------------------------------------------------------------------
# Privilege + prerequisite detection
# ---------------------------------------------------------------------------
# Most steps (installing Docker, writing under /opt, talking to the Docker
# daemon) need root. Use sudo transparently when we are not already root.
if [ "$(id -u)" -eq 0 ]; then
    SUDO=""
else
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    else
        die "This installer needs root privileges (to install Docker and write under $GITPAAS_DIR), but neither root nor sudo is available."
    fi
fi

need() { command -v "$1" >/dev/null 2>&1 || die "Required command '$1' is not available."; }

need curl
need openssl
need tar

# Docker CLI wrapper (root or sudo as needed).
docker_cmd() { $SUDO docker "$@"; }

# ---------------------------------------------------------------------------
# Reverse proxy ports
# ---------------------------------------------------------------------------
port_listener() {
    port="$1"

    if command -v ss >/dev/null 2>&1; then
        line="$($SUDO ss -ltnp 2>/dev/null | awk -v p=":${port}\$" 'NR > 1 && $4 ~ p { print; exit }')"
        [ -z "$line" ] || { printf '%s\n' "$line"; return 0; }
    fi
    if command -v netstat >/dev/null 2>&1; then
        line="$($SUDO netstat -ltnp 2>/dev/null | awk -v p=":${port}\$" '$1 ~ /^tcp/ && $4 ~ p { print; exit }')"
        [ -z "$line" ] || { printf '%s\n' "$line"; return 0; }
    fi
    if command -v lsof >/dev/null 2>&1; then
        line="$($SUDO lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR == 2 { print; exit }')"
        [ -z "$line" ] || { printf '%s\n' "$line"; return 0; }
    fi
    return 0
}

# A port held by the proxy of GitPaaS itself is no conflict: it means the
# installer is running again on a server that already carries this stack.
port_held_by_proxy() {
    docker_cmd ps --filter 'name=gitpaas-proxy' --filter 'status=running' \
        --format '{{.Names}}' 2>/dev/null | grep -q .
}

assert_proxy_ports_free() {
    if ! command -v ss >/dev/null 2>&1 \
        && ! command -v netstat >/dev/null 2>&1 \
        && ! command -v lsof >/dev/null 2>&1; then
        log "Cannot check the ports 80 and 443 (no ss, netstat or lsof on this host) — continuing."
        return
    fi

    ports_all_free=1
    for port in $PROXY_PORTS; do
        listener="$(port_listener "$port" || true)"
        [ -n "$listener" ] || continue

        if port_held_by_proxy; then
            log "Port $port is held by the GitPaaS proxy of an earlier install — continuing."
            ports_all_free=0
            continue
        fi

        die "Port $port is already in use, and the GitPaaS reverse proxy needs both 80 and 443 of this server.
  Holding it: $listener
  Stop that process (a web server such as nginx, apache or caddy is the usual holder) and run the installer again."
    done

    [ "$ports_all_free" -eq 1 ] && log "Ports 80 and 443 are free."
    return 0
}

# ---------------------------------------------------------------------------
# Step 1 — Ensure Docker and compose plugin
# ---------------------------------------------------------------------------
ensure_docker() {
    if command -v docker >/dev/null 2>&1 && docker_cmd compose version >/dev/null 2>&1; then
        log "Docker and the compose plugin are already installed."
        return
    fi

    log "Docker (or the compose plugin) is missing — installing via get.docker.com ..."

    curl -fsSL https://get.docker.com -o /tmp/gitpaas-get-docker.sh
    $SUDO sh /tmp/gitpaas-get-docker.sh
    rm -f /tmp/gitpaas-get-docker.sh

    command -v docker >/dev/null 2>&1 || die "Docker installation failed."
    docker_cmd compose version >/dev/null 2>&1 || die "The Docker compose plugin is still missing after install."
    $SUDO systemctl enable --now docker >/dev/null 2>&1 || true

    log "Docker installed."
}

# ---------------------------------------------------------------------------
# Step 2 — Resolve version and fetch source
# ---------------------------------------------------------------------------
resolve_version() {
    # An explicit version was already validated right after argument parsing.
    if [ "$GITPAAS_VERSION" != "latest" ]; then
        RESOLVED_REF="$GITPAAS_VERSION"
        log "Installing requested version: $RESOLVED_REF"
        return
    fi

    log "Resolving the latest release ..."

    # Prefer the published "latest release"; fall back to the newest tag.
    RESOLVED_REF="$(curl -fsSL "https://api.github.com/repos/${REPO_SLUG}/releases/latest" 2>/dev/null \
        | grep -m1 '"tag_name"' | cut -d'"' -f4 || true)"
    if [ -z "$RESOLVED_REF" ]; then
        RESOLVED_REF="$(curl -fsSL "https://api.github.com/repos/${REPO_SLUG}/tags" 2>/dev/null \
            | grep -m1 '"name"' | cut -d'"' -f4 || true)"
    fi
    [ -n "$RESOLVED_REF" ] \
        || die "Could not resolve the latest GitPaaS release (no release or tag found, or the GitHub API is unreachable/rate-limited). Re-run naming a released version explicitly, e.g. --version v1.2.3."
    assert_version_tag "$RESOLVED_REF"
    log "Latest version resolves to: $RESOLVED_REF"
}

fetch_source() {
    # If the target dir already holds the production stack, assume a previous run
    # and reuse it. Delete the dir to force a clean re-fetch.
    if [ -f "$GITPAAS_DIR/iac/production/docker-compose.yml" ]; then
        log "Existing install found at $GITPAAS_DIR — reusing its source (delete the dir to re-fetch)."
        return
    fi

    log "Fetching the GitPaaS production stack ($RESOLVED_REF) into $GITPAAS_DIR ..."
    $SUDO mkdir -p "$GITPAAS_DIR"

    # Download the source tarball for the resolved release tag.
    tarball="/tmp/gitpaas-src.tar.gz"
    curl -fsSL "https://codeload.github.com/${REPO_SLUG}/tar.gz/${RESOLVED_REF}" -o "$tarball" \
        || die "Could not download the GitPaaS production stack for version '$RESOLVED_REF'. Is it a published release tag?"
    
    # Untar only the iac/production/ subdir into the install directory
    tar_wildcards=""
    tar --version 2>/dev/null | grep -qi 'gnu tar' && tar_wildcards="--wildcards"
    $SUDO tar -xzf "$tarball" -C "$GITPAAS_DIR" --strip-components=1 $tar_wildcards '*/iac/production/*' \
        || die "Could not extract iac/production/ from the downloaded archive for '$RESOLVED_REF'."
    rm -f "$tarball"

    [ -f "$GITPAAS_DIR/iac/production/docker-compose.yml" ] \
        || die "Fetched archive is missing iac/production/docker-compose.yml."
    log "Production stack fetched."
}

# ---------------------------------------------------------------------------
# Step 3 — Generate .env
# ---------------------------------------------------------------------------
# Generate a random 32-byte hex string.
rand_secret() { openssl rand -hex 32; }

# Generate a random password of 28 alphanumeric characters.
rand_password() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-28; }

# Writes key=value into .env. It rewrites the existing line, or appends the key
# when .env does not carry it yet, so a value is never lost without notice.
set_env() {
    key="$1"; val="$2"
    if $SUDO grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
        $SUDO sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" && $SUDO rm -f "$ENV_FILE.bak"
    else
        printf '%s=%s\n' "$key" "$val" | $SUDO tee -a "$ENV_FILE" >/dev/null
    fi
}

# Kept as the explicit name for "write this value, whatever .env holds today".
upsert_env() { set_env "$1" "$2"; }

# Appends the key with a default ONLY when .env does not carry it yet.
default_env() {
    if ! $SUDO grep -q "^$1=" "$ENV_FILE" 2>/dev/null; then
        printf '%s=%s\n' "$1" "$2" | $SUDO tee -a "$ENV_FILE" >/dev/null
    fi
}

# Detect the group id of the group that owns /var/run/docker.sock, so the
# non-root backend container can join it and use the host's Docker daemon.
detect_docker_gid() {
    DOCKER_GID="$(getent group docker 2>/dev/null | cut -d: -f3 || true)"

    if [ -z "$DOCKER_GID" ]; then
        DOCKER_GID="$(stat -c '%g' /var/run/docker.sock 2>/dev/null || true)"
    fi
    if [ -z "$DOCKER_GID" ]; then
        DOCKER_GID="$(stat -f '%g' /var/run/docker.sock 2>/dev/null || true)"
    fi

    case "$DOCKER_GID" in
        ''|*[!0-9]*)
            die "Could not resolve the GID of the group owning /var/run/docker.sock. Make sure Docker is installed and running, then re-run the installer — or set DOCKER_GID by hand in $GITPAAS_DIR/iac/production/.env." ;;
    esac

    log "Host Docker socket group id: $DOCKER_GID."
}

# Map the resolved version tag to the tag of the PUBLISHED container images.
image_tag_for_ref() {
    ref="$1"
    case "$ref" in
        v[0-9]*) echo "${ref#v}" ;;
        *)       echo "$ref" ;;
    esac
}

# A domain, and not a URL, a path or something with a space in it. The record of
# DNS is NOT checked: the operator may point it after the install, and the
# published port keeps GitPaaS reachable meanwhile.
assert_domain() {
    case "$1" in
        *://*|*/*|*:*|*' '*) die "'$1' is not a domain. Give the bare host, e.g. gitpaas.example.com — no scheme, no port and no path." ;;
    esac
    printf '%s' "$1" | grep -Eq '^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$' \
        || die "'$1' is not a valid domain, e.g. gitpaas.example.com."
}

# Ask for the address of Let's Encrypt nd for the domain of the control plane.
configure_control_plane() {
    ask "Let's Encrypt email" "(every domain with HTTPS uses this address, and Let's Encrypt notifies it about an expiring certificate)"
    GITPAAS_LETSENCRYPT_EMAIL="$ANSWER"
    [ -n "$GITPAAS_LETSENCRYPT_EMAIL" ] \
        || die "Let's Encrypt needs an address. Run the installer again and answer that question."

    ask "Domain of the control plane" "(leave empty to reach GitPaaS at http://${HOST_ADDR}:8080)"
    GITPAAS_DOMAIN="$ANSWER"

    if [ -z "$GITPAAS_DOMAIN" ]; then
        log "No domain of the control plane — GitPaaS stays on http://${HOST_ADDR}:8080."
        return
    fi

    assert_domain "$GITPAAS_DOMAIN"

    # The staging service issues an untrusted certificate, so it is the answer of
    # a trial run alone: the default is the production service.
    ask "Use the STAGING service of Let's Encrypt" "(an untrusted certificate, but no rate limit) [y/N]"
    case "$ANSWER" in
        [Yy]|[Yy][Ee][Ss]) GITPAAS_LETSENCRYPT_STAGING="true" ;;
        *)                 GITPAAS_LETSENCRYPT_STAGING="false" ;;
    esac

    if [ "$GITPAAS_LETSENCRYPT_STAGING" = "true" ]; then
        log "Control plane: https://${GITPAAS_DOMAIN} (Let's Encrypt STAGING — the certificate will not be trusted by a browser)."
    else
        log "Control plane: https://${GITPAAS_DOMAIN}."
    fi
}

# Write the settings of the proxy into .env.
write_control_plane_env() {
    if [ "$GITPAAS_LETSENCRYPT_STAGING" = "true" ]; then
        ca_server="$LETSENCRYPT_CA_STAGING"
    else
        ca_server="$LETSENCRYPT_CA_PRODUCTION"
    fi

    if [ -z "$GITPAAS_DOMAIN" ]; then
        default_env "CONTROL_PLANE_DOMAIN" ""
        default_env "CONTROL_PLANE_PROXY" "false"
        upsert_env "LETSENCRYPT_EMAIL" "$GITPAAS_LETSENCRYPT_EMAIL"
        default_env "LETSENCRYPT_CA_SERVER" "$ca_server"
        return
    fi

    upsert_env "CONTROL_PLANE_DOMAIN"  "$GITPAAS_DOMAIN"
    upsert_env "CONTROL_PLANE_PROXY"   "true"
    upsert_env "LETSENCRYPT_EMAIL"     "$GITPAAS_LETSENCRYPT_EMAIL"
    upsert_env "LETSENCRYPT_CA_SERVER" "$ca_server"

    # The application must know itself by the domain, or the browser refuses the
    # call of the API and every link it builds points at the old port.
    upsert_env "CORS_ORIGIN"  "https://${GITPAAS_DOMAIN}"
    upsert_env "APP_BASE_URL" "https://${GITPAAS_DOMAIN}"
}

generate_env() {
    PROD_DIR="$GITPAAS_DIR/iac/production"
    ENV_FILE="$PROD_DIR/.env"

    detect_docker_gid

    # Determine the tag of the published images to pull.
    IMAGE_TAG="$(image_tag_for_ref "$RESOLVED_REF")"
    log "Application images will be pulled at tag: $IMAGE_TAG."

    if [ -f "$ENV_FILE" ]; then
        log "$ENV_FILE already exists — keeping it (edit it by hand to change secrets)."
        upsert_env "DOCKER_GID" "$DOCKER_GID"
        upsert_env "IMAGE_TAG"  "$IMAGE_TAG"
        default_env "REDIS_HOST" "redis"
        default_env "REDIS_PORT" "6379"
        default_env "SECRETS_ENCRYPTION_KEY" "$(rand_secret)"
        default_env "APP_BASE_URL" "http://${HOST_ADDR}:8080"
        default_env "PROXY_ACME_PATH" "/acme/acme.json"
        write_control_plane_env
        return
    fi

    log "Writing $ENV_FILE from .env.example..."
    $SUDO cp "$PROD_DIR/.env.example" "$ENV_FILE"

    db_password="$(rand_password)"
    set_env "POSTGRES_PASSWORD" "$db_password"
    set_env "DB_PASSWORD" "$db_password"
    set_env "JWT_ACCESS_SECRET"  "$(rand_secret)"
    set_env "JWT_REFRESH_SECRET" "$(rand_secret)"
    set_env "SECRETS_ENCRYPTION_KEY" "$(rand_secret)"
    set_env "NODE_ENV" "production"
    set_env "CORS_ORIGIN" "http://${HOST_ADDR}:8080"
    set_env "APP_BASE_URL" "http://${HOST_ADDR}:8080"
    upsert_env "DOCKER_GID" "$DOCKER_GID"
    upsert_env "IMAGE_TAG" "$IMAGE_TAG"
    write_control_plane_env

    log ".env written."
}

# ---------------------------------------------------------------------------
# Step 4 — Start the data stores
# ---------------------------------------------------------------------------
# The compose plugin is a separate binary, so we wrap it in a function that
compose() { docker_cmd compose -f "$GITPAAS_DIR/iac/production/docker-compose.yml" "$@"; }

# Read a single value out of the generated .env.
env_value() { $SUDO grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- ; }

start_data_stores() {
    log "Starting the data store (postgres) ..."

    compose up -d postgres

    log "Waiting for Postgres to become healthy ..."
    
    i=0
    while [ "$i" -lt 60 ]; do
        status="$(docker_cmd inspect --format '{{.State.Health.Status}}' gitpaas-postgres 2>/dev/null || echo starting)"
        case "$status" in
            healthy) log "Postgres is healthy."; return ;;
            unhealthy) die "Postgres became unhealthy. Inspect logs with: $SUDO docker compose -f $GITPAAS_DIR/iac/production/docker-compose.yml logs postgres" ;;
        esac
        i=$((i + 1))
        sleep 5
    done

    die "Timed out waiting for Postgres to become healthy. Inspect: $SUDO docker compose -f $GITPAAS_DIR/iac/production/docker-compose.yml logs postgres"
}

# ---------------------------------------------------------------------------
# Step 5 — Apply the SQL migrations
# ---------------------------------------------------------------------------

# Read the Postgres credentials out of the generated .env.
load_db_credentials() {
    POSTGRES_USER="$(env_value POSTGRES_USER)"
    POSTGRES_PASSWORD="$(env_value POSTGRES_PASSWORD)"
    POSTGRES_DB="$(env_value POSTGRES_DB)"
    [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_DB" ] \
        || die "POSTGRES_USER / POSTGRES_DB are missing from $ENV_FILE."
}

# Run SQL inside the postgres container.
psql_run() {
    compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

run_migrations() {
    load_db_credentials

    migrations_dir="$GITPAAS_DIR/iac/production/migrations"
    [ -d "$migrations_dir" ] || die "Migrations directory not found: $migrations_dir"

    log "Applying database migrations ..."
    psql_run >/dev/null <<'SQL' || die "Could not create the schema_migrations ledger table."
CREATE TABLE IF NOT EXISTS "schema_migrations" ("filename" text PRIMARY KEY, "applied_at" timestamptz NOT NULL DEFAULT now());
SQL

    applied_any=0
    for migration_file in "$migrations_dir"/*.sql; do

        [ -f "$migration_file" ] || continue
        migration_name="${migration_file##*/}"

        already_applied="$(psql_run -tA -v fname="$migration_name" <<'SQL'
SELECT 1 FROM "schema_migrations" WHERE "filename" = :'fname';
SQL
        )" || die "Could not read the schema_migrations ledger."
        [ -z "$already_applied" ] || continue

        log "Applying $migration_name ..."

        {
            echo 'BEGIN;'
            cat "$migration_file"
            cat <<'SQL'

INSERT INTO "schema_migrations" ("filename") VALUES (:'fname');
COMMIT;
SQL
        } | psql_run -v fname="$migration_name" >/dev/null \
            || die "Migration $migration_name failed; the database was left untouched by it. Fix the file (or the database) and re-run the installer."

        applied_any=1
    done

    if [ "$applied_any" -eq 0 ]; then
        log "Database schema is already up to date."
    else
        log "Database migrations applied."
    fi
}

# ---------------------------------------------------------------------------
# Step 6 — Bootstrap the admin
# ---------------------------------------------------------------------------

# Hash the password with the argon2 CLI in a throwaway container.
hash_password() {
    salt="$(openssl rand -hex 16)"

    ADMIN_PASSWORD_HASH="$(docker_cmd run --rm \
        -e GITPAAS_PW="$1" -e GITPAAS_SALT="$salt" \
        "$ARGON2_IMAGE" \
        sh -c 'apk add --no-cache argon2 >/dev/null 2>&1 || exit 1; printf %s "$GITPAAS_PW" | argon2 "$GITPAAS_SALT" -id -t 3 -m 16 -p 4 -l 32 -e' \
        || true)"

    [ -n "$ADMIN_PASSWORD_HASH" ] \
        || die "Could not hash the admin password (the argon2 helper container produced no output). Check that this host can pull $ARGON2_IMAGE and reach the Alpine package mirrors."


    case "$ADMIN_PASSWORD_HASH" in
        '$argon2id$v=19$m=65536,t=3,p=4$'*) : ;;
        *) die "The generated password hash is not in the expected argon2id format (\$argon2id\$v=19\$m=65536,t=3,p=4\$...), so the backend could not verify it. Aborting instead of creating an admin that cannot log in." ;;
    esac
}

bootstrap_admin() {
    ask "Admin email" ""
    GITPAAS_ADMIN_EMAIL="$ANSWER"
    [ -n "$GITPAAS_ADMIN_EMAIL" ] \
        || die "No admin email given. Run the installer again and answer that question; the steps already done are skipped."

    load_db_credentials

    ADMIN_PASSWORD="$(rand_password)"
    log "Hashing the admin password..."
    hash_password "$ADMIN_PASSWORD"

    log "Creating the admin ($GITPAAS_ADMIN_EMAIL) ..."

    psql_run -v "email=$GITPAAS_ADMIN_EMAIL" -v "hash=$ADMIN_PASSWORD_HASH" <<'SQL'
INSERT INTO "users" ("email", "passwordHash", "role", "isActive")
VALUES (:'email', :'hash', 'admin', true)
ON CONFLICT ("email") DO NOTHING;
SQL
}

# ---------------------------------------------------------------------------
# Step 7 — Pull the published images and bring up the application stack
# ---------------------------------------------------------------------------
bring_up() {
    log "Pulling images from ghcr.io/gitopslovers (this can take a while on first run) ..."

    compose pull \
        || die "Could not pull the GitPaaS images at tag '$IMAGE_TAG'. Check this host's network access to ghcr.io and that the tag exists, then re-run the installer."

    log "Bringing up the rest of the stack ..."
    # The schema is migrated and the admin exists, so it is safe to start the application containers.
    compose up -d

    log "Waiting for the backend to become healthy ..."
    i=0
    while [ "$i" -lt 60 ]; do
        status="$(docker_cmd inspect --format '{{.State.Health.Status}}' gitpaas-backend 2>/dev/null || echo starting)"
        case "$status" in
            healthy) log "Backend is healthy."; return ;;
            unhealthy) die "Backend became unhealthy. Inspect logs with: $SUDO docker compose -f $GITPAAS_DIR/iac/production/docker-compose.yml logs backend" ;;
        esac
        i=$((i + 1))
        sleep 5
    done
    die "Timed out waiting for the backend to become healthy. Inspect: $SUDO docker compose -f $GITPAAS_DIR/iac/production/docker-compose.yml logs"
}

# ---------------------------------------------------------------------------
# Final summary
# ---------------------------------------------------------------------------
print_summary() {
    printf '\n%s────────────────────────────────────────────────────────%s\n' "$C_GREEN$C_BOLD" "$C_RESET"
    printf '%s GitPaaS is up.%s\n' "$C_GREEN$C_BOLD" "$C_RESET"
    printf '%s────────────────────────────────────────────────────────%s\n' "$C_GREEN$C_BOLD" "$C_RESET"
    if [ -n "$GITPAAS_DOMAIN" ]; then
        printf '  Frontend : https://%s\n' "$GITPAAS_DOMAIN"
        printf '  API      : https://%s/api/v1\n' "$GITPAAS_DOMAIN"
        printf '  Fallback : http://%s:8080 (the published port, always open)\n' "$HOST_ADDR"
    else
        printf '  Frontend : http://%s:8080\n' "$HOST_ADDR"
        printf '  API      : http://%s:3000/api/v1\n' "$HOST_ADDR"
    fi
    printf '  Docker   : local socket /var/run/docker.sock (backend joins group id %s)\n' "$DOCKER_GID"
    printf '\n'
    printf '  %sAdmin email%s    : %s\n' "$C_BOLD" "$C_RESET" "$GITPAAS_ADMIN_EMAIL"
    printf '  %sAdmin password%s : %s%s%s\n' "$C_BOLD" "$C_RESET" "$C_YELLOW$C_BOLD" "$ADMIN_PASSWORD" "$C_RESET"
    printf '\n'
    printf '  %sBack up SECRETS_ENCRYPTION_KEY%s in iac/production/.env: a lost key\n' "$C_BOLD" "$C_RESET"
    printf '  makes every stored secret (a provider key, a secret variable of a service) unreadable.\n'
    if [ -n "$GITPAAS_DOMAIN" ]; then
        printf '\n'
        printf '  The certificate of %s is asked on the first visit and arrives\n' "$GITPAAS_DOMAIN"
        printf "  some minutes later. It needs the A record of that domain to point here, and\n"
        printf '  the ports 80 and 443 of this server to be reachable from the internet.\n'
    fi
    printf '%s────────────────────────────────────────────────────────%s\n\n' "$C_GREEN$C_BOLD" "$C_RESET"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    log "GitPaaS installer starting."

    # Best-effort public/primary address for the printed URLs + CORS origin.
    HOST_ADDR="$(hostname -I 2>/dev/null | awk '{print $1}')"
    [ -n "$HOST_ADDR" ] || HOST_ADDR="localhost"

    # Before anything on this host is touched: the proxy owns 80 and 443, and a
    # conflict there is cheaper to report now than after Docker is installed.
    assert_proxy_ports_free

    ensure_docker
    resolve_version
    fetch_source
    configure_control_plane
    generate_env
    start_data_stores
    run_migrations
    bootstrap_admin
    bring_up
    print_summary
}

main
