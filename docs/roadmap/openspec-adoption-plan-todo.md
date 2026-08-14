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

- [x] List the capabilities of the backend from `docs/backend-business.md` and `apps/backend/src/features/`. The folder holds **eleven** features: `authentication`, `containers`, `deployments`, `logs`, `namespaces`, `networks`, `projects`, `server`, `services`, `source-control` and `users`. The six below cover six of them. **Five features carry no specification yet:** `projects`, `logs`, `containers`, `networks` and `server`. See the new *Backend — the remaining features* list.
- [x] Create `openspec/specs/auth/spec.md` from the authentication feature. 9 requirements.
- [x] Create `openspec/specs/users/spec.md` from the users feature. 4 requirements.
- [x] Create `openspec/specs/services/spec.md` from the services feature. 6 requirements.
- [x] Create `openspec/specs/deployments/spec.md` from the deployments feature. 11 requirements.
- [x] Create `openspec/specs/namespaces/spec.md` from the namespaces feature. 6 requirements.
- [x] Create `openspec/specs/source-control/spec.md` from the source-control feature. 6 requirements.

#### Backend — the remaining features

The plan named six capabilities, but the backend holds eleven features. These five complete the backfill
of the backend:

- [x] Create `openspec/specs/projects/spec.md` from the projects feature. 8 requirements.
- [x] Create `openspec/specs/logs/spec.md` from the logs feature (the two tiers, the SSE stream and the archive). 8 requirements.
- [x] Create `openspec/specs/server/spec.md` from the server feature (the cleanup of the resources and the readiness probe). 4 requirements.
- [x] Create `openspec/specs/containers/spec.md` from the containers feature. 3 requirements.
- [x] Create `openspec/specs/networks/spec.md` from the networks feature. 3 requirements.

The backfill of the backend is complete. `rtk openspec validate --all` reports 11 passed, 0 failed.

### Frontend

- [x] List the screens and the routes of the frontend from `docs/frontend-architecture.md`. Source: `apps/frontend/src/app/app.routes.ts`. The application declares **13 screens**.
- [x] Create one `openspec/specs/<screen>/spec.md` per screen, and name each folder after the route. **Correction:** three route names collide with a backend capability (`namespaces`, `projects`, `server`), and `openspec/specs/` is one flat name space. Every frontend folder therefore carries the prefix `web-`. **Two capabilities are not screens:** `web-session` and `web-shell` hold the behavior that crosses every screen, which no single screen could own.
- [x] Describe the behavior that the user sees: the fields, the validation, the states and the messages.
- [x] Do not repeat a backend rule in a frontend specification. Link the backend capability instead.

The 15 frontend capabilities:

| Capability | Route |
|---|---|
| `web-session` | (crosses every screen) |
| `web-shell` | (crosses every screen) |
| `web-signin` | `/signin` |
| `web-dashboard` | `/dashboard` |
| `web-server` | `/server` |
| `web-namespaces-list` | `/namespaces` |
| `web-namespace-add` | `/namespaces/add` |
| `web-namespace-edit` | `/namespaces/edit/:id` |
| `web-projects-list` | `/namespaces/:namespaceId/projects` |
| `web-project-add` | `…/projects/add` |
| `web-project-edit` | `…/projects/edit/:id` |
| `web-project-detail` | `…/projects/:id` |
| `web-service-add` | `…/projects/:id/services/add` |
| `web-service-edit` | `…/services/edit/:serviceId` |
| `web-service-detail` | `…/services/:serviceId/:tab` |

### Both

- [x] Write every requirement as `### Requirement:` with a `SHALL` sentence, and every case as `#### Scenario:` with `WHEN` and `THEN` lines. Checked across the 26 files: **128 requirements** and **268 scenarios**. Each requirement carries a `SHALL` sentence, each scenario carries a `WHEN` line and a `THEN` line, each file carries the title, the `## Purpose` section and the `## Requirements` section, and no file carries a delta operation header. One requirement of `web-namespaces-list` was missing its `SHALL`; it is corrected.
- [x] Write the specifications in English, because `docs/` is in English. Checked across the 26 files. No file holds a word of another language.
- [x] Verify each file with `rtk openspec validate`. `rtk openspec validate --all` reports **26 passed, 0 failed** — 11 backend capabilities and 15 frontend capabilities. The command needs `--type spec` for a single capability, because a change carries the same name space.
- [x] Split Phase 5 across several sessions, because the full backfill is large. Done in three sessions: the six backend capabilities of the plan, the five remaining backend features, and the frontend.

**Phase 5 is complete.**

## Phase 6 — The existing roadmap plans

- [x] Convert `docs/roadmap/source-control-providers-plan.md` into `openspec/changes/source-control-providers/proposal.md` and `design.md`.
- [x] Convert `docs/roadmap/source-control-providers-plan-todo.md` into `openspec/changes/source-control-providers/tasks.md`. 8 groups, 63 tasks.
- [x] Convert `docs/roadmap/request-model-plan.md` and its to-do file in the same way. 9 groups, 60 tasks. Groups 8 and 9 hold the open decisions and the records that the plan left behind, which the to-do file kept in two separate sections.
- [x] Write the specification delta of each change under `openspec/changes/<change-id>/specs/`. `source-control-providers` carries 8 delta files, and `request-model` carries 4.
- [x] Delete the migrated files from `docs/roadmap/`, and leave a pointer in `docs/TODO.md`. The pointer names the two change folders, and it says that the full text of the four documents stays in the history of Git at the commit `287d58f`.
- [x] Keep `docs/roadmap/deployment-roadmap.md` as a roadmap, because it plans no single change. Unchanged.

**Phase 6 is complete.** `rtk openspec validate --all` reports 28 passed, 0 failed — 26 capabilities and 2 changes.

Two corrections that the migration found:

1. The plan of the providers puts the select of the provider in `service-form`. That component holds only
   the name of the service. The fields of the source control live in `service-provider`, which the tab
   "Provider" of the detail of a service shows. Task 7.1 of the change records this.
2. A `MODIFIED` requirement of a delta must repeat every scenario that the main specification still holds,
   by its name. A requirement that a change replaces in full belongs under `## REMOVED Requirements`, with a
   new requirement beside it. The delta of `source-control` uses that form.

## Phase 7 — The trial run

- [x] Choose one small feature, and run the full loop on it. **Chosen: the health panel of the server.** The screen `/server` shows the readiness and the state of the Docker daemon, above the maintenance. The backend already gives `GET /api/v1/server/readiness` and `GET /api/v1/server/status`, so the work touches the frontend only. It needs no migration and no change of the backend, and it closes a gap that the capability `web-server` records today.
- [x] **(user)** Run `/opsx:propose <the feature>`. The change is `openspec/changes/server-health-panel/`. The four artifacts validate.
- [x] **(user)** Review the proposal, the design and the task list, and approve them. The user approved by running `/opsx:apply`.
- [x] Run `/opsx:apply`, and delegate each task to `implementer` with the change folder as the only context. 18 tasks, groups 1 to 4 to `implementer`. The build passes.
- [x] Delegate the tests to `tester`, and check that the tests match the scenarios. Group 5. 4 files of specifications, 31 tests, one per scenario and named after it. The suite gives 26 files and 192 tests.
- [ ] Run `/opsx:sync` after the tests pass, so the delta enters the main specifications. **Not done on purpose.** The user chose not to commit. A sync before the branch exists puts a behavior into the main specification that only the working tree holds, and Phase 4 puts the sync and the code into one commit.
- [ ] Delegate the branch, the commit and the Pull Request to `git-manager`. **Blocked.** The user chose not to commit.
- [ ] Run `/opsx:archive` after the merge. **Blocked.** It needs a merge.
- [x] Record every problem of the loop, and correct `CLAUDE.md` and the agent files. Four problems, below. None of them needs a correction of `CLAUDE.md` or of an agent file; the reasons are with each one.

**Phase 7 is not complete.** The loop ran from the proposal to the tests that pass. The three steps of the
Git workflow wait for a decision to commit. The state of the working tree holds the whole change.

### The problems of the loop

1. **The loop cannot run unattended, and this is by design.** Steps 2, 3 and the merge need a human. The
   orchestrator stops at the proposal, and it stops again at the merge, because the skill of the Git
   workflow never merges. An agent that runs the whole phase alone would break two rules that Phase 2 and
   Phase 4 wrote on purpose. **No correction.** The stops are the point.

2. **A plan cannot see the shape of an answer that a filter wraps.** The design said that the body of a
   `503` carries the result of the readiness. The true body nests that result under `details`, because
   `AllExceptionsFilter` wraps the exception. Only the running code showed this. The `implementer` accepted
   the two shapes and reported the reason. **No correction of a rule.** This is the normal limit of a
   plan, and the agent handled it the right way: it widened the code, and it said so. The change
   `request-model` removes the class of the problem, because the shape enters the shared package and the
   compiler reads it.

3. **A task that names "the two pure functions" gave three.** Task 5.1 counts the functions of the group 2,
   and the `implementer` wrote a third helper that reads the body of an error. The `tester` covered the
   three, and it did not stop to ask. **No correction.** A count in a task is a guide, and not a limit. A
   rule that made the count binding would have blocked useful work.

4. **The delegation loses the report of one agent to the next.** The `tester` found an asymmetry: the
   mapping of the readiness unwraps `details`, and the mapping of the daemon does not. It reported the
   asymmetry, and correctly changed no product code, because its rules forbid that. The orchestrator then
   held a finding that belonged to the `implementer`, and the task list held no item for it. **No
   correction of a file.** The rules behaved correctly: `tester` reports and does not fix, and the
   orchestrator does not widen a scope by itself. The finding goes to the user, who decides. This is the
   one place where the loop needs a human that the plan did not name.

### The state of the trial

The working tree holds the change: `apps/frontend` carries the panel and its specifications, and
`openspec/changes/server-health-panel/tasks.md` marks 18 of 18 tasks. Nothing is committed, and the delta is
not synced. To finish Phase 7, run `/opsx:sync`, then let `git-manager` open the Pull Request, then run
`/opsx:archive` after the merge.

**One open question for the user.** The mapping of the daemon does not unwrap `details`, and the mapping of
the readiness does. A `503` whose envelope carries the information of the daemon under `details` therefore
reads as "not reachable". The behavior agrees with `design.md`, and it will confuse the next reader. Decide
if this branch makes the two symmetric.

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
