#!/bin/sh
#
# The metrics of the configuration of the agents of GitPaaS.
#
# It measures the static cost of the tokens of the files that load on every session,
# the on-demand cost of the bodies that load when an agent opens them,
# and the observed cost of the past sessions of Claude Code.
#
#   sh scripts/agents-metrics.sh <command> [options]
#
# Commands:
#   static                 the tokens that load always, and the tokens that load on demand
#   sessions               the observed tokens of the transcripts, per branch
#   entry                  the block of Markdown of AGENTS-CHANGELOG.md
#
# Options:
#   --estimate             send no request; divide the characters by 3.7, and prefix each number with ~
#   --branch <name>        keep the turns of one branch (sessions)
#   --since <ISO date>     keep the turns from a date (sessions)
#
# The count of the tokens calls the endpoint count_tokens of the API of Anthropic, over curl.
# The credential ANTHROPIC_API_KEY comes from the environment, and .dev/.env fills the gap;
# a variable of the environment always wins over the file. The script installs no dependency;
# it needs curl, jq, awk and git alone.

set -e

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MODEL="claude-opus-5"
API_URL="https://api.anthropic.com/v1/messages/count_tokens"
API_VERSION="2023-06-01"
ENV_FILE=".dev/.env"
ENV_VARIABLE="ANTHROPIC_API_KEY"
CHARACTERS_PER_TOKEN="3.7"
PROJECT_SLUG="-Users-mcfdez-Desarrollo-GitOpsLovers-gitpaas"

TRANSCRIPTS_DIR="$HOME/.claude/projects/$PROJECT_SLUG"
MEMORY_FILE="$TRANSCRIPTS_DIR/memory/MEMORY.md"

TAB="$(printf '\t')"

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
mkdir -p "$SCRATCH/content"
COUNTER=0

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
print_usage() {
    cat <<EOF
usage: sh scripts/agents-metrics.sh <command> [options]

commands:
  static                 the tokens that load always, and the tokens that load on demand
  sessions               the observed tokens of the transcripts, per branch
  entry                  the block of Markdown of AGENTS-CHANGELOG.md

options:
  --estimate             send no request; divide the characters by $CHARACTERS_PER_TOKEN, and prefix each number with ~
  --branch <name>        keep the turns of one branch (sessions)
  --since <ISO date>     keep the turns from a date (sessions)
EOF
}

COMMAND="${1:-}"
if [ $# -ge 1 ]; then shift; fi

ESTIMATE=0
BRANCH=""
SINCE=""

while [ $# -gt 0 ]; do
    case "$1" in
        --estimate)
            ESTIMATE=1
            shift
            ;;
        --branch)
            if [ $# -ge 2 ]; then BRANCH="$2"; shift 2; else shift; fi
            ;;
        --since)
            if [ $# -ge 2 ]; then SINCE="$2"; shift 2; else shift; fi
            ;;
        *)
            shift
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------

# The text of an agent or a skill that loads on every session: its name and
# its description alone, read out of the top-level keys of its frontmatter.
frontmatter_fields() {
    awk '
    NR == 1 {
        line = $0; sub(/\r$/, "", line)
        if (line == "---") { infm = 1; next }
        else { exit }
    }
    infm {
        line = $0; sub(/\r$/, "", line)
        if (line == "---") { infm = 0; exit }
        if (line ~ /^[ \t]*$/) next
        if (line ~ /^[ \t]/) next
        if (line ~ /^#/) next
        idx = index(line, ":")
        if (idx == 0) next
        key = substr(line, 1, idx - 1)
        gsub(/^[ \t]+|[ \t]+$/, "", key)
        val = substr(line, idx + 1)
        gsub(/^[ \t]+|[ \t]+$/, "", val)
        if (length(val) >= 2) {
            first = substr(val, 1, 1); last = substr(val, length(val), 1)
            if ((first == "\042" || first == "\047") && (last == "\042" || last == "\047")) {
                val = substr(val, 2, length(val) - 2)
            }
        }
        if (key == "name" && val != "") name = val
        if (key == "description" && val != "") desc = val
    }
    END { printf "name: %s\ndescription: %s", name, desc }
    ' "$1"
}

# The body of a file of Markdown, after its frontmatter of YAML.
# A file without frontmatter gives the whole text back.
strip_frontmatter_body() {
    awk '
    NR == 1 {
        line = $0; sub(/\r$/, "", line)
        if (line == "---") { infm = 1; next }
    }
    infm {
        line = $0; sub(/\r$/, "", line)
        if (line == "---") { infm = 0; next }
        next
    }
    { print }
    ' "$1"
}

# Round a number, and group it by thousands with a comma.
comma_format() {
    awk -v n="$1" 'BEGIN {
        n = int(n + 0.5)
        s = n ""
        out = ""
        len = length(s)
        for (i = 1; i <= len; i++) {
            out = out substr(s, i, 1)
            remain = len - i
            if (remain > 0 && remain % 3 == 0) out = out ","
        }
        print out
    }'
}

format_number() {
    value="$1"; estimate="$2"
    formatted="$(comma_format "$value")"
    if [ "$estimate" = "1" ]; then
        printf '~%s' "$formatted"
    else
        printf '%s' "$formatted"
    fi
}

format_ratio() {
    awk -v v="$1" 'BEGIN { printf "%.2f", v }'
}

# Render an aligned table of text. A column of numbers aligns to the right.
# $1 holds the columns, as "header:align,header:align,...", align is L or R.
# The rows come on stdin, one row per line, the fields separated by a tab.
format_table() {
    awk -F'\t' -v hdrs="$1" '
    BEGIN {
        n = split(hdrs, defs, ",")
        for (i = 1; i <= n; i++) {
            split(defs[i], parts, ":")
            headers[i] = parts[1]
            aligns[i] = parts[2]
            widths[i] = length(headers[i])
        }
        rows = 0
    }
    {
        rows++
        for (i = 1; i <= n; i++) {
            data[rows, i] = $i
            if (length($i) > widths[i]) widths[i] = length($i)
        }
    }
    function pad(cell, width, align,    result, j) {
        result = cell
        for (j = length(cell); j < width; j++) {
            if (align == "R") result = " " result
            else result = result " "
        }
        return result
    }
    function render(cells,    line, i) {
        line = ""
        for (i = 1; i <= n; i++) {
            line = line (i > 1 ? "  " : "") pad(cells[i], widths[i], aligns[i])
        }
        gsub(/[ \t]+$/, "", line)
        return line
    }
    END {
        for (i = 1; i <= n; i++) headline[i] = headers[i]
        print render(headline)
        for (i = 1; i <= n; i++) { sep = ""; for (j = 0; j < widths[i]; j++) sep = sep "-"; sepline[i] = sep }
        print render(sepline)
        for (r = 1; r <= rows; r++) {
            for (i = 1; i <= n; i++) rowline[i] = data[r, i]
            print render(rowline)
        }
    }
    '
}

# ---------------------------------------------------------------------------
# The input and the output
# ---------------------------------------------------------------------------

# Append a source to a manifest, unless the file is absent or blank.
add_source() {
    manifest="$1"; label="$2"; srcfile="$3"
    [ -s "$srcfile" ] || return 0
    if ! grep -q '[^[:space:]]' "$srcfile"; then return 0; fi
    COUNTER=$((COUNTER + 1))
    dest="$SCRATCH/content/$COUNTER"
    cp "$srcfile" "$dest"
    printf '%s\t%s\n' "$dest" "$label" >> "$manifest"
}

# The sources that load before the first word of the user.
collect_static_sources() {
    manifest="$1"
    : > "$manifest"

    if [ -f "$REPO_ROOT/CLAUDE.md" ]; then
        add_source "$manifest" "CLAUDE.md" "$REPO_ROOT/CLAUDE.md"
    fi
    if [ -f "$REPO_ROOT/.claude/output-styles/asd-ste100.md" ]; then
        add_source "$manifest" ".claude/output-styles/asd-ste100.md" "$REPO_ROOT/.claude/output-styles/asd-ste100.md"
    fi
    if [ -f "$REPO_ROOT/.claude/settings.json" ]; then
        add_source "$manifest" ".claude/settings.json" "$REPO_ROOT/.claude/settings.json"
    fi
    if [ -f "$MEMORY_FILE" ]; then
        add_source "$manifest" "memory/MEMORY.md" "$MEMORY_FILE"
    fi

    find "$REPO_ROOT/.claude/agents" -type f -name '*.md' 2>/dev/null | sort > "$SCRATCH/agents.list" || true
    while IFS= read -r path; do
        [ -n "$path" ] || continue
        frontmatter_fields "$path" > "$SCRATCH/tmp_fm"
        name="$(basename "$path" .md)"
        add_source "$manifest" "agent $name (frontmatter)" "$SCRATCH/tmp_fm"
    done < "$SCRATCH/agents.list"

    find "$REPO_ROOT/.claude/skills" -type f -name 'SKILL.md' 2>/dev/null | sort > "$SCRATCH/skills.list" || true
    while IFS= read -r path; do
        [ -n "$path" ] || continue
        frontmatter_fields "$path" > "$SCRATCH/tmp_fm"
        name="$(basename "$(dirname "$path")")"
        add_source "$manifest" "skill $name (frontmatter)" "$SCRATCH/tmp_fm"
    done < "$SCRATCH/skills.list"
}

# The sources that load when an agent opens them.
collect_on_demand_sources() {
    manifest="$1"
    : > "$manifest"

    find "$REPO_ROOT/.claude/skills" -type f -name 'SKILL.md' 2>/dev/null | sort > "$SCRATCH/skills.list" || true
    while IFS= read -r path; do
        [ -n "$path" ] || continue
        strip_frontmatter_body "$path" > "$SCRATCH/tmp_body"
        name="$(basename "$(dirname "$path")")"
        add_source "$manifest" "skill $name (body)" "$SCRATCH/tmp_body"
    done < "$SCRATCH/skills.list"

    find "$REPO_ROOT/docs" -type f -name '*.md' 2>/dev/null | sort > "$SCRATCH/docs.list" || true
    while IFS= read -r path; do
        [ -n "$path" ] || continue
        label="${path#"$REPO_ROOT"/}"
        add_source "$manifest" "$label" "$path"
    done < "$SCRATCH/docs.list"
}

resolve_api_key() {
    if [ -n "$ANTHROPIC_API_KEY" ]; then
        API_KEY="$ANTHROPIC_API_KEY"
        return 0
    fi
    if [ -f "$REPO_ROOT/$ENV_FILE" ]; then
        val="$(grep -m1 "^${ENV_VARIABLE}=" "$REPO_ROOT/$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
        if [ -n "$val" ]; then
            API_KEY="$val"
            return 0
        fi
    fi
    return 1
}

fail_without_key() {
    echo "No token count is possible without an API key of Anthropic." >&2
    echo "Write the variable $ENV_VARIABLE into the file $ENV_FILE of the root of the repository," >&2
    echo "or export it in the shell. Run the command with --estimate to skip the network." >&2
}

count_tokens() {
    contentfile="$1"
    if [ "$ESTIMATE" = "1" ]; then
        chars="$(LC_ALL=en_US.UTF-8 wc -m < "$contentfile" 2>/dev/null | tr -d ' ')"
        [ -n "$chars" ] || chars="$(wc -m < "$contentfile" | tr -d ' ')"
        awk -v c="$chars" -v cpt="$CHARACTERS_PER_TOKEN" 'BEGIN { printf "%d", (c / cpt) + 0.5 }'
    else
        body="$(jq -n --arg model "$MODEL" --rawfile text "$contentfile" '{model: $model, messages: [{role: "user", content: $text}]}')"
        response="$(curl -sS -w '\n%{http_code}' "$API_URL" \
            -H 'content-type: application/json' \
            -H "anthropic-version: $API_VERSION" \
            -H "x-api-key: $API_KEY" \
            -d "$body")"
        status="$(printf '%s\n' "$response" | tail -n1)"
        payload="$(printf '%s\n' "$response" | sed '$d')"
        if [ "$status" != "200" ]; then
            echo "count_tokens answered $status: $payload" >&2
            exit 1
        fi
        printf '%s' "$payload" | jq -r '.input_tokens // 0'
    fi
}

print_section() {
    title="$1"; manifest="$2"; estimate="$3"; totalfile="$4"
    rows="$SCRATCH/rows_$$_${title}"
    : > "$rows"
    total=0
    while IFS="$TAB" read -r contentfile label; do
        [ -n "$contentfile" ] || continue
        tokens="$(count_tokens "$contentfile")"
        # count_tokens exits its own subshell without printing on a failed request,
        # so an empty capture here means the call failed; stop instead of reporting zeros.
        [ -n "$tokens" ] || return 1
        total=$((total + tokens))
        formatted="$(format_number "$tokens" "$estimate")"
        printf '%s\t%s\n' "$label" "$formatted" >> "$rows"
    done < "$manifest"

    printf '\n%s\n\n' "$title"
    format_table "file:L,tokens:R" < "$rows"
    printf '\ntotal %s: %s tokens (model %s)\n' "$title" "$(format_number "$total" "$estimate")" "$MODEL"
    echo "$total" > "$totalfile"
}

# ---------------------------------------------------------------------------
# The commands
# ---------------------------------------------------------------------------

run_static() {
    if [ "$ESTIMATE" != "1" ]; then
        if ! resolve_api_key; then
            fail_without_key
            return 1
        fi
    fi

    static_manifest="$SCRATCH/static.manifest"
    ondemand_manifest="$SCRATCH/ondemand.manifest"
    collect_static_sources "$static_manifest"
    collect_on_demand_sources "$ondemand_manifest"

    if ! print_section "always loaded" "$static_manifest" "$ESTIMATE" "$SCRATCH/static_total"; then return 1; fi
    if ! print_section "on-demand" "$ondemand_manifest" "$ESTIMATE" "$SCRATCH/ondemand_total"; then return 1; fi

    STATIC_TOTAL="$(cat "$SCRATCH/static_total")"
    ONDEMAND_TOTAL="$(cat "$SCRATCH/ondemand_total")"
    return 0
}

run_sessions() {
    if [ ! -d "$TRANSCRIPTS_DIR" ]; then
        echo "No transcript exists under $TRANSCRIPTS_DIR." >&2
        return 1
    fi

    find "$TRANSCRIPTS_DIR" -maxdepth 1 -type f -name '*.jsonl' 2>/dev/null | sort > "$SCRATCH/transcripts.list" || true
    count="$(wc -l < "$SCRATCH/transcripts.list" | tr -d ' ')"

    : > "$SCRATCH/all.jsonl"
    while IFS= read -r path; do
        [ -n "$path" ] || continue
        cat "$path" >> "$SCRATCH/all.jsonl"
    done < "$SCRATCH/transcripts.list"

    jq -R 'try fromjson catch empty' "$SCRATCH/all.jsonl" \
        | jq -c --arg branch "$BRANCH" --arg since "$SINCE" '
            select(.type == "assistant" and (.message.usage != null))
            | select($branch == "" or .gitBranch == $branch)
            | select($since == "" or ((.timestamp // "") >= $since))
        ' > "$SCRATCH/filtered.jsonl"

    jq -s -r '
        def branch_of: (.gitBranch // "") as $b | if $b == "" then "(no branch)" else $b end;
        def usage_row(records):
            {
                turns: (records | length),
                sidechainTurns: ([records[] | select(.isSidechain == true)] | length),
                inputTokens: ([records[] | (.message.usage.input_tokens // 0)] | add // 0),
                outputTokens: ([records[] | (.message.usage.output_tokens // 0)] | add // 0),
                cacheReadTokens: ([records[] | (.message.usage.cache_read_input_tokens // 0)] | add // 0),
                cacheCreationTokens: ([records[] | (.message.usage.cache_creation_input_tokens // 0)] | add // 0),
            };
        . as $records
        | ($records | group_by(branch_of) | map({branch: (.[0] | branch_of)} + usage_row(.))
            | sort_by(-(.cacheReadTokens + .inputTokens))) as $branches
        | ({branch: "ALL"} + usage_row($records)) as $total
        | ($branches + [$total])[]
        | [
            .branch,
            .turns,
            .inputTokens,
            .outputTokens,
            .cacheReadTokens,
            .cacheCreationTokens,
            (if (.cacheReadTokens + .cacheCreationTokens + .inputTokens) == 0 then 0
             else (.cacheReadTokens / (.cacheReadTokens + .cacheCreationTokens + .inputTokens)) end),
            (if .turns == 0 then 0 else (.sidechainTurns / .turns) end)
          ]
        | @tsv
    ' "$SCRATCH/filtered.jsonl" > "$SCRATCH/sessions.tsv"

    : > "$SCRATCH/sessions_fmt.tsv"
    while IFS="$TAB" read -r branch turns input output cread cwrite ratio side; do
        [ -n "$branch" ] || continue
        printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
            "$branch" \
            "$(comma_format "$turns")" \
            "$(comma_format "$input")" \
            "$(comma_format "$output")" \
            "$(comma_format "$cread")" \
            "$(comma_format "$cwrite")" \
            "$(format_ratio "$ratio")" \
            "$(format_ratio "$side")" \
            >> "$SCRATCH/sessions_fmt.tsv"
    done < "$SCRATCH/sessions.tsv"

    header="sessions of $count transcripts"
    if [ -n "$BRANCH" ]; then header="$header, branch $BRANCH"; fi
    if [ -n "$SINCE" ]; then header="$header, since $SINCE"; fi

    printf '\n%s\n\n' "$header"
    format_table "branch:L,turns:R,input:R,output:R,cache read:R,cache write:R,cache ratio:R,subagents:R" < "$SCRATCH/sessions_fmt.tsv"
}

run_entry() {
    if ! run_static; then return 1; fi

    mark=""
    if [ "$ESTIMATE" = "1" ]; then mark="~"; fi
    today="$(date +%Y-%m-%d)"

    printf '\n--- the entry of AGENTS-CHANGELOG.md ---\n\n'
    echo "### $today - <the title of the change>"
    echo '**Scope:** `<the files that changed>`'
    echo '**Why:** <the reason of the change>'
    echo "**Static context:** <before> -> ${mark}$(comma_format "$STATIC_TOTAL") tokens (model $MODEL)"
    echo "**On-demand:** <before> -> ${mark}$(comma_format "$ONDEMAND_TOTAL") tokens"
    echo '**Observed:** branch `<name>`: <before> -> <after>, cache hit <before> -> <after>'
    echo '**Risk:** <the risk of the change, or none>'
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
case "$COMMAND" in
    static)
        run_static
        exit $?
        ;;
    sessions)
        run_sessions
        exit $?
        ;;
    entry)
        run_entry
        exit $?
        ;;
    *)
        print_usage
        if [ -n "$COMMAND" ]; then exit 1; else exit 0; fi
        ;;
esac
