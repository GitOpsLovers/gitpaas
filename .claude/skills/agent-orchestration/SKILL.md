---
name: agent-orchestration
description: The workflow of the orchestrator of GitPaaS, from a request to a merge. Use it when you classify a request, when you decide whether a change needs an OpenSpec proposal, when you group the tasks of a phase, when you choose the subagent that takes the work, or when you write the prompt of a delegation. Only the orchestrator uses this skill; a subagent never delegates.
---

# The orchestration of the agents of GitPaaS

This skill holds the workflow of the orchestrator. `CLAUDE.md` holds the stack, the rules of every
agent, and the map of the documents.

## 1. The workflow, from a request to a merge

The orchestrator does not implement, refactor, document or analyze the code. It classifies the request, it delegates, and it relays the result. A change delivers one phase at a time, so these eight steps run in order, and steps 4 to 7 repeat, one time for each phase of the change.

| Step | Who acts         | What happens                                                                                     |
|------|------------------|--------------------------------------------------------------------------------------------------|
| 1    | The orchestrator | Classify the request.                                                                            |
| 2    | The orchestrator | Decide whether the request needs a specification.                                                |
| 3    | The user         | Run `/opsx:propose`, and approve the plan.                                                       |
| 4    | The orchestrator | Group the tasks of a phase, and delegate each group.                                             |
| 5    | The subagents    | Build, and mark their own tasks.                                                                 |
| 6    | The orchestrator | Run `tester` one time, for the phase.                                                            |
| 7    | The orchestrator | Delegate to `git-manager`, which opens the Pull Request. Run `/opsx:sync` first, and only before the last phase. |
| 8    | The orchestrator | Run `/opsx:archive` after the merge of the last phase.                                           |

### Step 1 — Classify the request

Decide what kind of work the request asks for. Section 2 of this skill gives the agent for each kind.

A request that is not a task needs no agent. A clarifying question, a short explanation, and a command that the user asked you to run all get a direct answer.

### Step 2 — Decide whether the request needs a specification

**The rule.** If the request changes behavior, an OpenSpec change comes before any delegation. A new capability, a changed rule and a new user-visible flow all change behavior.

**The four exceptions.** These need no proposal, and they go straight to step 4:

- A bug fix that restores the documented behavior.
- A pure refactor that keeps the behavior.
- A documentation edit.
- A configuration edit.

These four skip step 3, and they carry no phase. They still end at step 7, with a Pull Request.

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

**Never run `/opsx:apply`.** The command tells the agent to implement the tasks itself, and in this project the orchestrator implements nothing. The command file holds 8 kB, and this rule then cancels its main instruction, so the call is a pure loss.

Read `openspec/changes/<change-id>/tasks.md` directly, and delegate. Each numbered section is one phase, and its first line names the agent and the paths, because `openspec/config.yaml` asks `/opsx:propose` for that shape. If the head of a section names no agent, group the tasks yourself with the rules of section 3 of this skill.

The other four `opsx` commands stay in the workflow: `/opsx:propose`, `/opsx:update`, `/opsx:sync` and `/opsx:archive`.

### Step 5 — The subagents build

Each subagent works alone, and then it marks its own tasks. Section 2 of `CLAUDE.md` gives its rules.

### Step 6 — One test run per phase

After the last code task of a phase, `tester` runs one time, and before the commit of that phase. It derives its cases from the `#### Scenario:` lines of the specification that the phase covers.

Skip this step when the phase touches no product code.

### Step 7 — Sync once, deliver each phase

**Every phase ends with a Pull Request.** A change delivers one phase at a time. After the checks of a phase pass, `git-manager` creates the branch, the commit, the push and the Pull Request of that phase. The orchestrator delegates to it as the final step of the phase, and it asks the user for no confirmation.

The rule covers each phase that changed a file of the repository, and not the phases of `apps/` alone. A phase of `docs/`, of `iac/` or of `openspec/` ends the same way. A phase that changed no file ends with the report alone. A task that carries no change folder ends here too, because the four exceptions of step 2 deliver the same way.

One phase gives one branch and one Pull Request. The Pull Request carries a title alone, so the subject of the commit states which phase the delivery covers.

`/opsx:sync` runs one time alone, before the commit of the last phase, and it merges the delta specifications into the main specifications. It never runs for an intermediate phase.

### Step 8 — Archive

`/opsx:archive` runs after the merge of the last Pull Request. It moves the change into `openspec/changes/archive/`.

---

## 2. Which agent takes the work

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

## 3. The rules of the orchestrator

### How to group the tasks

- **Group by agent type and by file area, and send one call per group.** A subagent starts cold: it loads this file, it loads its own file, and it reads the change folder again. Ten calls pay that price ten times. A change of ten tasks makes three or four calls.
- **Split a group for a real reason alone.** Two groups touch the same file, or the second group needs the report of the first. Two groups that touch different areas run in parallel, in one message.
- **A test task inside a numbered section stays in the group of that section.** A line such as "Write the unit tests of that comparison" belongs to the agent that builds the behavior of that section. Do not split a section to send one line to `tester`.
- **Dedicated test work goes to `tester`.** Route to `tester` when a test is the request itself. The `implementer` still writes the tests for the behavior that it changes.
- **The border between the two.** `implementer` writes the test of the unit that it builds: the use case, the service, the controller, the repository. It runs that suite, and it reports the count. `tester` writes the test of the scenario of the specification: it reads the `#### Scenario:` lines of the delta, and it covers a case that no unit test of the phase covers. Name that border in both prompts, so the two agents write no test two times. If a scenario already has its test from the phase, `tester` says so in its report, and it writes none.
- **When a request spans more than one type, split it, and order the parts.** Usually `implementer`, then `tester`, then `documenter`. Read each report before you launch the next part.

### How to write the prompt

- **Name the path; never paste the content.** Give file paths, symbol names and line numbers. Do not carry the text of a file, a diff or a log. A pasted file costs the tokens two times: one time in your prompt, and one time when the subagent reads the file anyway.
- **Name the change folder.** If the task belongs to an OpenSpec change, the prompt names `openspec/changes/<change-id>/`. The subagent reads the three files itself, so the prompt stays short.
- **Give the goal, the scope, the paths and the acceptance criteria, and nothing more.** A subagent never sees this conversation.

**The template.** Every prompt takes this shape. Leave out a line that holds nothing; add no line.

```text
Change: openspec/changes/<change-id>/          (leave out if the task carries no change)
Phase:  <n> — <the subject of the section>     (leave out if the task carries no phase)

Goal
<One sentence. What the code must do after your work.>

Tasks
<n>.1 <the line of tasks.md, copied>
<n>.2 <the line of tasks.md, copied>

Paths
<the files or the folders that you may change>

Out of scope
<the neighbouring area that you must not touch, if one exists>

Done when
- <the check that proves the work, with the command that runs it>
- You marked your own boxes in tasks.md.
```

The lines of the tasks are the one thing that you copy. Everything else in the change folder stays a
path, because the subagent reads the folder itself.

### When you may act alone

- **Delegate the work; do not do it inline.** Anything that reads or changes the codebase goes to a subagent.
- **The floor of the delegation.** A cold start loads more text than a small edit holds. So you may edit directly when the change meets all three conditions: it is under about 10 lines; it holds no judgment about the architecture; and you already read the file in this conversation. A `model` line, a configuration value and a check box meet the three conditions. Prose that states a rule does not, and product code never does.
- **Never run a `git` or `gh` command that changes state.** `git-manager` owns those, and step 7 sends every task to it.

### When a subagent reports a block

A subagent stops and reports. It does not guess. Read the report, and take one of these four roads.
**Never send the same prompt again.** A cold start with the same text gives the same block, and it
costs the same tokens.

| The report says | You do |
|---|---|
| A task is unclear, or it holds two readings | Ask the user the one question. Then delegate again, with the answer inside the prompt. |
| A task needs a decision about the architecture | Ask the user. If the decision changes the plan, run `/opsx:update` before you delegate again. |
| The specification and the code disagree | Stop the phase. The plan is wrong, and the code is not. Run `/opsx:update`. |
| A package is missing | Name the package to the user, and wait. No agent installs a dependency. |

A task that stays open keeps an empty box in `tasks.md`. Deliver every other task of the phase, and
name the open box to the user. Never mark a box that a subagent did not close.
