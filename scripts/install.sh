#!/bin/sh
#
# GitPaaS one-line installer.
#
# Turns a fresh VPS into a running GitPaaS control plane with a single command:
#
#   curl -fsSL https://raw.githubusercontent.com/GitOpsLovers/gitpaas/main/scripts/install.sh | sh
#
# What it does, in order:
#   1. Ensures Docker + the compose plugin are installed (provisions them if not).
#   2. Resolves the version to install ("latest" release tag by default, or an
#      explicit tag/branch you pick) and fetches the repo source at that version.
#   3. Generates the mTLS certificate material the control plane uses to reach the
#      remote Docker daemon (a CA, a clientAuth cert for the control plane, and a
#      serverAuth cert for the remote daemon).
#   4. Writes iac/production/.env with secure random secrets (DB password + JWT
#      secrets), leaving operator-supplied values (GitHub App, remote Docker host)
#      as clearly-marked placeholders you fill in.
#   5. Brings up the production compose stack — postgres, redis, the one-shot
#      `migrate` service (which creates the schema via TypeORM migrations), the
#      backend, and the frontend.
#   6. Seeds the FIRST admin: prompts for your email, generates a random password,
#      stores it as an argon2id hash (via the backend's own hasher), and prints the
#      password for you to copy.
#
# It is written for POSIX /bin/sh, fails fast (set -e), and is safe to re-run:
# existing certs and .env are preserved, and the admin seed is idempotent.
#
# Configuration (flags OR environment variables):
#   --version <ref>   / GITPAAS_VERSION   Tag or branch to install. Default: the
#                                         latest release tag (falls back to "main").
#   --dir <path>      / GITPAAS_DIR       Install directory. Default: /opt/gitpaas.
#   --email <email>   / GITPAAS_ADMIN_EMAIL   Admin email (skips the prompt).
#   --docker-host <h> / GITPAAS_DOCKER_HOST   Remote Docker host (hostname or IP)
#                                         to bake into the server cert's SAN and
#                                         into .env. Optional; can be filled later.

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
GITPAAS_DOCKER_HOST="${GITPAAS_DOCKER_HOST:-}"

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
        --docker-host)   GITPAAS_DOCKER_HOST="$2"; shift 2 ;;
        --docker-host=*) GITPAAS_DOCKER_HOST="${1#*=}"; shift ;;
        -h|--help)
            sed -n '2,45p' "$0" 2>/dev/null || true
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
# Step 3 — Generate mTLS material
# ---------------------------------------------------------------------------
# The control plane reaches the remote Docker daemon over mutual TLS, exactly as
# in local development (.dev/vps-certs). We generate:
#   * a CA (signs both ends),
#   * a CLIENT cert (extendedKeyUsage=clientAuth) used by the control plane —
#     ca.pem/cert.pem/key.pem are mounted into the backend (VPS_CERT_HOST_PATH),
#   * a SERVER cert (extendedKeyUsage=serverAuth) for the remote Docker daemon,
#     left for the operator to install on that host.
generate_certs() {
    PROD_DIR="$GITPAAS_DIR/iac/production"
    CLIENT_DIR="$PROD_DIR/certs"                 # mounted into the backend (VPS_CERT_HOST_PATH default)
    SERVER_DIR="$PROD_DIR/certs-remote-docker"   # for the operator to install on the Docker host

    if [ -f "$CLIENT_DIR/cert.pem" ]; then
        log "mTLS material already present in $CLIENT_DIR — keeping it."
        return
    fi

    log "Generating mTLS certificate material ..."
    work="$(mktemp -d)"

    # --- Certificate Authority ---
    openssl genrsa -out "$work/ca-key.pem" 4096 >/dev/null 2>&1
    openssl req -x509 -new -nodes -key "$work/ca-key.pem" -sha256 -days 3650 \
        -subj "/CN=gitpaas-ca" -out "$work/ca.pem" >/dev/null 2>&1

    # --- Client cert (control plane -> daemon), extendedKeyUsage=clientAuth ---
    printf 'extendedKeyUsage = clientAuth\n' > "$work/client-ext.cnf"
    openssl genrsa -out "$work/client-key.pem" 4096 >/dev/null 2>&1
    openssl req -new -key "$work/client-key.pem" -subj "/CN=gitpaas-client" \
        -out "$work/client.csr" >/dev/null 2>&1
    openssl x509 -req -in "$work/client.csr" -CA "$work/ca.pem" -CAkey "$work/ca-key.pem" \
        -CAcreateserial -days 3650 -sha256 -extfile "$work/client-ext.cnf" \
        -out "$work/client-cert.pem" >/dev/null 2>&1

    # --- Server cert (remote Docker daemon), extendedKeyUsage=serverAuth ---
    # The SAN must cover the address the control plane dials (VPS_DOCKER_HOST).
    # If we know it, bake it in; otherwise ship a localhost SAN and warn that the
    # operator must regenerate the server cert once the host address is known.
    if [ -n "$GITPAAS_DOCKER_HOST" ]; then
        server_cn="$GITPAAS_DOCKER_HOST"
        case "$GITPAAS_DOCKER_HOST" in
            *[!0-9.]*) san="DNS:${GITPAAS_DOCKER_HOST},DNS:localhost,IP:127.0.0.1" ;;
            *)         san="IP:${GITPAAS_DOCKER_HOST},DNS:localhost,IP:127.0.0.1" ;;
        esac
    else
        server_cn="localhost"
        san="DNS:localhost,IP:127.0.0.1"
    fi
    printf 'extendedKeyUsage = serverAuth\nsubjectAltName = %s\n' "$san" > "$work/server-ext.cnf"
    openssl genrsa -out "$work/server-key.pem" 4096 >/dev/null 2>&1
    openssl req -new -key "$work/server-key.pem" -subj "/CN=${server_cn}" \
        -out "$work/server.csr" >/dev/null 2>&1
    openssl x509 -req -in "$work/server.csr" -CA "$work/ca.pem" -CAkey "$work/ca-key.pem" \
        -CAcreateserial -days 3650 -sha256 -extfile "$work/server-ext.cnf" \
        -out "$work/server-cert.pem" >/dev/null 2>&1

    # --- Place the client material where compose mounts it (ca/cert/key.pem) ---
    $SUDO mkdir -p "$CLIENT_DIR" "$SERVER_DIR"
    $SUDO cp "$work/ca.pem"          "$CLIENT_DIR/ca.pem"
    $SUDO cp "$work/client-cert.pem" "$CLIENT_DIR/cert.pem"
    $SUDO cp "$work/client-key.pem"  "$CLIENT_DIR/key.pem"

    # --- Leave the CA + server material for the operator's Docker host ---
    $SUDO cp "$work/ca.pem"          "$SERVER_DIR/ca.pem"
    $SUDO cp "$work/server-cert.pem" "$SERVER_DIR/server-cert.pem"
    $SUDO cp "$work/server-key.pem"  "$SERVER_DIR/server-key.pem"

    rm -rf "$work"
    log "mTLS material generated (client certs in $CLIENT_DIR; server certs in $SERVER_DIR)."
    if [ -z "$GITPAAS_DOCKER_HOST" ]; then
        warn "No remote Docker host was provided, so the server cert only covers localhost."
        warn "Once you know the host address, regenerate the server cert with a matching SAN before wiring VPS_DOCKER_HOST."
    fi
}

# ---------------------------------------------------------------------------
# Step 4 — Generate .env with secure secrets
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

generate_env() {
    PROD_DIR="$GITPAAS_DIR/iac/production"
    ENV_FILE="$PROD_DIR/.env"

    if [ -f "$ENV_FILE" ]; then
        log "$ENV_FILE already exists — keeping it (edit it by hand to change secrets)."
        return
    fi

    log "Writing $ENV_FILE from .env.example with generated secrets ..."
    $SUDO cp "$PROD_DIR/.env.example" "$ENV_FILE"

    db_password="$(rand_password)"
    set_env "POSTGRES_PASSWORD" "$db_password"
    set_env "DB_PASSWORD"       "$db_password"
    set_env "JWT_ACCESS_SECRET"  "$(rand_secret)"
    set_env "JWT_REFRESH_SECRET" "$(rand_secret)"

    # Schema comes from migrations, never synchronize.
    set_env "NODE_ENV" "production"

    # Point CORS at the origin the frontend is actually served from so login works.
    set_env "CORS_ORIGIN" "http://${HOST_ADDR}:8080"

    if [ -n "$GITPAAS_DOCKER_HOST" ]; then
        set_env "VPS_DOCKER_HOST" "$GITPAAS_DOCKER_HOST"
    fi

    log ".env written. GitHub App credentials and (if not provided) VPS_DOCKER_HOST remain as placeholders you must fill in."
}

# ---------------------------------------------------------------------------
# Step 5 — Bring up the stack
# ---------------------------------------------------------------------------
compose() { docker_cmd compose -f "$GITPAAS_DIR/iac/production/docker-compose.yml" "$@"; }

bring_up() {
    log "Building images and bringing up the production stack (this can take a while on first run) ..."
    compose up -d --build

    # The `migrate` one-shot runs (and must complete) before the backend starts,
    # so a healthy backend implies the schema exists. Wait for it before seeding.
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
# Step 6 — Seed the first admin
# ---------------------------------------------------------------------------
seed_admin() {
    # Prompt for the email if it was not supplied. When piped from curl, stdin is
    # the script itself, so read from the controlling terminal instead.
    if [ -z "$GITPAAS_ADMIN_EMAIL" ]; then
        if [ -r /dev/tty ]; then
            printf '%sAdmin email:%s ' "$C_BOLD" "$C_RESET" > /dev/tty
            read -r GITPAAS_ADMIN_EMAIL < /dev/tty
        fi
    fi
    [ -n "$GITPAAS_ADMIN_EMAIL" ] || die "No admin email provided (use --email <addr> or GITPAAS_ADMIN_EMAIL when running non-interactively)."

    ADMIN_PASSWORD="$(rand_password)"

    log "Seeding the first admin ($GITPAAS_ADMIN_EMAIL) ..."
    # Run the compiled seed CLI as a one-shot in the already-built backend image:
    # it hashes the password with the backend's argon2id hasher and inserts the
    # admin idempotently (ON CONFLICT (email) DO NOTHING). --no-deps keeps it from
    # restarting the running services; it joins the compose network so DB_HOST
    # (=postgres) resolves.
    compose run --rm --no-deps \
        -e ADMIN_EMAIL="$GITPAAS_ADMIN_EMAIL" \
        -e ADMIN_PASSWORD="$ADMIN_PASSWORD" \
        backend node dist/src/features/users/infrastructure/cli/seed-admin.cli.js
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
    printf '\n'
    printf '  %sAdmin email%s    : %s\n' "$C_BOLD" "$C_RESET" "$GITPAAS_ADMIN_EMAIL"
    printf '  %sAdmin password%s : %s%s%s\n' "$C_BOLD" "$C_RESET" "$C_YELLOW$C_BOLD" "$ADMIN_PASSWORD" "$C_RESET"
    printf '  (copy it now — it is not stored anywhere in readable form. If this\n'
    printf '   admin already existed, its previous password is unchanged.)\n'
    printf '\n'
    printf '  %sStill to do manually:%s\n' "$C_BOLD" "$C_RESET"
    printf '   * Fill GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY / GITHUB_APP_INSTALLATION_ID in\n'
    printf '     %s/iac/production/.env\n' "$GITPAAS_DIR"
    printf '   * Set VPS_DOCKER_HOST (the remote Docker daemon address) in that .env.\n'
    printf '   * Install %s/iac/production/certs-remote-docker/{ca,server-cert,server-key}.pem\n' "$GITPAAS_DIR"
    printf '     on the remote Docker host and configure dockerd for mTLS on :2376.\n'
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
    generate_certs
    generate_env
    bring_up
    seed_admin
    print_summary
}

main
