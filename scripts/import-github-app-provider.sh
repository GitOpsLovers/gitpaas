#!/bin/sh
#
# GitPaaS one-time upgrade helper: import the GitHub App of the .env as a provider.
#
# Until this release, one GitHub App served the whole installation through three
# environment variables — GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY and
# GITHUB_APP_INSTALLATION_ID. Providers are records of the database now, and the
# three variables are gone. This script carries the old credentials over: it reads
# them from the .env of the installation and registers them, once, as a provider
# named "default" through the API of the backend.
#
#   sudo sh scripts/import-github-app-provider.sh --email admin@example.com
#
# What it does, in order:
#   1. Reads GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY and GITHUB_APP_INSTALLATION_ID
#      out of iac/production/.env (a single-line value with "\n" escapes and a
#      quoted multi-line value are both understood).
#   2. Logs in against POST /api/v1/auth/login as an administrator, because only
#      an administrator may write a provider.
#   3. Creates the provider with POST /api/v1/providers.
#
# The private key is never printed, never passed as a command-line argument (so it
# stays out of the process table) and only ever written to a temporary file that
# this script creates with 0600 and deletes on exit.
#
# It is safe to re-run: a second run stops on the 409 the API answers when the
# name is already taken.
#
# AFTER IT RUNS: migration 011 fills services."providerId" from the single
# provider ONLY when exactly one provider exists at the time it is applied. If the
# migration already ran, open each service and save its Provider tab again.
#
# THE MANUAL ALTERNATIVE (this script is a convenience, not a requirement):
#   1. Open the Providers screen of the frontend, at http://<host>:8080/providers/add.
#   2. Register the GitHub App by hand: give it a name, and paste the values of
#      GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID and the PEM of
#      GITHUB_APP_PRIVATE_KEY into the form.
#   3. Open every service, go to its "Provider" tab, pick the provider you just
#      registered, and save the service again. A service that names no provider
#      cannot be deployed.
#
# Configuration (flags OR environment variables):
#   --dir <path>       / GITPAAS_DIR              Install directory. Default: /opt/gitpaas.
#   --env-file <path>  / GITPAAS_ENV_FILE         .env to read. Default: <dir>/iac/production/.env.
#   --api <url>        / GITPAAS_API_URL          API base URL. Default: http://localhost:3000/api/v1.
#   --email <email>    / GITPAAS_ADMIN_EMAIL      Administrator email (skips the prompt).
#   --password <pass>  / GITPAAS_ADMIN_PASSWORD   Administrator password (skips the prompt).
#   --name <name>      / GITPAAS_PROVIDER_NAME    Name of the created provider. Default: default.

set -e

# ---------------------------------------------------------------------------
# Constants + defaults
# ---------------------------------------------------------------------------
GITPAAS_DIR="${GITPAAS_DIR:-/opt/gitpaas}"
GITPAAS_ENV_FILE="${GITPAAS_ENV_FILE:-}"
GITPAAS_API_URL="${GITPAAS_API_URL:-http://localhost:3000/api/v1}"
GITPAAS_ADMIN_EMAIL="${GITPAAS_ADMIN_EMAIL:-}"
GITPAAS_ADMIN_PASSWORD="${GITPAAS_ADMIN_PASSWORD:-}"
GITPAAS_PROVIDER_NAME="${GITPAAS_PROVIDER_NAME:-default}"

PROVIDER_TYPE="github_app"

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
warn() { printf '%s[warn]%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
err()  { printf '%s[error]%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
die()  { err "$*"; exit 1; }

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

# A flag written as "--flag value" needs a second argument. Fail with a clear
# message instead of letting "shift 2" abort the script on its own.
require_value() {
    [ "$1" -ge 2 ] || die "$2 needs a value, e.g. $2 $3 (try --help)."
}

while [ $# -gt 0 ]; do
    case "$1" in
        --dir)          require_value $# --dir /opt/gitpaas; GITPAAS_DIR="$2"; shift 2 ;;
        --dir=*)        GITPAAS_DIR="${1#*=}"; shift ;;
        --env-file)     require_value $# --env-file /opt/gitpaas/iac/production/.env; GITPAAS_ENV_FILE="$2"; shift 2 ;;
        --env-file=*)   GITPAAS_ENV_FILE="${1#*=}"; shift ;;
        --api)          require_value $# --api http://localhost:3000/api/v1; GITPAAS_API_URL="$2"; shift 2 ;;
        --api=*)        GITPAAS_API_URL="${1#*=}"; shift ;;
        --email)        require_value $# --email admin@example.com; GITPAAS_ADMIN_EMAIL="$2"; shift 2 ;;
        --email=*)      GITPAAS_ADMIN_EMAIL="${1#*=}"; shift ;;
        --password)     require_value $# --password 's3cret'; GITPAAS_ADMIN_PASSWORD="$2"; shift 2 ;;
        --password=*)   GITPAAS_ADMIN_PASSWORD="${1#*=}"; shift ;;
        --name)         require_value $# --name default; GITPAAS_PROVIDER_NAME="$2"; shift 2 ;;
        --name=*)       GITPAAS_PROVIDER_NAME="${1#*=}"; shift ;;
        -h|--help)
            awk 'NR == 1 { next } /^#/ { print; next } { exit }' "$0" 2>/dev/null || true
            exit 0 ;;
        *) die "Unknown argument: $1 (try --help)" ;;
    esac
done

[ -n "$GITPAAS_ENV_FILE" ] || GITPAAS_ENV_FILE="$GITPAAS_DIR/iac/production/.env"

# Trim a trailing slash, so the joined paths never carry a double one.
GITPAAS_API_URL="${GITPAAS_API_URL%/}"

need() { command -v "$1" >/dev/null 2>&1 || die "Required command '$1' is not available."; }

need curl
need awk

# A literal newline, held in a variable so the parameter expansions below can cut
# the answer of curl on it (a command substitution eats trailing newlines).
NL="$(printf '\nx')"; NL="${NL%x}"

# ---------------------------------------------------------------------------
# A temporary file for the request bodies
# ---------------------------------------------------------------------------
# The private key must never appear in the process table, so it is never passed
# as an argument of curl. It goes into this file instead, which only its owner
# can read and which leaves the disk when the script exits, however it exits.
BODY_FILE="$(mktemp "${TMPDIR:-/tmp}/gitpaas-provider.XXXXXX")" \
    || die "Could not create a temporary file for the request body."
chmod 600 "$BODY_FILE"
cleanup() { rm -f "$BODY_FILE"; }
trap cleanup EXIT HUP INT TERM

# ---------------------------------------------------------------------------
# Reading the .env
# ---------------------------------------------------------------------------
# Read a single value out of the .env. It understands the three forms an
# operator writes a PEM in: KEY=value, KEY="value with \n escapes" and a quoted
# value that spans several lines.
env_value() {
    awk -v key="$1" '
        BEGIN { collecting = 0; single = sprintf("%c", 39) }

        collecting == 1 {
            if (index($0, quote) > 0) {
                sub(quote "[[:space:]]*$", "", $0)
                printf "%s", $0
                exit
            }
            printf "%s\n", $0
            next
        }

        index($0, key "=") == 1 {
            value = substr($0, length(key) + 2)
            first = substr(value, 1, 1)

            if (first == "\"" || first == single) {
                quote = first
                value = substr(value, 2)

                if (index(value, quote) > 0) {
                    sub(quote "[[:space:]]*$", "", value)
                    printf "%s", value
                    exit
                }

                collecting = 1
                printf "%s\n", value
                next
            }

            printf "%s", value
            exit
        }
    ' "$2"
}

# Turn the two-character sequence \n into a real newline, so a PEM written on one
# line and a PEM written across several lines end up as the same text.
unescape_newlines() { awk '{ gsub(/\\n/, "\n"); print }'; }

read_env() {
    [ -f "$GITPAAS_ENV_FILE" ] \
        || die "No .env found at $GITPAAS_ENV_FILE. Point at it with --env-file <path>, or at the install directory with --dir <path>."
    [ -r "$GITPAAS_ENV_FILE" ] \
        || die "$GITPAAS_ENV_FILE is not readable by this user. Re-run with sudo."

    log "Reading the GitHub App credentials from $GITPAAS_ENV_FILE ..."

    APP_ID="$(env_value GITHUB_APP_ID "$GITPAAS_ENV_FILE")"
    INSTALLATION_ID="$(env_value GITHUB_APP_INSTALLATION_ID "$GITPAAS_ENV_FILE")"
    PRIVATE_KEY="$(env_value GITHUB_APP_PRIVATE_KEY "$GITPAAS_ENV_FILE" | unescape_newlines)"

    [ -n "$APP_ID" ] \
        || die "GITHUB_APP_ID is missing or empty in $GITPAAS_ENV_FILE. There is nothing to import — register the provider in the Providers screen instead."
    [ -n "$INSTALLATION_ID" ] \
        || die "GITHUB_APP_INSTALLATION_ID is missing or empty in $GITPAAS_ENV_FILE. There is nothing to import — register the provider in the Providers screen instead."
    [ -n "$PRIVATE_KEY" ] \
        || die "GITHUB_APP_PRIVATE_KEY is missing or empty in $GITPAAS_ENV_FILE. There is nothing to import — register the provider in the Providers screen instead."

    case "$PRIVATE_KEY" in
        *'-----BEGIN'*'PRIVATE KEY-----'*) : ;;
        *) warn "GITHUB_APP_PRIVATE_KEY does not look like a PEM (no '-----BEGIN ... PRIVATE KEY-----' header). Sending it anyway." ;;
    esac

    log "GitHub App $APP_ID, installation $INSTALLATION_ID."
}

# ---------------------------------------------------------------------------
# Talking to the API
# ---------------------------------------------------------------------------
# Escape a value read from stdin so it can sit inside a JSON string: the
# backslash, the double quote, and every newline.
json_escape() {
    awk '
        BEGIN { ORS = "" }
        {
            gsub(/\\/, "\\\\")
            gsub(/"/, "\\\"")
            if (NR > 1) { printf "\\n" }
            printf "%s", $0
        }
    '
}

# POST the body held in $BODY_FILE, and split the answer into its status and its
# payload. The body never travels as an argument, so it stays out of `ps`.
api_post() {
    path="$1"
    auth_header="$2"

    if [ -n "$auth_header" ]; then
        raw="$(curl -sS -X POST "$GITPAAS_API_URL$path" \
            -H 'Content-Type: application/json' \
            -H "Authorization: Bearer $auth_header" \
            --data-binary "@$BODY_FILE" \
            -w '\n%{http_code}' 2>&1)" \
            || die "Could not reach the API at $GITPAAS_API_URL$path. Is the backend running? Point at it with --api <url>."
    else
        raw="$(curl -sS -X POST "$GITPAAS_API_URL$path" \
            -H 'Content-Type: application/json' \
            --data-binary "@$BODY_FILE" \
            -w '\n%{http_code}' 2>&1)" \
            || die "Could not reach the API at $GITPAAS_API_URL$path. Is the backend running? Point at it with --api <url>."
    fi

    HTTP_STATUS="${raw##*"$NL"}"
    HTTP_BODY="${raw%"$NL"*}"
}

# Pull one string field out of a JSON payload, without a JSON parser on the host.
json_field() {
    printf '%s' "$2" | awk -v field="$1" '
        BEGIN { RS = "\"" ; found = 0 }
        found == 1 && $0 ~ /^[[:space:]]*:[[:space:]]*$/ { found = 2; next }
        found == 2 { printf "%s", $0; exit }
        $0 == field { found = 1; next }
        { found = 0 }
    '
}

log_in() {
    if [ -z "$GITPAAS_ADMIN_EMAIL" ] && [ -r /dev/tty ]; then
        printf '%sAdmin email:%s ' "$C_BOLD" "$C_RESET" > /dev/tty
        read -r GITPAAS_ADMIN_EMAIL < /dev/tty
    fi
    [ -n "$GITPAAS_ADMIN_EMAIL" ] \
        || die "No administrator email provided (use --email <addr> or GITPAAS_ADMIN_EMAIL when running non-interactively)."

    if [ -z "$GITPAAS_ADMIN_PASSWORD" ] && [ -r /dev/tty ]; then
        printf '%sAdmin password:%s ' "$C_BOLD" "$C_RESET" > /dev/tty
        stty -echo < /dev/tty 2>/dev/null || true
        read -r GITPAAS_ADMIN_PASSWORD < /dev/tty
        stty echo < /dev/tty 2>/dev/null || true
        printf '\n' > /dev/tty
    fi
    [ -n "$GITPAAS_ADMIN_PASSWORD" ] \
        || die "No administrator password provided (use --password <pass> or GITPAAS_ADMIN_PASSWORD when running non-interactively)."

    log "Logging in as $GITPAAS_ADMIN_EMAIL ..."

    printf '{"email":"%s","password":"%s"}' \
        "$(printf '%s' "$GITPAAS_ADMIN_EMAIL" | json_escape)" \
        "$(printf '%s' "$GITPAAS_ADMIN_PASSWORD" | json_escape)" > "$BODY_FILE"

    api_post "/auth/login" ""

    case "$HTTP_STATUS" in
        200) : ;;
        401) die "The API refused those credentials (401). Only an administrator can register a provider." ;;
        429) die "The API is rate limiting the login (429). Wait a minute and re-run." ;;
        *)   die "The login failed with HTTP $HTTP_STATUS: $HTTP_BODY" ;;
    esac

    ACCESS_TOKEN="$(json_field accessToken "$HTTP_BODY")"
    [ -n "$ACCESS_TOKEN" ] || die "The login answered $HTTP_STATUS but carried no access token."
}

create_provider() {
    log "Creating the provider '$GITPAAS_PROVIDER_NAME' ..."

    {
        printf '{"name":"%s","type":"%s","appId":"%s","installationId":"%s","privateKey":"%s"}' \
            "$(printf '%s' "$GITPAAS_PROVIDER_NAME" | json_escape)" \
            "$PROVIDER_TYPE" \
            "$(printf '%s' "$APP_ID" | json_escape)" \
            "$(printf '%s' "$INSTALLATION_ID" | json_escape)" \
            "$(printf '%s' "$PRIVATE_KEY" | json_escape)"
    } > "$BODY_FILE"

    api_post "/providers" "$ACCESS_TOKEN"

    case "$HTTP_STATUS" in
        200|201) : ;;
        400) die "The API rejected the credentials (400). Check GITHUB_APP_ID and GITHUB_APP_INSTALLATION_ID, and that GITHUB_APP_PRIVATE_KEY holds the whole PEM." ;;
        401) die "The API refused the access token (401)." ;;
        403) die "That user is not an administrator (403). Only an administrator can register a provider." ;;
        409) die "A provider named '$GITPAAS_PROVIDER_NAME' already exists. Nothing was changed — pass --name <name> to import under another name." ;;
        *)   die "The creation of the provider failed with HTTP $HTTP_STATUS: $HTTP_BODY" ;;
    esac

    PROVIDER_ID="$(json_field id "$HTTP_BODY")"
    log "Provider '$GITPAAS_PROVIDER_NAME' created${PROVIDER_ID:+ (id $PROVIDER_ID)}."
}

# ---------------------------------------------------------------------------
# Final summary
# ---------------------------------------------------------------------------
print_summary() {
    printf '\n%s────────────────────────────────────────────────────────%s\n' "$C_GREEN$C_BOLD" "$C_RESET"
    printf '%s The GitHub App is now a provider.%s\n' "$C_GREEN$C_BOLD" "$C_RESET"
    printf '%s────────────────────────────────────────────────────────%s\n' "$C_GREEN$C_BOLD" "$C_RESET"
    printf '  Name : %s\n' "$GITPAAS_PROVIDER_NAME"
    printf '  App  : %s (installation %s)\n' "$APP_ID" "$INSTALLATION_ID"
    printf '\n'
    printf '  %sStill to do:%s\n' "$C_BOLD" "$C_RESET"
    printf '   * Open every service and save its "Provider" tab with this provider\n'
    printf '     selected, unless migration 011 already filled it in for you.\n'
    printf '   * Remove the three GITHUB_APP_* lines from %s.\n' "$GITPAAS_ENV_FILE"
    printf '%s────────────────────────────────────────────────────────%s\n\n' "$C_GREEN$C_BOLD" "$C_RESET"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    log "GitPaaS GitHub App import starting."

    read_env
    log_in
    create_provider
    print_summary
}

main
