#!/usr/bin/env bash
# PreToolUse hook on Bash.
# Section 2 of CLAUDE.md: every shell command carries the prefix `rtk`.
# `rtk` is a CLI proxy that filters and compacts the output before it reaches
# the context. A bare call wastes the tokens that the prefix would save.
#
# This hook denies a command whose first word is a tool that `rtk` wraps.
# It stays silent for a plain file utility, so it never blocks ordinary work.

set -uo pipefail

payload=$(cat)
cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0

# The tools that rtk wraps, and that this project uses.
wrapped='git|gh|glab|pnpm|npm|npx|node|nest|ng|turbo|tsc|jest|vitest|playwright|docker|kubectl|psql|openspec|eslint|prettier|curl|wget|cargo|pytest|ruff|mypy'

offender=""
# Read each segment of a compound command.
while IFS= read -r segment || [ -n "$segment" ]; do
  # Drop the leading blanks, the environment assignments and the `sudo`.
  segment=$(printf '%s' "$segment" | sed -E 's/^[[:space:]]+//; s/^([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]+[[:space:]]+)+//; s/^sudo[[:space:]]+//')
  first=${segment%%[[:space:]]*}
  case "$first" in
    rtk|"") continue ;;
  esac
  if printf '%s' "$first" | grep -Eq "^($wrapped)$"; then
    offender="$first"
    break
  fi
done < <(printf '%s' "$cmd" | tr '\n;|&' '\n\n\n\n')

[ -z "$offender" ] && exit 0

jq -n --arg tool "$offender" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ("Section 2 of CLAUDE.md: prefix every shell command with `rtk`. Run `rtk " + $tool + " ...` instead of `" + $tool + " ...`. rtk compacts the output, so the bare call costs more tokens.")
  }
}'
exit 0
