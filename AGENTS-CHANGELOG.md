# The changelog of the agents

This file records each change of the configuration of the AI of GitPaaS: `CLAUDE.md`, `.claude/`, and `openspec/config.yaml`. It follows the style of
[Keep a Changelog](https://keepachangelog.com/).

A human writes the reason of each entry. The script `scripts/agents-metrics.sh` gives the numbers of each entry; no entry invents a number.

## [Unreleased]

### 2026-08-23 - Move the card of the rules out of the documentation
**Scope:** `docs/agent-rules.md` → `.claude/rules/agent-rules.md`, `CLAUDE.md`, `.claude/agents/` (five files), `.claude/skills/project-documentation/SKILL.md`, `openspec/config.yaml`, `.github/workflows/pr-agents-changelog.yml`, `scripts/agents-metrics.sh`, `docs/agents-architecture/operations.md`
**Why:** `docs/` holds the documentation of a person, in five blocks of one subject each. The card of the rules is not documentation: no tool loads it, no person searches it, and six configuration files order an agent to read it. It was the one working file of an agent inside `docs/`, and its name made the reader expect rules about the agents. `.claude/rules/` gives it a typed folder beside the agents and the skills that name it, so the whole input of an agent lives under one root.
**Static context:** ~4,391 tokens (model `claude-opus-5`, estimate), against ~4,396 tokens of the entry above: a fall of ~5 tokens, ~0.11%. The rule of the changelog in `CLAUDE.md` names three paths now, and not four, because `.claude/` already covers the card. The card stays out of the static cost: `.claude/rules/` is no folder that Claude Code loads, so an agent opens the card by its path, exactly as before.
**On-demand:** ~51,701 tokens (model `claude-opus-5`, estimate), against ~51,600 tokens of the entry above: a rise of ~101 tokens, ~0.20%. The move itself costs nothing, because the card holds ~1,038 tokens in either place. The rise is the paragraph that entered the skill `project-documentation`, which orders an agent to correct the card when it changes one of the four pages that the card summarizes.
**Observed:** branch `main`: 5,554 turns, 541,478,949 cache-read tokens, cache hit 0.97. This work carries no branch of its own, so the figure covers every session of `main` and measures no part of this change.
**Risk:** the card is a summary of `structure.md` and of `conventions.md` of the two applications, and it now sits outside the sight of a person who edits those four pages. The paragraph of the skill is the only guard against that drift; a change of one of the four pages that skips the card leaves two statements that disagree. `scripts/agents-metrics.sh` reads `.claude/rules/` now, so the card stays inside the on-demand column. Every number of this entry is an estimate of 3.7 characters per token, for the reason that the entry of the baseline states.

### 2026-08-23 - Remove the folder of the business of the backend
**Scope:** `.claude/skills/project-documentation/SKILL.md`, `docs/backend-architecture/key-flows.md`, `docs/frontend-architecture/key-flows.md`, `docs/backend-business/` (deleted)
**Why:** `docs/backend-business/` held five pages, and `docs/backend-architecture/key-flows.md` already described the same subjects in more detail: the queue, the log store, the authentication, the roles, the capabilities of Docker and the credentials of a provider. An agent that read one folder alone read a partial answer, and one of the two copies went stale — the note "the role restrictions are not enforced yet" was already false, because `RolesGuard` closes the write routes of `providers`. This entry merges the facts that only the old folder held into the sections of `key-flows.md` that own them, deletes the folder, and removes the paragraph of the sixth folder from the map of the skill `project-documentation`.
**Static context:** ~4,396 tokens (model `claude-opus-5`, estimate), against ~4,396 tokens of the entry above: no change. The skill lost one paragraph and gained one of the same size, and the static cost counts the frontmatter of a skill and not its body.
**On-demand:** ~51,600 tokens (model `claude-opus-5`, estimate), against ~54,113 tokens of the entry above: a fall of ~2,513 tokens, ~4.64%. The files of this entry hold ~1,838 of that fall: they held ~14,662 tokens and now hold ~12,824, ~12.53% less, because the merge dropped the text that the two copies repeated. The remaining ~675 tokens come from other work that is in the same tree and carries its own entry.
**Observed:** branch `main`: 5,554 turns, 541,478,949 cache-read tokens, cache hit 0.97. This work carries no branch of its own, so the figure covers every session of `main` and measures no part of this change.
**Risk:** two archived task lists still name `docs/backend-business.md` (`openspec/changes/archive/2026-08-15-source-control-providers/tasks.md`, lines 140 and 141). They record what the project did on that day, so this entry leaves them. The two open changes that named the folder now name `docs/backend-architecture/key-flows.md`. Every number of this entry is an estimate of 3.7 characters per token, for the reason that the entry of the baseline states.

### 2026-08-23 - Make the rule of the changelog real, and check it in CI
**Scope:** `.github/workflows/pr-agents-changelog.yml`, `CLAUDE.md`, `docs/agents-architecture/operations.md`, `docs/agent-changelog-plan.md`
**Why:** `AGENTS-CHANGELOG.md` held its entries by hand alone, and no rule of `CLAUDE.md` asked an agent to write one. This entry adds that rule to section 2, and it adds the workflow `pr-agents-changelog` that fails a Pull Request that changes `CLAUDE.md`, `.claude/`, `docs/agent-rules.md` or `openspec/config.yaml` and leaves `AGENTS-CHANGELOG.md` untouched. The plan of `docs/agent-changelog-plan.md` stays: it holds the record of the design and of the options that the plan refused; its workflow lives in `docs/agents-architecture/operations.md`.
**Static context:** ~4,396 tokens (model `claude-opus-5`, estimate), against ~4,273 tokens of the entry above: a rise of ~123 tokens, ~2.88%. The rule of the changelog is one line of `CLAUDE.md`, and `CLAUDE.md` loads on every session; that line holds ~90 of the ~123 tokens, and the index of the memory holds the rest.
**On-demand:** ~54,113 tokens (model `claude-opus-5`, estimate), against ~54,000 tokens of the entry above: a rise of ~113 tokens, ~0.21%. The paragraph of the workflow entered `docs/agents-architecture/operations.md`, and `docs/agent-changelog-plan.md` stays in place, so its ~2,343 tokens still count on demand.
**Observed:** branch `docs/agent-changelog-phase-2`: 16 turns, 2,729,653 cache-read tokens, cache hit 0.99
**Risk:** the workflow reads the list of the changed files of the Pull Request, so a change of the configuration that lands on `main` outside a Pull Request carries no entry. Every number of this entry is an estimate of 3.7 characters per token, for the reason that the entry of the baseline states.

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
