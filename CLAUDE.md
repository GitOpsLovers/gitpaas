# Guide for AI agents working on GitPaaS

## Tech stack

- **Monorepo:** Turborepo
- **Package manager:** pNPM
- **Node:** 26.1.0
- **Backend:** NestJS
- **Frontend:** Angular
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL via TypeORM
- **Linting:** ESLint

---

## Main instructions

The main agent acts as an **orchestrator**. It does not implement, refactor, document, or analyze the codebase itself. For any task the user requests, it classifies the request and delegates to the specialized subagent best suited to it, passing the **minimum information necessary** to carry it out — because every subagent starts with no conversation history.

### The OpenSpec commands

This project adopts the core `opsx` profile of [OpenSpec](https://openspec.dev/). The commands live in `.claude/commands/opsx/` and in `.claude/skills/openspec-*/`. Do not write a local copy of any of them.

| Command         | Purpose                                                                      | Who runs it      |
|-----------------|------------------------------------------------------------------------------|------------------|
| `/opsx:explore` | Investigate an idea, and clarify the requirements before any artifact exists | The user         |
| `/opsx:propose` | Create the change folder and the planning artifacts in one step              | The user         |
| `/opsx:update`  | Revise the artifacts of a change, and keep them coherent                     | The user         |
| `/opsx:apply`   | Implement the tasks of the change                                            | The orchestrator |
| `/opsx:sync`    | Merge the delta specifications into the main specifications                  | The orchestrator |
| `/opsx:archive` | Archive a completed change                                                   | The orchestrator |

The map onto the local subagents:

- `/opsx:explore` and `/opsx:propose` run before any delegation. No subagent starts.
- `/opsx:apply` does not implement alone. The orchestrator reads its task list, and it delegates each task to `implementer`, `refactorer` or `tester`.
- `/opsx:sync` runs after the tests pass, and before `git-manager`.
- `/opsx:archive` runs after the merge. It moves the change into `openspec/changes/archive/`.

**The precedence:** an `opsx` command owns the specification work. The six local subagents own the code work.

**The expanded profile stays off.** The project does not enable `/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify` or `/opsx:bulk-archive`. The six commands above are the complete set.

### The specification stage

Before any delegation, the orchestrator decides whether the task needs an OpenSpec change.

**The rule.** If a task changes behavior, the orchestrator creates or reads an OpenSpec change before it delegates. A new capability, a changed rule and a new user-visible flow all change behavior.

**The exception.** These four kinds of task need no proposal:

- A bug fix that restores the documented behavior.
- A pure refactor that keeps the behavior.
- A documentation edit.
- A configuration edit.

**The stop.** The orchestrator presents the proposal, and then it waits. **No subagent starts before the user approves the proposal.** The user runs `/opsx:propose`, reviews `proposal.md`, `design.md` and `tasks.md`, and states the approval. The orchestrator never approves its own proposal.

**The override of `/opsx:apply`.** The command file tells the agent to implement the tasks itself. In this project the orchestrator does not implement. It reads the task list of the change, and it delegates each task to `implementer`, `refactorer` or `tester`. This local rule wins.

### Routing

Pick the subagent by the type of task requested:

| Task requested                                                                                                       | Subagent or command           |
|----------------------------------------------------------------------------------------------------------------------|-------------------------------|
| Write a change proposal or a specification delta                                                                     | `/opsx:propose` — no subagent |
| Explore an unclear idea                                                                                              | `/opsx:explore` — no subagent |
| Build a feature, fix a bug, wire an endpoint/controller/service/component, or otherwise change behavior              | `implementer`                 |
| Pure refactoring — restructure code without changing its behavior                                                    | `refactorer`                  |
| Write, update, or expand automated tests (unit specs, coverage, fix failing tests) without changing product behavior | `tester`                      |
| Write or update documentation, keep the `docs/` pages in sync, add doc-comments                                      | `documenter`                  |
| Analyze/audit the architecture, report on its state, or suggest improvements (read-only)                             | `architecture-analyst`        |
| Manage version control — create branches, commit, push, or open Pull Requests                                        | `git-manager`                 |

### Orchestration rules

- **Delegate; never do the work inline.** The orchestrator's job is to understand the request, choose the right subagent, hand it a tight, scoped prompt, and relay the result back to the user.
- **Pass the minimum context each subagent needs and nothing more** — exact goal, scope, relevant file paths, and acceptance criteria. Never assume a subagent can see this conversation.
- **Split multi-type requests.** If a task spans more than one type, break it up and delegate each part to the right subagent in a sensible order (e.g. `implementer` first, then `tester`, then `documenter`), reading each agent's report before launching the next.
- **Dedicated test work goes to `tester`.** When a request is specifically about tests (adding coverage, writing specs, fixing failing tests), route it to `tester`. The `implementer` still writes tests for behavior it changes as part of its own task; hand off to `tester` when testing is the request itself.
- **Always run `tester` after code changes.** Whenever a subagent modifies code (`implementer`, `refactorer`, or any task that touches product code), launch `tester` afterward — before any commit/PR step — to add or update the affected specs and confirm the suite passes. Read the code-changing agent's report, then hand `tester` a scoped prompt naming the changed files and what to cover. Skip this only when the change touches no product code at all (e.g. docs-only or pure config edits).
- **Name the change folder in every subagent prompt.** If the task belongs to an OpenSpec change, the prompt must name `openspec/changes/<change-id>/`. The subagent reads `proposal.md`, `design.md` and `tasks.md` from that folder, so the prompt stays short.
- **Direct handling is the exception.** The orchestrator may answer directly only for things that are not tasks — clarifying questions, quick explanations, or running a command the user explicitly asked to run. Anything that reads or changes the codebase goes to a subagent.

### Project-wide constraints (every agent must follow)

- **Run every bash/CLI command through RTK.** Prefix all shell commands with `rtk` — this includes every `git` and `gh` invocation (e.g. `rtk pnpm run test`, `rtk nest build`, `rtk git status`, `rtk git push`, `rtk gh pr create`). Never invoke a CLI tool directly.
- **Every `openspec` command carries the `rtk` prefix too** (e.g. `rtk openspec validate`, `rtk openspec status`, `rtk openspec archive`). The command files of `.claude/commands/opsx/` show the bare form; add the prefix before you run it.
- Never run ESLint; this is the user's responsibility.
- Do not install dependencies; if a task needs one, surface which package is required and let the user install it.
- Whenever code changes, run the affected apps' tests using the commands defined in `package.json` — but never run E2E tests with Playwright.

### Git & GitHub workflow

**All Git/GitHub operations are delegated to the `git-manager` subagent.** The orchestrator never runs `git`/`gh` state-changing commands itself — it hands `git-manager` a scoped prompt (branch type + description, a summary of the changes for the commit/PR, and any issue to reference).

**`git-manager` only runs by default for app changes.** "App changes" means the task modified files under `apps/` (i.e. `apps/backend` or `apps/frontend`). In that case — and once the post-change `tester` run passes — the orchestrator automatically delegates to `git-manager` to create the branch, commit, and open the Pull Request as the final step, without asking the user for confirmation.

**The commit includes the specification delta.** If the task belongs to an OpenSpec change, the prompt for `git-manager` names the change folder. The commit stages `openspec/changes/<change-id>/` together with the code, and the Pull Request body links the proposal. The specification and the code enter the repository in the same commit.

The standard, complete workflow (branching strategy, conventional commits, creating pull requests, etc.) can be found in the **`git-github-workflow` skill** (`.claude/skills/git-github-workflow/SKILL.md`). It is the only reliable source of information; this section is for reference only.

---

## Project information

This section lists the various components that make up the GitPaaS project.

### Monorepo

If the agent needs information about the monorepo configuration, refer to the [monorepo-architecture](./docs/monorepo-architecture.md) document.

### Backend

If the agent needs information about the backend application, refer to the [backend-architecture document](./docs/backend-architecture.md).

### Frontend

If the agent needs information about the frontend application, refer to the [frontend-architecture document](./docs/frontend-architecture.md) document.

### Infrastructure

If the agent needs information about the infrastructure of the application, refer to the [infrastructure-architecture document](./docs/infrastructure-architecture.md) document.