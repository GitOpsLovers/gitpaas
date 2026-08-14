# OpenSpec adoption plan — to-do list

This plan adds the [OpenSpec](https://openspec.dev/) standard to the agent configuration of GitPaaS.

All the paths are relative to the root of the repository, if there is no other indication.

Items marked **(user)** need a human. The rules of the project forbid an agent to install a
dependency, and OpenSpec writes into `CLAUDE.md`, which the user must review.

Items marked **(decision)** wait for an answer in the [Open decisions](#open-decisions) section.

---

## Goal

Today the orchestrator repeats the goal, the scope and the acceptance criteria in every subagent
prompt, because a subagent starts with no conversation history. After this work, the orchestrator
passes one path. The subagent reads `openspec/changes/<change-id>/proposal.md`, `design.md` and
`tasks.md` from disk, and marks its own tasks as complete.

The specifications live in the repository, next to the code, under version control.

---

## Phase 0 — Preparation

- [x] **(user)** Install the CLI: `npm install -g @fission-ai/openspec@latest`.
- [x] **(user)** Verify the version with `rtk openspec --version`. Result: `1.9.0`.
- [x] **(user)** Confirm that the working tree is clean, so the change of `CLAUDE.md` is visible in the difference.
- [x] Keep the **core `opsx` profile**, which `openspec init` selects by default. Do not use the legacy `/openspec:*` commands.
- [x] Add `Bash(rtk openspec *)` to the `permissions.allow` list of `.claude/settings.json`.

## Phase 1 — Initialization

- [x] **(user)** Run `rtk openspec init` in the root of the repository. Command used: `rtk openspec init --tools claude --profile core --no-animation`.
- [x] Verify that the command created `openspec/specs/`, `openspec/changes/` and `openspec/archive/`. **Correction:** version 1.9.0 creates `openspec/specs/`, `openspec/changes/` and `openspec/changes/archive/`. The archive folder is inside `changes/`. The command also wrote `openspec/config.yaml` with the `spec-driven` schema.
- [x] Find where the command wrote the six `opsx` commands. Result: both paths carry them — `.claude/skills/openspec-*/SKILL.md` (six folders) and `.claude/commands/opsx/*.md` (six files).
- [x] Confirm that the six new skill names do not collide with the eleven skills already in `.claude/skills/`. Result: no collision. Every new name carries the `openspec-` prefix.
- [x] Review the managed block that the command appended to `CLAUDE.md`. **Correction:** the command wrote nothing into `CLAUDE.md`. The instructions live in the skill files instead. Phase 2 therefore owns every line that `CLAUDE.md` needs.
- [x] Add `openspec/archive/` to `.gitignore` only if the team decides not to keep the history. Result: the team keeps the history, so `.gitignore` stays as it is.
- [x] **(user)** Run `rtk openspec config set telemetry.enabled false` if the project forbids telemetry. Done.
- [ ] **(user)** Run `rtk openspec update` after any later version change, so the commands stay current. This item stays open, because it repeats at every version change.

## Phase 1b — The OpenSpec commands

OpenSpec ships its own workflow commands. They are the standard that this project adopts. Do not
write a local copy of any of them.

- [x] Read the six commands of the core profile, and confirm each one after `openspec init`. All six exist in `.claude/commands/opsx/`. Each one declares `allowed-tools: Bash(openspec:*)`.

| Command | Purpose | Who runs it |
|---|---|---|
| `/opsx:explore` | Investigate an idea, and clarify the requirements before any artifact exists | The user |
| `/opsx:propose` | Create the change folder and the planning artifacts in one step | The user |
| `/opsx:update` | Revise the artifacts of a change, and keep them coherent | The user |
| `/opsx:apply` | Implement the tasks of the change | The orchestrator |
| `/opsx:sync` | Merge the delta specifications into the main specifications | The orchestrator |
| `/opsx:archive` | Archive a completed change | The orchestrator |

- [x] Map each command onto the local subagents, and write the map into `CLAUDE.md`:
  - `/opsx:explore` and `/opsx:propose` run before any delegation. No subagent starts.
  - `/opsx:apply` does not implement alone. The orchestrator reads its task list, and it delegates each task to `implementer`, `refactorer` or `tester`.
  - `/opsx:sync` runs after the tests pass, and before `git-manager`.
  - `/opsx:archive` runs after the merge.

  Written into the new *The OpenSpec commands* section of `CLAUDE.md`, before the *Routing* section.
- [x] ~~**(user)** Run `/opsx:onboard` once, if the expanded profile is enabled, to learn the full loop.~~ Not applicable. The expanded profile stays off, and version 1.9.0 ships no `/opsx:onboard` command.
- [x] Record the decision not to enable the expanded profile (`/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify`, `/opsx:bulk-archive`). Recorded in `CLAUDE.md`. Version 1.9.0 installs none of these five commands.

## Phase 2 — The orchestrator rules

- [x] Add a **Specification stage** section to `CLAUDE.md`, before the *Routing* section. Added as *The specification stage*.
- [x] State the rule: for a task that changes behavior, the orchestrator creates or reads an OpenSpec change before it delegates.
- [x] State the exception: a bug fix, a pure refactor, a documentation edit and a configuration edit need no proposal.
- [x] State the stop: the orchestrator presents the proposal, and it waits for the approval of the user.
- [x] State that no subagent starts before the user approves the proposal.
- [x] Add a row to the routing table: *"Write a change proposal or a specification delta"* → the `/opsx:propose` command, and no subagent. The column header now reads *Subagent or command*.
- [x] Add a row to the routing table: *"Explore an unclear idea"* → the `/opsx:explore` command.
- [x] State the precedence: an `opsx` command owns the specification work, and the six local subagents own the code work. Phase 1b already wrote this line into the *The OpenSpec commands* section.
- [x] Extend the *Orchestration rules* section: every subagent prompt must name the change folder.
- [x] Extend the *Project-wide constraints* section: every `openspec` command carries the `rtk` prefix.
- [x] Update the *Git & GitHub workflow* section: the commit includes the specification delta.
- [x] **Added item.** State the override of `/opsx:apply`: the orchestrator delegates each task, and it never implements. The command file says the opposite, so the local rule must win.

## Phase 3 — The subagents

- [x] Add a first step to `.claude/agents/implementer.md`: read `proposal.md`, `design.md` and `tasks.md` of the change folder. Added as *The OpenSpec change (do this first)*.
- [x] Add a last step to the same file: mark the completed items in `tasks.md`. Added as *Mark the tasks (do this last)*.
- [x] Apply the same two steps to `.claude/agents/refactorer.md`.
- [x] Apply the same two steps to `.claude/agents/tester.md`, and derive the test cases from the scenarios of the specification. One test per `#### Scenario:`, named after it.
- [x] Update `.claude/agents/documenter.md`: the `docs/` pages describe the architecture, and `openspec/specs/` holds the requirements. Never duplicate one in the other. The agent must never write into `openspec/`.
- [x] Update `.claude/agents/architecture-analyst.md`: compare the code against the specifications, and report every deviation. The report gains a *Deviations from the specifications* section.
- [x] Update `.claude/agents/git-manager.md`: the Pull Request body links the proposal and lists the specification deltas. The agent also stages the change folder with the code.
- [x] Do not create a `spec-writer` subagent. The `/opsx:propose` command covers that work, and Phase 1b adopts it. No file was created.

## Phase 4 — The Git workflow skill

- [x] Add a *Specification delta* section to `.claude/skills/git-github-workflow/SKILL.md`. It holds five rules, a Pull Request template and an archive step.
- [x] State that `git add` includes `openspec/changes/<change-id>/` in the first commit of the branch. Step 2 of the *Standard sequence* points at the new section.
- [x] Propose the branch name from the change identifier, for example `feat/add-remember-me` from `add-remember-me`.
- [x] Add a line to the Pull Request template that names the change folder. A `## Change` section sits above `## Summary`, and it lists the specification deltas.
- [x] State the archive step: after the merge, the agent moves the change to `openspec/archive/`. **Correction:** the destination is `openspec/changes/archive/`, and the agent runs `rtk openspec archive <change-id>` instead of moving the folder by hand, because the command also updates the main specifications.
- [x] **Added item.** State that `/opsx:sync` can change `openspec/specs/`, so the agent stages those files too.
- [x] **Added item.** Forbid `git-manager` to edit any file of the change folder. It reads, stages and cites only.

## Phase 5 — The first specifications

The backfill covers the backend **and** the frontend. Write one capability at a time, and validate
each file before the next one.

### Backend

- [ ] List the capabilities of the backend from `docs/backend-business.md` and `apps/backend/src/features/`.
- [ ] Create `openspec/specs/auth/spec.md` from the authentication feature.
- [ ] Create `openspec/specs/users/spec.md` from the users feature.
- [ ] Create `openspec/specs/services/spec.md` from the services feature.
- [ ] Create `openspec/specs/deployments/spec.md` from the deployments feature.
- [ ] Create `openspec/specs/namespaces/spec.md` from the namespaces feature.
- [ ] Create `openspec/specs/source-control/spec.md` from the source-control feature.

### Frontend

- [ ] List the screens and the routes of the frontend from `docs/frontend-architecture.md`.
- [ ] Create one `openspec/specs/<screen>/spec.md` per screen, and name each folder after the route.
- [ ] Describe the behavior that the user sees: the fields, the validation, the states and the messages.
- [ ] Do not repeat a backend rule in a frontend specification. Link the backend capability instead.

### Both

- [ ] Write every requirement as `### Requirement:` with a `SHALL` sentence, and every case as `#### Scenario:` with `WHEN` and `THEN` lines.
- [ ] Write the specifications in English, because `docs/` is in English.
- [ ] Verify each file with `rtk openspec validate`.
- [ ] Split Phase 5 across several sessions, because the full backfill is large.

## Phase 6 — The existing roadmap plans

- [ ] Convert `docs/roadmap/source-control-providers-plan.md` into `openspec/changes/source-control-providers/proposal.md` and `design.md`.
- [ ] Convert `docs/roadmap/source-control-providers-plan-todo.md` into `openspec/changes/source-control-providers/tasks.md`.
- [ ] Convert `docs/roadmap/request-model-plan.md` and its to-do file in the same way.
- [ ] Write the specification delta of each change under `openspec/changes/<change-id>/specs/`.
- [ ] Delete the migrated files from `docs/roadmap/`, and leave a pointer in `docs/TODO.md`.
- [ ] Keep `docs/roadmap/deployment-roadmap.md` as a roadmap, because it plans no single change.

## Phase 7 — The trial run

- [ ] Choose one small feature, and run the full loop on it.
- [ ] **(user)** Run `/opsx:propose <the feature>`.
- [ ] **(user)** Review the proposal, the design and the task list, and approve them.
- [ ] Run `/opsx:apply`, and delegate each task to `implementer` with the change folder as the only context.
- [ ] Delegate the tests to `tester`, and check that the tests match the scenarios.
- [ ] Run `/opsx:sync` after the tests pass, so the delta enters the main specifications.
- [ ] Delegate the branch, the commit and the Pull Request to `git-manager`.
- [ ] Run `/opsx:archive` after the merge.
- [ ] Record every problem of the loop, and correct `CLAUDE.md` and the agent files.

## Phase 8 — The documentation

- [ ] Add an *Agent workflow* section to `CONTRIBUTING.md` that explains the OpenSpec loop.
- [ ] Add a *Specifications* section to `README.md` with a link to `openspec/specs/`.
- [ ] Add the relation between `docs/` and `openspec/` to `docs/monorepo-architecture.md`.
- [ ] Add a note to `docs/TODO.md` that points at this plan.

---

## Open decisions

### Answered

| # | Decision | Answer |
|---|---|---|
| 1 | The workflow profile | The core `opsx` profile, which is the default. The expanded profile stays off. |
| 2 | The approval of a proposal | The user approves before any subagent starts. |
| 3 | The depth of the backfill | The backend and the frontend, in full. |
| 4 | The plans of `docs/roadmap/` | Migrate the two active plans into OpenSpec changes. |
| 5 | The language of the specifications | English. |

| 6 | A dedicated `spec-writer` subagent | No. The `/opsx:propose` command of OpenSpec covers the work. |

### Open

None. Phase 0 can start.

---

## Risks

- `openspec init` writes into `CLAUDE.md`. Its managed block can conflict with the orchestrator rules. Review the difference before the commit.
- The `docs/` pages and the `openspec/specs/` files can describe the same behavior twice. Two sources of truth go out of step. Phase 3 sets the border.
- The current rules let the orchestrator run the full chain with no confirmation. Phase 2 adds the stop, and it changes the habit of the orchestrator.
- The full backfill of Phase 5 is large. Split it across several sessions, and validate each file as you write it.
- A specification that nobody reads goes out of step with the code. Phase 3 gives `architecture-analyst` the duty to report each deviation.
- The commands of OpenSpec and the six local subagents can claim the same work. Phase 1b and Phase 2 set the precedence: the commands own the specifications, and the subagents own the code.
- `openspec init` adds six skills to `.claude/skills/`, which already holds eleven. Check the names for a collision before the commit.
