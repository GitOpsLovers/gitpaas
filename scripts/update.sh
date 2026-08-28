#!/bin/sh
#
# GitPaaS updater.
#
# Moves an installed GitPaaS to a target version, from the server that carries it:
#
#   sudo sh /opt/gitpaas/scripts/update.sh --version v1.2.3
#
# What it does, in order:
#   1. Resolves the version to install (the latest published release by default, or
#      the release tag you pass) and refuses "latest" as an image tag.
#   2. Downloads iac/production/ at that version and REPLACES the installed copy
#      with it. The download always happens: an existing directory is the thing
#      being replaced, never a reason to skip.
#   3. Keeps every value of the existing .env, writes the new IMAGE_TAG and appends
#      every key that the new .env.example carries and the file misses.
#   4. Applies the SQL migrations of the new iac/production/migrations/ that the
#      `schema_migrations` ledger does not hold yet, exactly as the installer does.
#   5. Pulls the images of the target version and brings the stack up.
#
# Every step is written to the `platform_updates` row of this update, so the
# frontend can follow the progress while the backend container is replaced. The
# reporting is best effort: a database that cannot be reached never stops the update.
#
# Exit code 0 means the stack runs at the target version; any other code means a
# step failed, and the error is on stderr and in that row.

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
PROD_DIR="$GITPAAS_DIR/iac/production"
ENV_FILE="$PROD_DIR/.env"

# The row of `platform_updates` this run reports to. The backend creates the row
# before it starts the container of the update and passes its id; when nothing
# passes one, the script inserts its own.
GITPAAS_UPDATE_ID="${GITPAAS_UPDATE_ID:-}"

# The last step reported, so a failure records where it happened.
CURRENT_STEP="starting"
CURRENT_PERCENT=0
FAILURE_REPORTED=0

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

# Every failure of this script goes through die(), so the row of the update
# always carries the reason the operator reads on the screen.
die()  { err "$*"; report_failure "$*"; exit 1; }

# ---------------------------------------------------------------------------
# The state of the update in PostgreSQL
# ---------------------------------------------------------------------------

# Read a single value out of the installed .env.
env_value() { $SUDO grep -m1 "^$1=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- ; }

# Read the Postgres credentials out of the installed .env.
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

# The same, but it never fails the update: the progress is a report, and the
# database of an old installation may not carry `platform_updates` yet.
psql_report() { psql_run "$@" >/dev/null 2>&1 || true; }

# Open the row of this update, unless the caller already created one.
open_update_state() {
    if [ -n "$GITPAAS_UPDATE_ID" ]; then
        report_step "$CURRENT_STEP" "$CURRENT_PERCENT"
        return
    fi

    GITPAAS_UPDATE_ID="$(psql_run -tA -v "target=$RESOLVED_REF" <<'SQL' 2>/dev/null || true
INSERT INTO "platform_updates" ("targetVersion", "step", "percent", "state")
VALUES (:'target', 'starting', 0, 'running')
RETURNING "id";
SQL
    )"

    [ -n "$GITPAAS_UPDATE_ID" ] \
        || log "No row of platform_updates could be opened — the update runs, and it reports on this terminal alone."
}

# Record the step the update reached, and how far along it is.
report_step() {
    CURRENT_STEP="$1"
    CURRENT_PERCENT="$2"
    log "$1"

    [ -n "$GITPAAS_UPDATE_ID" ] || return 0

    psql_report -v "id=$GITPAAS_UPDATE_ID" -v "step=$1" -v "percent=$2" <<'SQL'
UPDATE "platform_updates"
SET "step" = :'step', "percent" = :'percent'::integer, "state" = 'running', "error" = NULL
WHERE "id" = :'id'::uuid;
SQL
}

# Record the failure on the last step reported. Called by die(), and by the trap
# that catches a command failing under `set -e`.
report_failure() {
    [ "$FAILURE_REPORTED" -eq 0 ] || return 0
    FAILURE_REPORTED=1

    [ -n "$GITPAAS_UPDATE_ID" ] || return 0

    psql_report -v "id=$GITPAAS_UPDATE_ID" -v "error=$1" <<'SQL'
UPDATE "platform_updates"
SET "state" = 'failed', "error" = :'error'
WHERE "id" = :'id'::uuid;
SQL
}

# Record the end of the update. The row is the only thing the frontend polls, so
# it carries the completion even when this terminal is gone.
report_completion() {
    CURRENT_STEP="The update is complete."
    CURRENT_PERCENT=100
    log "$CURRENT_STEP"

    [ -n "$GITPAAS_UPDATE_ID" ] || return 0

    psql_report -v "id=$GITPAAS_UPDATE_ID" <<'SQL'
UPDATE "platform_updates"
SET "step" = 'The update is complete.', "percent" = 100, "state" = 'completed', "error" = NULL
WHERE "id" = :'id'::uuid;
SQL
}

# A command that fails under `set -e` skips die(), so the trap closes the row.
on_exit() {
    exit_code=$?
    [ "$exit_code" -eq 0 ] && return 0
    report_failure "The update stopped on the step '$CURRENT_STEP' with the code $exit_code."
    return 0
}
trap on_exit EXIT

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

# Only a released version is updatable. The application images are published per
# release, so any other ref (a branch such as "main") would run release images
# against a source tree that does not match them.
assert_version_tag() {
    case "$1" in
        v[0-9]*.[0-9]*|[0-9]*.[0-9]*) : ;;
        *) die "'$1' is not a released GitPaaS version. Pass a published release tag, e.g. --version v1.2.3, or omit --version to update to the latest release." ;;
    esac
}

# A flag written as "--flag value" needs a second argument.
require_value() {
    [ "$1" -ge 2 ] || die "$2 needs a value, e.g. $2 $3 (try --help)."
}

while [ $# -gt 0 ]; do
    case "$1" in
        --version)     require_value $# --version v1.2.3; GITPAAS_VERSION="$2"; shift 2 ;;
        --version=*)   GITPAAS_VERSION="${1#*=}"; shift ;;
        --update-id)   require_value $# --update-id "<uuid>"; GITPAAS_UPDATE_ID="$2"; shift 2 ;;
        --update-id=*) GITPAAS_UPDATE_ID="${1#*=}"; shift ;;
        -h|--help)
            awk 'NR == 1 { next } /^#/ { print; next } { exit }' "$0" 2>/dev/null || true
            exit 0 ;;
        *) die "Unknown argument: $1. The updater takes --version and --update-id (try --help)." ;;
    esac
done

# Reject a non-release version straight away, before anything on this host is
# touched (no download, no directory replaced).
[ "$GITPAAS_VERSION" = "latest" ] || assert_version_tag "$GITPAAS_VERSION"

# ---------------------------------------------------------------------------
# Privilege + prerequisite detection
# ---------------------------------------------------------------------------
if [ "$(id -u)" -eq 0 ]; then
    SUDO=""
else
    if command -v sudo >/dev/null 2>&1; then
        SUDO="sudo"
    else
        die "This updater needs root privileges (to write under $GITPAAS_DIR and to talk to the Docker daemon), but neither root nor sudo is available."
    fi
fi

need() { command -v "$1" >/dev/null 2>&1 || die "Required command '$1' is not available."; }

need curl
need tar

# Docker CLI wrapper (root or sudo as needed).
docker_cmd() { $SUDO docker "$@"; }

# The compose plugin is a separate binary, so we wrap it in a function that
# always points at the production stack of this installation.
compose() { docker_cmd compose -f "$PROD_DIR/docker-compose.yml" "$@"; }

# ---------------------------------------------------------------------------
# Step 1 — Resolve the target version
# ---------------------------------------------------------------------------

# "latest" is a moving tag: an image pulled under it stops matching the source
# tree of iac/production/ on the next release, and the version the platform
# reports about itself becomes a lie.
assert_image_tag() {
    [ -n "$1" ] || die "The image tag of this update resolved to nothing. Re-run naming a released version explicitly, e.g. --version v1.2.3."
    [ "$1" != "latest" ] \
        || die "'latest' is not a valid IMAGE_TAG: it is a moving tag, so the images would stop matching the installed source at the next release. Name a released version explicitly, e.g. --version v1.2.3."
}

resolve_version() {
    # An explicit version was already validated right after argument parsing.
    if [ "$GITPAAS_VERSION" != "latest" ]; then
        RESOLVED_REF="$GITPAAS_VERSION"
        log "Updating to the requested version: $RESOLVED_REF"
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

# Map the resolved version tag to the tag of the PUBLISHED container images.
image_tag_for_ref() {
    ref="$1"
    case "$ref" in
        v[0-9]*) echo "${ref#v}" ;;
        *)       echo "$ref" ;;
    esac
}

# ---------------------------------------------------------------------------
# Step 2 — Replace iac/production/ with the target version
# ---------------------------------------------------------------------------
# The update always downloads. An existing iac/production/ is the thing being
# replaced, and skipping the download would leave the source of the old version
# beside the images of the new one.
fetch_source() {
    report_step "Downloading the release $RESOLVED_REF ..." 15

    staging_dir="$(mktemp -d)"
    tarball="$staging_dir/gitpaas-src.tar.gz"

    curl -fsSL "https://codeload.github.com/${REPO_SLUG}/tar.gz/${RESOLVED_REF}" -o "$tarball" \
        || die "Could not download the GitPaaS production stack for version '$RESOLVED_REF'. Is it a published release tag?"

    # Untar only the iac/production/ subdir of the archive.
    tar_wildcards=""
    tar --version 2>/dev/null | grep -qi 'gnu tar' && tar_wildcards="--wildcards"
    tar -xzf "$tarball" -C "$staging_dir" --strip-components=1 $tar_wildcards '*/iac/production/*' \
        || die "Could not extract iac/production/ from the downloaded archive for '$RESOLVED_REF'."
    rm -f "$tarball"

    [ -f "$staging_dir/iac/production/docker-compose.yml" ] \
        || die "The downloaded archive of '$RESOLVED_REF' is missing iac/production/docker-compose.yml."
    [ -f "$staging_dir/iac/production/.env.example" ] \
        || die "The downloaded archive of '$RESOLVED_REF' is missing iac/production/.env.example."

    report_step "Replacing the production stack ..." 30

    # The .env of this server is the one file of iac/production/ that the release
    # does not carry: move it across before the swap, or the stack loses every
    # secret it was installed with.
    $SUDO cp -p "$ENV_FILE" "$staging_dir/iac/production/.env" \
        || die "Could not carry $ENV_FILE over to the new production stack."

    $SUDO rm -rf "$PROD_DIR.new" "$PROD_DIR.old"
    $SUDO cp -R "$staging_dir/iac/production" "$PROD_DIR.new" \
        || die "Could not stage the new production stack at $PROD_DIR.new."
    rm -rf "$staging_dir"

    # The previous stack stays as iac/production.old until the update ends, so a
    # failed run leaves the operator the files of the version they came from.
    $SUDO mv "$PROD_DIR" "$PROD_DIR.old" || die "Could not move the installed production stack aside."
    $SUDO mv "$PROD_DIR.new" "$PROD_DIR"  || die "Could not put the new production stack in place. The previous one is at $PROD_DIR.old."

    log "iac/production/ now holds $RESOLVED_REF (the previous one is at $PROD_DIR.old)."
}

# ---------------------------------------------------------------------------
# Step 3 — Carry .env forward
# ---------------------------------------------------------------------------
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

# A release adds settings, and the .env of this server predates them. Append every
# key of the new .env.example that the file misses, with the value of the example,
# and touch no value the operator or the installer already wrote.
add_missing_env_keys() {
    $SUDO cat "$PROD_DIR/.env.example" | while IFS= read -r line; do
        case "$line" in
            ''|'#'*) continue ;;
            *=*)     : ;;
            *)       continue ;;
        esac

        key="${line%%=*}"
        case "$key" in
            ''|*[!A-Za-z0-9_]*) continue ;;
        esac

        if ! $SUDO grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
            log "New setting of $RESOLVED_REF: $key"
            default_env "$key" "${line#*=}"
        fi
    done
}

update_env() {
    report_step "Updating the environment file ..." 45

    [ -f "$ENV_FILE" ] || die "$ENV_FILE disappeared during the update. The production stack of the previous version is at $PROD_DIR.old."

    add_missing_env_keys

    IMAGE_TAG="$(image_tag_for_ref "$RESOLVED_REF")"
    assert_image_tag "$IMAGE_TAG"
    upsert_env "IMAGE_TAG" "$IMAGE_TAG"

    log "Application images will be pulled at tag: $IMAGE_TAG."
}

# ---------------------------------------------------------------------------
# Step 4 — Apply the SQL migrations of the new version
# ---------------------------------------------------------------------------
run_migrations() {
    report_step "Applying the database migrations ..." 60

    # The .env was rewritten, so read the credentials it carries now.
    load_db_credentials

    migrations_dir="$PROD_DIR/migrations"
    [ -d "$migrations_dir" ] || die "Migrations directory not found: $migrations_dir"

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
            || die "Migration $migration_name failed; the database was left untouched by it. Fix the file (or the database) and run the update again."

        applied_any=1
    done

    if [ "$applied_any" -eq 0 ]; then
        log "Database schema is already up to date."
    else
        log "Database migrations applied."
    fi
}

# ---------------------------------------------------------------------------
# Step 5 — Pull the images of the target version and bring the stack up
# ---------------------------------------------------------------------------
bring_up() {
    report_step "Pulling the images of $RESOLVED_REF ..." 75

    compose pull \
        || die "Could not pull the GitPaaS images at tag '$IMAGE_TAG'. Check this host's network access to ghcr.io and that the tag exists, then run the update again."

    # This step replaces the container of the backend, which is the caller of this
    # script. The row of platform_updates carries the rest of the progress.
    report_step "Starting the stack at $RESOLVED_REF ..." 90

    compose up -d \
        || die "Could not bring the stack up at '$IMAGE_TAG'. Inspect: $SUDO docker compose -f $PROD_DIR/docker-compose.yml logs"
}

# ---------------------------------------------------------------------------
# Final summary
# ---------------------------------------------------------------------------
print_summary() {
    printf '\n%s────────────────────────────────────────────────────────%s\n' "$C_GREEN$C_BOLD" "$C_RESET"
    printf '%s GitPaaS runs at %s.%s\n' "$C_GREEN$C_BOLD" "$RESOLVED_REF" "$C_RESET"
    printf '%s────────────────────────────────────────────────────────%s\n' "$C_GREEN$C_BOLD" "$C_RESET"
    printf '  Image tag : %s\n' "$IMAGE_TAG"
    printf '  Stack     : %s\n' "$PROD_DIR"
    printf '\n'
    printf '  %sThe containers take some seconds to become healthy.%s Follow them with:\n' "$C_BOLD" "$C_RESET"
    printf '    %sdocker compose -f %s/docker-compose.yml ps%s\n' "$C_YELLOW" "$PROD_DIR" "$C_RESET"
    printf '%s────────────────────────────────────────────────────────%s\n\n' "$C_GREEN$C_BOLD" "$C_RESET"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    log "GitPaaS updater starting."

    [ -f "$PROD_DIR/docker-compose.yml" ] \
        || die "No GitPaaS installation found at $GITPAAS_DIR ($PROD_DIR/docker-compose.yml is missing). Install GitPaaS with scripts/install.sh before you update it."
    [ -f "$ENV_FILE" ] \
        || die "No $ENV_FILE found, so this installation has no configuration to carry forward. Install GitPaaS with scripts/install.sh before you update it."

    command -v docker >/dev/null 2>&1 && docker_cmd compose version >/dev/null 2>&1 \
        || die "Docker and its compose plugin are required to update GitPaaS, and one of them is missing on this host."

    # The progress is written with the credentials of the running installation.
    load_db_credentials

    resolve_version
    open_update_state
    fetch_source
    update_env
    run_migrations
    bring_up

    # The previous stack was kept for the length of the update alone.
    $SUDO rm -rf "$PROD_DIR.old"

    report_completion
    print_summary
}

main
