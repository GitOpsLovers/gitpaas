# Guide for AI agents working on GitPaaS

## Read the part that applies to you

You are one of two kinds of agent. Find your kind, and read the sections that it names.

| You are | You read |
|---|---|
| **The orchestrator** — the main agent, in conversation with the user | Everything. |
| **A subagent** — you were launched with a prompt, and you have no conversation history | Section 1, section 4, section 5 and section 6. Skip section 2 and section 3, because you never delegate and you never choose an agent. |

---

## 1. The stack

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

## 2. The workflow, from a request to a merge

The orchestrator does not implement, refactor, document or analyze the code. It classifies the request, it delegates, and it relays the result. A change delivers one phase at a time, so these eight steps run in order, and steps 4 to 7 repeat, one time for each phase of the change.

| Step | Who acts         | What happens                                                                                     |
|------|------------------|--------------------------------------------------------------------------------------------------|
| 1    | The orchestrator | Classify the request.                                                                            |
| 2    | The orchestrator | Decide whether the request needs a specification.                                                |
| 3    | The user         | Run `/opsx:propose`, and approve the plan.                                                       |
| 4    | The orchestrator | Group the tasks of a phase, and delegate each group.                                             |
| 5    | The subagents    | Build, and mark their own tasks.                                                                 |
| 6    | The orchestrator | Run `tester` one time, for the phase.                                                            |
| 7    | The orchestrator | Delegate to `git-manager` for the phase. Run `/opsx:sync` first, and only before the last phase. |
| 8    | The orchestrator | Run `/opsx:archive` after the merge of the last phase.                                           |

### Step 1 — Classify the request

Decide what kind of work the request asks for. Section 3 gives the agent for each kind.

A request that is not a task needs no agent. A clarifying question, a short explanation, and a command that the user asked you to run all get a direct answer.

### Step 2 — Decide whether the request needs a specification

**The rule.** If the request changes behavior, an OpenSpec change comes before any delegation. A new capability, a changed rule and a new user-visible flow all change behavior.

**The four exceptions.** These need no proposal, and they go straight to step 4:

- A bug fix that restores the documented behavior.
- A pure refactor that keeps the behavior.
- A documentation edit.
- A configuration edit.

### Step 3 — The plan, and the stop

The user runs `/opsx:propose`. It writes four things into `openspec/changes/<change-id>/`:

| File          | It holds                                                                                               |
|---------------|--------------------------------------------------------------------------------------------------------|
| `specs/`      | What the system must do: `### Requirement:` with `SHALL`, and `#### Scenario:` with `WHEN` and `THEN`. |
| `proposal.md` | Why the change exists.                                                                                 |
| `design.md`   | The technical decisions.                                                                               |
| `tasks.md`    | The steps to build it.                                                                                 |

**Then the orchestrator stops and waits.** No subagent starts before the user approves the plan. The orchestrator never approves its own proposal.

### Step 4 — Group the tasks, and delegate

`/opsx:apply` reads the task list. **In this project it does not implement.** The command file says the agent implements the tasks itself; this local rule wins, and the orchestrator delegates instead.

`/opsx:propose` wrote `tasks.md` with no knowledge of these six subagents, so it grouped the tasks by feature area. The orchestrator regroups them for delegation. Section 4 gives the rules of the grouping and of the prompt.

### Step 5 — The subagents build

Each subagent works alone, and then it marks its own tasks. Section 5 gives its rules.

### Step 6 — One test run per phase

After the last code task of a phase, `tester` runs one time, and before the commit of that phase. It derives its cases from the `#### Scenario:` lines of the specification that the phase covers.

Skip this step when the phase touches no product code.

### Step 7 — Sync once, commit each phase

A change delivers one phase at a time. After each phase that changed a file under `apps/`, and after the tests of that phase pass, `git-manager` creates the branch, the commit and the Pull Request of that phase. The orchestrator delegates to it as the final step of the phase, and it asks the user for no confirmation.

One phase gives one branch and one Pull Request. The Pull Request carries a title alone, so the subject of the commit states which phase the delivery covers.

`/opsx:sync` runs one time alone, before the commit of the last phase, and it merges the delta specifications into the main specifications. It never runs for an intermediate phase.

### Step 8 — Archive

`/opsx:archive` runs after the merge of the last Pull Request. It moves the change into `openspec/changes/archive/`.

---

## 3. Which agent takes the work

The description of each subagent states its own triggers, and those descriptions load with this file. So pick by the type of the task, and read the description when the choice is close.

| The task                                                              | The agent                                                 |
|-----------------------------------------------------------------------|-----------------------------------------------------------|
| A feature, a bug fix, a new endpoint or component; any change of behavior | `implementer`                                         |
| A restructure that keeps the behavior                                     | `refactorer`                                          |
| A test, when a test is the request itself                                 | `tester`                                              |
| A document, a `docs/` page, a doc-comment                                 | `documenter`                                          |
| An audit or a report. It reads, and it never writes code                  | `architecture-analyst`                                |
| A branch, a commit, a push, a Pull Request                                | `git-manager`                                         |
| A proposal, a specification delta, or an unclear idea                     | `/opsx:propose`, `/opsx:explore`. No subagent starts. |

**The precedence.** An `opsx` command owns the specification work. The six subagents own the code work.

---

## 4. The rules of the orchestrator

### How to group the tasks

- **Group by agent type and by file area, and send one call per group.** A subagent starts cold: it loads this file, it loads its own file, and it reads the change folder again. Ten calls pay that price ten times. A change of ten tasks makes three or four calls.
- **Split a group for a real reason alone.** Two groups touch the same file, or the second group needs the report of the first. Two groups that touch different areas run in parallel, in one message.
- **A test task inside a numbered section stays in the group of that section.** A line such as "Write the unit tests of that comparison" belongs to the agent that builds the behavior of that section. Do not split a section to send one line to `tester`.
- **Dedicated test work goes to `tester`.** Route to `tester` when a test is the request itself. The `implementer` still writes the tests for the behavior that it changes.
- **When a request spans more than one type, split it, and order the parts.** Usually `implementer`, then `tester`, then `documenter`. Read each report before you launch the next part.

### How to write the prompt

- **Name the path; never paste the content.** Give file paths, symbol names and line numbers. Do not carry the text of a file, a diff or a log. A pasted file costs the tokens two times: one time in your prompt, and one time when the subagent reads the file anyway.
- **Name the change folder.** If the task belongs to an OpenSpec change, the prompt names `openspec/changes/<change-id>/`. The subagent reads the three files itself, so the prompt stays short.
- **Give the goal, the scope, the paths and the acceptance criteria, and nothing more.** A subagent never sees this conversation.

### When you may act alone

- **Delegate the work; do not do it inline.** Anything that reads or changes the codebase goes to a subagent.
- **The floor of the delegation.** A cold start loads more text than a small edit holds. So you may edit directly when the change meets all three conditions: it is under about 10 lines; it holds no judgment about the architecture; and you already read the file in this conversation. A `model` line, a configuration value and a check box meet the three conditions. Prose that states a rule does not, and product code never does.
- **Never run a `git` or `gh` command that changes state.** `git-manager` owns those.

---

## 5. The rules of every agent

### The commands

- **Prefix every shell command with `rtk`.** This includes `git`, `gh` and `openspec` (`rtk pnpm run test`, `rtk nest build`, `rtk git status`, `rtk openspec validate`). The files of `.claude/commands/opsx/` show the bare form; add the prefix before you run it. Never invoke a CLI tool directly.
- **Never run ESLint.** That is the user's responsibility.
- **Ask the `LSP` tool about a symbol, and `Grep` about a text.** `findReferences`, `goToDefinition`, `goToImplementation` and `hover` give an exact answer, and `Grep` gives a guess. `LSP` is not a shell command, so it takes no `rtk` prefix.
- **Look before you write a helper, a type or a utility.** Search the codebase for one that already does the job, and call it. Mirroring the shape of a sibling file is not reuse; calling its existing symbol is.
- **Do not install dependencies.** Name the package that a task needs, and let the user install it.
- **When code changes, run the tests of the affected app**, with the commands of `package.json`. Never run E2E tests, and never use Playwright.

### The limits of a subagent

- A subagent never spawns another subagent.
- A subagent never commits, never pushes and never opens a Pull Request, unless its prompt says to. Only `git-manager` runs these operations.

### The change folder

When a prompt names `openspec/changes/<change-id>/`, read `proposal.md`, `design.md` and `tasks.md` before you start. These files carry the context, so the prompt stays short. If a file is absent, continue with the prompt alone, and say so in your report.

After your checks pass, edit `tasks.md`. Change `- [ ]` into `- [x]` for your own completed tasks alone. A task that you completed in part keeps an empty box. Explain the remainder in your report.

### The report

End with a short summary. Name what you did, what you verified with the result, and the follow-ups, or "none". Your final message is the only thing that returns to the caller, so write data and not chatter.

---

## 6. Where to read more

| The subject | The document |
|---|---|
| The monorepo | [monorepo-architecture](./docs/monorepo-architecture.md) |
| The backend | [backend-architecture](./docs/backend-architecture.md) |
| The frontend | [frontend-architecture](./docs/frontend-architecture.md) |
| The infrastructure | [infrastructure-architecture](./docs/infrastructure-architecture.md) |
| The Git and GitHub workflow | The `git-github-workflow` skill (`.claude/skills/git-github-workflow/SKILL.md`). It is the authority; the steps above are the summary. |

**OpenSpec.** This project adopts the core `opsx` profile of [OpenSpec](https://openspec.dev/). The commands live in `.claude/commands/opsx/`, and you must not write a local copy of any of them. The expanded profile stays off: the project does not enable `/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify` or `/opsx:bulk-archive`.
