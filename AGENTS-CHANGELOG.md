# The changelog of the agents

This file records each change of the configuration of the AI of GitPaaS: `CLAUDE.md`, `.claude/`, `docs/agent-rules.md`, and `openspec/config.yaml`. It follows the style of
[Keep a Changelog](https://keepachangelog.com/).

A human writes the reason of each entry. The script `scripts/agents-metrics.sh` gives the numbers of each entry; no entry invents a number.

## [Unreleased]

### 2026-08-23 - Give the documentation of the AI its own area
**Scope:** `docs/agents-architecture.md`, `docs/agents-architecture/operations.md`, `docs/monorepo-architecture/operations.md`, `.claude/skills/project-documentation/SKILL.md`, `CLAUDE.md`
**Why:** the section "The metrics of the configuration of the agents" lived inside `docs/monorepo-architecture/operations.md`, but it does not describe the monorepo. This entry moves it into a new area, `docs/agents-architecture`, with the shape of the four areas that already existed, and it updates the map of the skill `project-documentation` and the table of `CLAUDE.md` to name the new area.
**Static context:** ~4,273 tokens (model `claude-opus-5`, estimate), against ~4,234 tokens of the baseline entry: a rise of ~39 tokens, ~0.92%.
**On-demand:** ~54,000 tokens (model `claude-opus-5`, estimate), against ~52,873 tokens of the baseline entry: a rise of ~1,127 tokens, ~2.13%.
**Observed:** branch `docs/agent-changelog-phase-2`: 10 turns, 1,684,887 cache-read tokens, cache hit 0.99
**Risk:** every number of this entry is an estimate of 3.7 characters per token, for the reason that the entry of the baseline states.

### 2026-08-23 - Add the measurement of the tokens of the agents
**Scope:** `scripts/agents-metrics.sh`, `docs/agent-changelog-plan.md`, `AGENTS-CHANGELOG.md`
**Why:** the project changed `CLAUDE.md`, a skill or an agent many times, and no record stated what a change tried to improve, or whether it improved it. This entry opens the changelog, and it records the baseline of the configuration of today.
**Static context:** ~4,234 tokens (model `claude-opus-5`, estimate)
**On-demand:** ~52,873 tokens (model `claude-opus-5`, estimate)
**Observed:** branch `feat/agents-metrics-phase-1`: 46 turns, 6,300,158 cache-read tokens, cache hit 0.95 (baseline; no prior branch to compare)
**Risk:** every number of this entry is an estimate of 3.7 characters per token. The key of this repository holds no credit for the endpoint `count_tokens`, so the script answers
`400 invalid_request_error`, "Your credit balance is too low", and the flag `--estimate` gives the only report until an account holds credit.
