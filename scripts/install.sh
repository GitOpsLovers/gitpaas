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
#   2. Resolves the version to install ("latest" release tag by default, or an
#      explicit tag/branch you pick) and fetches the repo source at that version.
#   3. Writes iac/production/.env with secure random secrets (DB password + JWT
#      secrets) and the host's docker group id (DOCKER_GID, so the non-root
#      backend container can use the mounted Docker socket), leaving
#      operator-supplied values (GitHub App) as clearly-marked placeholders.
#   4. Starts ONLY the data store (postgres) and waits for Postgres.
#   5. Applies the SQL migrations in iac/production/migrations/ (in filename
#      order) straight into Postgres, tracking what ran in a `schema_migrations`
#      ledger table, so the schema is complete before anything else runs.
#   6. Bootstraps the FIRST admin straight into Postgres, with no application
#      container involved: prompts for your email, generates a random password,
#      hashes it as argon2id in a throwaway container, inserts the row, and
#      prints the password for you to copy.
#   7. Only then brings up the application stack — the backend and the frontend —
#      and waits for the backend to become healthy.
#
# The application therefore never boots against a database without an admin in it.
#
# GitPaaS runs everything on THIS server: the backend drives the host's own Docker
# daemon through the bind-mounted /var/run/docker.sock. The only thing that needs
# resolving is the socket's group id, which the installer detects for you.
#
# It is written for POSIX /bin/sh, fails fast (set -e), and is safe to re-run:
# an existing .env is preserved, already-applied migrations are skipped, and the
# admin seed is idempotent.
#
# Configuration (flags OR environment variables):
#   --version <ref>   / GITPAAS_VERSION   Tag or branch to install. Default: the
#                                         latest release tag (falls back to "main").
#   --dir <path>      / GITPAAS_DIR       Install directory. Default: /opt/gitpaas.
#   --email <email>   / GITPAAS_ADMIN_EMAIL   Admin email (skips the prompt).

set -e

# ---------------------------------------------------------------------------
# Constants + defaults
# ---------------------------------------------------------------------------
REPO_OWNER="GitOpsLovers"
REPO_NAME="gitpaas"
REPO_SLUG="${REPO_OWNER}/${REPO_NAME}"

GITPAAS_VERSION="${GITPAAS_VERSION:-latest}"
GITPAAS_DIR="${GITPAAS_DIR:-/opt/gitpaas}"
GITPAAS_ADMIN_EMAIL="${GITPAAS_ADMIN_EMAIL:-}"

# Throwaway image used to hash the admin password with the argon2 CLI, so the
# bootstrap needs no application container at all. Pinned for reproducibility.
ARGON2_IMAGE="alpine:3.22"

# ---------------------------------------------------------------------------
# Logging helpers (kept dependency-free; colours only when stdout is a TTY)
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
    C_BOLD="$(printf '\033[1m')"; C_GREEN="$(printf '\033[32m')"
    C_YELLOW="$(printf '\033[33m')"; C_RED="$(printf '\033[31m')"; C_RESET="$(printf '\033[0m')"
else
    C_BOLD=""; C_GREEN=""; C_YELLOW=""; C_RED=""; C_RESET=""
fi

log()  { printf '%s==>%s %s\n' "$C_GREEN$C_BOLD" "$C_RESET" "$*"; }
warn() { printf '%s[warn]%s %s\n' "$C_YELLOW" "$C_RESET" "$*" >&2; }
err()  { printf '%s[error]%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
die()  { err "$*"; exit 1; }

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
while [ $# -gt 0 ]; do
    case "$1" in
        --version)     GITPAAS_VERSION="$2"; shift 2 ;;
        --version=*)   GITPAAS_VERSION="${1#*=}"; shift ;;
        --dir)         GITPAAS_DIR="$2"; shift 2 ;;
        --dir=*)       GITPAAS_DIR="${1#*=}"; shift ;;
        --email)       GITPAAS_ADMIN_EMAIL="$2"; shift 2 ;;
        --email=*)     GITPAAS_ADMIN_EMAIL="${1#*=}"; shift ;;
        -h|--help)
            sed -n '2,42p' "$0" 2>/dev/null || true
            exit 0 ;;
        *) die "Unknown argument: $1 (try --help)" ;;
    esac
done

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
# curl reaches us here (we were piped from it), but be explicit for direct runs.
need curl
need openssl
need tar

# Docker CLI wrapper (root or sudo as needed).
docker_cmd() { $SUDO docker "$@"; }

# ---------------------------------------------------------------------------
# Step 1 — Ensure Docker + compose plugin
# ---------------------------------------------------------------------------
ensure_docker() {
    if command -v docker >/dev/null 2>&1 && docker_cmd compose version >/dev/null 2>&1; then
        log "Docker and the compose plugin are already installed."
        return
    fi

    log "Docker (or the compose plugin) is missing — installing via get.docker.com ..."
    # The official convenience script installs the engine + compose plugin and
    # supports the common distros. It is the same path Coolify/Dokploy use.
    curl -fsSL https://get.docker.com -o /tmp/gitpaas-get-docker.sh
    $SUDO sh /tmp/gitpaas-get-docker.sh
    rm -f /tmp/gitpaas-get-docker.sh

    command -v docker >/dev/null 2>&1 || die "Docker installation failed."
    docker_cmd compose version >/dev/null 2>&1 || die "The Docker compose plugin is still missing after install."
    $SUDO systemctl enable --now docker >/dev/null 2>&1 || true
    log "Docker installed."
}

# ---------------------------------------------------------------------------
# Step 2 — Resolve version + fetch source
# ---------------------------------------------------------------------------
resolve_version() {
    if [ "$GITPAAS_VERSION" != "latest" ]; then
        RESOLVED_REF="$GITPAAS_VERSION"
        log "Installing requested version: $RESOLVED_REF"
        return
    fi

    log "Resolving the latest release ..."
    # Prefer the published "latest release"; fall back to the newest tag, then main.
    RESOLVED_REF="$(curl -fsSL "https://api.github.com/repos/${REPO_SLUG}/releases/latest" 2>/dev/null \
        | grep -m1 '"tag_name"' | cut -d'"' -f4 || true)"
    if [ -z "$RESOLVED_REF" ]; then
        RESOLVED_REF="$(curl -fsSL "https://api.github.com/repos/${REPO_SLUG}/tags" 2>/dev/null \
            | grep -m1 '"name"' | cut -d'"' -f4 || true)"
    fi
    if [ -z "$RESOLVED_REF" ]; then
        warn "Could not resolve a release tag (no releases/tags or API rate-limited); falling back to 'main'."
        RESOLVED_REF="main"
    fi
    log "Latest version resolves to: $RESOLVED_REF"
}

fetch_source() {
    # If the target dir already holds the production stack, assume a previous run
    # and reuse it (idempotent). Delete the dir to force a clean re-fetch.
    if [ -f "$GITPAAS_DIR/iac/production/docker-compose.yml" ]; then
        log "Existing install found at $GITPAAS_DIR — reusing its source (delete the dir to re-fetch)."
        return
    fi

    log "Fetching GitPaaS source ($RESOLVED_REF) into $GITPAAS_DIR ..."
    $SUDO mkdir -p "$GITPAAS_DIR"

    tarball="/tmp/gitpaas-src.tar.gz"
    # codeload resolves a short ref (tag OR branch) to a gzipped tarball whose
    # single top-level dir we strip away with --strip-components=1.
    curl -fsSL "https://codeload.github.com/${REPO_SLUG}/tar.gz/${RESOLVED_REF}" -o "$tarball" \
        || die "Could not download source for ref '$RESOLVED_REF'. Is it a valid tag/branch?"
    $SUDO tar -xzf "$tarball" -C "$GITPAAS_DIR" --strip-components=1
    rm -f "$tarball"

    [ -f "$GITPAAS_DIR/iac/production/docker-compose.yml" ] \
        || die "Fetched source is missing iac/production/docker-compose.yml."
    log "Source fetched."
}

# ---------------------------------------------------------------------------
# Step 3 — Generate .env with secure secrets
# ---------------------------------------------------------------------------
rand_secret() { openssl rand -hex 32; }
# Password we display to the operator: alphanumeric so it's trivial to copy and
# safe to substitute into .env / pass through docker without quoting surprises.
rand_password() { openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-28; }

set_env() {
    # Replace `KEY=...` in-place. Values passed here are alphanumeric/hex, so the
    # sed replacement needs no escaping.
    key="$1"; val="$2"
    $SUDO sed -i.bak "s|^${key}=.*|${key}=${val}|" "$ENV_FILE" && $SUDO rm -f "$ENV_FILE.bak"
}

# Same as set_env, but appends the key when .env does not carry it yet (an .env
# generated by an older installer, which we otherwise preserve untouched).
upsert_env() {
    if $SUDO grep -q "^$1=" "$ENV_FILE" 2>/dev/null; then
        set_env "$1" "$2"
    else
        printf '%s=%s\n' "$1" "$2" | $SUDO tee -a "$ENV_FILE" >/dev/null
    fi
}

# The backend container runs as the non-root `node` user, so it can only use the
# bind-mounted /var/run/docker.sock if it joins the group that owns that socket.
# Compose does that through `group_add: ["${DOCKER_GID}"]`, so resolve the GID
# here: the host's `docker` group first, then whatever group actually owns the
# socket (covers distros/setups where the group is named differently).
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
            die "Could not resolve the GID of the group owning /var/run/docker.sock (tried 'getent group docker' and stat on the socket). Make sure Docker is installed and running, then re-run the installer — or set DOCKER_GID by hand in $GITPAAS_DIR/iac/production/.env." ;;
    esac

    log "Host Docker socket group id: $DOCKER_GID (the backend container joins it)."
}

generate_env() {
    PROD_DIR="$GITPAAS_DIR/iac/production"
    ENV_FILE="$PROD_DIR/.env"

    detect_docker_gid

    if [ -f "$ENV_FILE" ]; then
        log "$ENV_FILE already exists — keeping it (edit it by hand to change secrets)."
        # DOCKER_GID is host-specific and must always match this machine.
        upsert_env "DOCKER_GID" "$DOCKER_GID"
        return
    fi

    log "Writing $ENV_FILE from .env.example with generated secrets ..."
    $SUDO cp "$PROD_DIR/.env.example" "$ENV_FILE"

    db_password="$(rand_password)"
    set_env "POSTGRES_PASSWORD" "$db_password"
    set_env "DB_PASSWORD"       "$db_password"
    set_env "JWT_ACCESS_SECRET"  "$(rand_secret)"
    set_env "JWT_REFRESH_SECRET" "$(rand_secret)"

    # Schema comes from the SQL migrations applied below, never synchronize.
    set_env "NODE_ENV" "production"

    # Point CORS at the origin the frontend is actually served from so login works.
    set_env "CORS_ORIGIN" "http://${HOST_ADDR}:8080"

    # Lets the non-root backend container use the mounted Docker socket.
    upsert_env "DOCKER_GID" "$DOCKER_GID"

    log ".env written. GitHub App credentials remain as placeholders you must fill in."
}

# ---------------------------------------------------------------------------
# Step 4 — Start the data stores only
# ---------------------------------------------------------------------------
compose() { docker_cmd compose -f "$GITPAAS_DIR/iac/production/docker-compose.yml" "$@"; }

# Read a single value out of the generated .env. The file is root-owned, hence
# the $SUDO; `cut -f2-` keeps values that themselves contain '='.
env_value() { $SUDO grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- ; }

start_data_stores() {
    log "Starting the data store (postgres) ..."
    # Deliberately NOT `up -d`: the backend and frontend must stay down until the
    # first admin exists, so the app never boots against an admin-less database.
    # It uses a published image, so nothing needs building here.
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

# Read the Postgres credentials out of the generated .env into the globals the
# psql helpers use. Cheap and side-effect free, so every step that talks to the
# database can call it and stay self-contained.
load_db_credentials() {
    POSTGRES_USER="$(env_value POSTGRES_USER)"
    POSTGRES_PASSWORD="$(env_value POSTGRES_PASSWORD)"
    POSTGRES_DB="$(env_value POSTGRES_DB)"
    [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_DB" ] \
        || die "POSTGRES_USER / POSTGRES_DB are missing from $ENV_FILE."
}

# Run SQL inside the postgres container, reading the statements from stdin.
# ON_ERROR_STOP makes psql exit non-zero on the first failure so we abort the
# install instead of continuing on a half-built schema.
psql_run() {
    compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

# Production schema is owned by the plain .sql files in
# iac/production/migrations/, applied here — never by the backend, which ships no
# migration machinery at all. Files run in filename order (the numeric prefix IS
# the order) and each applied file is recorded in a `schema_migrations` ledger,
# so re-running the installer applies nothing.
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
        # Guards the literal glob when the directory holds no .sql file.
        [ -f "$migration_file" ] || continue
        migration_name="${migration_file##*/}"

        # Already in the ledger? Nothing to do. The filename travels as a psql
        # variable, so psql — not the shell — does the quoting.
        already_applied="$(psql_run -tA -v fname="$migration_name" <<'SQL'
SELECT 1 FROM "schema_migrations" WHERE "filename" = :'fname';
SQL
        )" || die "Could not read the schema_migrations ledger."
        [ -z "$already_applied" ] || continue

        log "Applying $migration_name ..."
        # The file and its ledger row go in as ONE transaction, so a failed
        # migration is never recorded as applied.
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
        log "Database schema is already up to date — no migrations to apply."
    else
        log "Database migrations applied."
    fi
}

# ---------------------------------------------------------------------------
# Step 6 — Bootstrap the first admin (no application container involved)
# ---------------------------------------------------------------------------

# Hash the password with the argon2 CLI in a throwaway container. The parameters
# mirror node-argon2's defaults (m=65536 i.e. -m 16, t=3, p=4, 32-byte tag), so
# the backend's argon2id verifier accepts the encoded string as-is. Password and
# salt travel as env vars, never as arguments, so they stay out of `ps` output.
hash_password() {
    salt="$(openssl rand -hex 16)"

    ADMIN_PASSWORD_HASH="$(docker_cmd run --rm \
        -e GITPAAS_PW="$1" -e GITPAAS_SALT="$salt" \
        "$ARGON2_IMAGE" \
        sh -c 'apk add --no-cache argon2 >/dev/null 2>&1 || exit 1; printf %s "$GITPAAS_PW" | argon2 "$GITPAAS_SALT" -id -t 3 -m 16 -p 4 -l 32 -e' \
        || true)"

    [ -n "$ADMIN_PASSWORD_HASH" ] \
        || die "Could not hash the admin password (the argon2 helper container produced no output). Check that this host can pull $ARGON2_IMAGE and reach the Alpine package mirrors."

    # Guard against a CLI whose defaults ever drift: the backend only verifies
    # argon2id strings with exactly these parameters.
    case "$ADMIN_PASSWORD_HASH" in
        '$argon2id$v=19$m=65536,t=3,p=4$'*) : ;;
        *) die "The generated password hash is not in the expected argon2id format (\$argon2id\$v=19\$m=65536,t=3,p=4\$...), so the backend could not verify it. Aborting instead of creating an admin that cannot log in." ;;
    esac
}

bootstrap_admin() {
    # Prompt for the email if it was not supplied. When piped from curl, stdin is
    # the script itself, so read from the controlling terminal instead.
    if [ -z "$GITPAAS_ADMIN_EMAIL" ]; then
        if [ -r /dev/tty ]; then
            printf '%sAdmin email:%s ' "$C_BOLD" "$C_RESET" > /dev/tty
            read -r GITPAAS_ADMIN_EMAIL < /dev/tty
        fi
    fi
    [ -n "$GITPAAS_ADMIN_EMAIL" ] || die "No admin email provided (use --email <addr> or GITPAAS_ADMIN_EMAIL when running non-interactively)."

    load_db_credentials

    ADMIN_PASSWORD="$(rand_password)"
    log "Hashing the admin password (argon2id) ..."
    hash_password "$ADMIN_PASSWORD"

    log "Creating the first admin ($GITPAAS_ADMIN_EMAIL) ..."
    # Email and hash go in as psql variables, so psql — not the shell — does the
    # quoting and no value can break out of the statement. ON CONFLICT keeps the
    # install re-runnable: an existing admin keeps its current password.
    psql_run -v "email=$GITPAAS_ADMIN_EMAIL" -v "hash=$ADMIN_PASSWORD_HASH" <<'SQL'
INSERT INTO "users" ("email", "passwordHash", "role", "isActive")
VALUES (:'email', :'hash', 'admin', true)
ON CONFLICT ("email") DO NOTHING;
SQL
}

# ---------------------------------------------------------------------------
# Step 7 — Bring up the application stack
# ---------------------------------------------------------------------------
bring_up() {
    log "Building images and bringing up the rest of the stack (this can take a while on first run) ..."
    # The schema is migrated and the admin exists, so it is safe to start the
    # application containers: the backend, then the frontend.
    compose up -d --build

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
    printf '  Frontend : http://%s:8080\n' "$HOST_ADDR"
    printf '  API      : http://%s:3000/api/v1\n' "$HOST_ADDR"
    printf '  Docker   : local socket /var/run/docker.sock (backend joins group id %s)\n' "$DOCKER_GID"
    printf '\n'
    printf '  %sAdmin email%s    : %s\n' "$C_BOLD" "$C_RESET" "$GITPAAS_ADMIN_EMAIL"
    printf '  %sAdmin password%s : %s%s%s\n' "$C_BOLD" "$C_RESET" "$C_YELLOW$C_BOLD" "$ADMIN_PASSWORD" "$C_RESET"
    printf '  (copy it now — it is not stored anywhere in readable form. If this\n'
    printf '   admin already existed, its previous password is unchanged.)\n'
    printf '\n'
    printf '  %sStill to do manually:%s\n' "$C_BOLD" "$C_RESET"
    printf '   * Fill GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY / GITHUB_APP_INSTALLATION_ID in\n'
    printf '     %s/iac/production/.env\n' "$GITPAAS_DIR"
    printf '   * After editing .env, apply changes: %ssudo docker compose -f %s/iac/production/docker-compose.yml up -d%s\n' "$C_BOLD" "$GITPAAS_DIR" "$C_RESET"
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

    ensure_docker
    resolve_version
    fetch_source
    generate_env
    start_data_stores
    run_migrations
    bootstrap_admin
    bring_up
    print_summary
}

main
