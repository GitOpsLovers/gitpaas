---
name: agent-orchestration
description: The workflow of the orchestrator of GitPaaS, from a request to a Pull Request. Use it when you route a request, when you run the cycle of the specification-driven development (research, plan, implement), when you group the tasks of a phase, when you choose the subagent that takes the work, or when you write the prompt of a delegation. Only the orchestrator uses this skill; a subagent never delegates.
---

# The orchestration of the agents of GitPaaS

This skill holds the workflow of the orchestrator. `CLAUDE.md` holds the stack and the rules of
every agent. `docs/architecture.md` holds the map of the architecture.

**Every task ends with a Pull Request.** A task that changes no file of the repository ends with
the report alone.

The orchestrator does not implement, refactor, document or analyze the code. It routes the request,
it delegates, and it relays the result.

---

## 1. Route the request

Every request takes one of two roads. Decide the road first, and say which one you took.

### The direct road

Delegate at once, with no cycle. Take this road when the request is one of these:

- A question, an explanation, or a command that the user asked you to run. These need no agent at
  all; answer them yourself.
- A documentation edit, or a configuration edit.
- A test that the user asked for.
- A refactor that keeps the behavior.
- A bug fix that restores the behavior that `docs/business/` already states.

A task of the direct road ends at step 4 of the cycle, with a Pull Request.

### The cycle

Run the three phases when the request changes the behavior of `apps/` or of `packages/`. A new
feature, a new rule, a new user-visible flow and the removal of a behavior all change behavior.

**The test.** If the work would make a page of `docs/business/` false, or would need a new page
there, the request changes behavior. Run the cycle.

---

## 2. The cycle: research, plan, implement

`docs/business/` holds the behavior of today, one page for one capability. `docs/roadmap/<feature>/`
holds one feature that nobody built yet.

The cycle writes into one folder, `docs/roadmap/<feature>/`. That folder is the whole state of the
work, and it holds three files. `.claude/skills/project-documentation/SKILL.md` gives the shape of
each one.

| Step | Who acts | What happens |
|---|---|---|
| 1 | The orchestrator | Open `docs/roadmap/<feature>/TODO.md`, or write it from the request. |
| 2 | `researcher` | **Research.** It writes `research.md`. **Then you stop, and the user approves.** |
| 3 | The orchestrator | **Plan.** You write `plan.md` yourself. **Then you stop, and the user approves.** |
| 4 | The subagents | **Implement.** One phase, one Pull Request. Step 4 repeats for each phase. |

### Step 1 — The item of the roadmap

Look in `docs/roadmap/` first. If a folder already states the feature, use it, and go to step 2.

If none states it, create `docs/roadmap/<feature>/TODO.md` yourself, from the request and from the
conversation. Keep it short. Then show it to the user, and wait. A wrong `TODO.md` wastes the two
phases that follow it.

### Step 2 — Research

Delegate to `researcher`. It reads the code, it reads the pages of `docs/business/` that the
feature touches, and it writes `docs/roadmap/<feature>/research.md`.

The research answers four questions, and nothing else:

1. What does the system do today in this area, and where is that code?
2. Which pages of `docs/business/` state the rules that this feature changes?
3. Which options exist, and what does each one cost?
4. What is unknown, and what must the user decide?

**Then you stop.** Relay the findings and the open questions, and wait for the user. Never start the
plan on your own answer to a question of the research.

### Step 3 — Plan

**You write `plan.md` yourself.** This is the one file that the orchestrator writes, because you
hold the conversation, the research and the answers of the user, and a cold subagent holds none of
them.

The plan holds three parts, in this order.

1. **The decisions.** Each one names the option that you refused, and the reason.
2. **The rules that this feature adds.** Write them in the shape of a page of `docs/business/`: one
   rule with `SHALL`, and one scenario for each case that proves it. This part is the contract of
   the feature. `tester` derives its cases from it, and `documenter` moves it into `docs/business/`
   in the last phase. A feature with no rule here delivers behavior that nobody checks.
3. **The phases.** A phase is the smallest set of tasks that leaves the two applications in a state
   that builds and that passes the tests. One phase gives one Pull Request.

Give each phase one agent and one set of paths. Never mix a task of the backend and a task of the
frontend in one phase, because the two go to two calls.

**The last phase is always the documentation.** It goes to `documenter`, and it carries these three
tasks:

- Write the new behavior into `docs/business/`, and add the line of a new page to `docs/business.md`.
- Correct every page of `docs/business/` that the feature made false.
- Delete `docs/roadmap/<feature>/`, and remove its line from `docs/roadmap.md`.

**Then you stop, and the user approves the plan.** No subagent starts before that.

### Step 4 — Implement

Take one phase. Group its tasks with the rules of section 4, and delegate. Read every report.

Run `tester` one time for the phase, after the last code task and before the delivery. Skip it when
the phase touches no product code.

Then delegate to `git-manager`, which creates the branch, the commit, the push and the Pull Request
of that phase. Ask the user for no confirmation. `git-manager` never merges, because a person
reviews the Pull Request.

Then take the next phase.

---

## 3. Which agent takes the work

The description of each subagent states its own triggers, and those descriptions load with this
file. So pick by the type of the task, and read the description when the choice is close.

| The task | The agent |
|---|---|
| A feature, a bug fix, a new endpoint or component; any change of behavior | `implementer` |
| A restructure that keeps the behavior | `refactorer` |
| A test, when a test is the request itself | `tester` |
| A document, a page of `docs/`, a doc-comment | `documenter` |
| The research of the cycle, an audit, a report. It reads, and it never writes code | `researcher` |
| A branch, a commit, a push, a Pull Request | `git-manager` |
| The plan of the cycle | Nobody. The orchestrator writes it. |

---

## 4. The rules of the orchestrator

### How to group the tasks

- **Group by agent type and by file area, and send one call per group.** A subagent starts cold: it
  loads `CLAUDE.md`, it loads its own file, and it reads the folder of the roadmap again. Ten calls
  pay that price ten times. A phase of ten tasks makes two or three calls.
- **Split a group for a real reason alone.** Two groups touch the same file, or the second group
  needs the report of the first. Two groups that touch different areas run in parallel, in one
  message.
- **`tester` writes every test of `apps/` and of `packages/`, and `implementer` writes none.** A
  task that names a test goes to `tester`, whatever the phase that holds it. `implementer` runs the
  existing suite to verify its change, and it reports the count.
- **When a request spans more than one type, split it, and order the parts.** Usually
  `implementer`, then `tester`, then `documenter`. Read each report before you launch the next part.

### How to write the prompt

- **Name the path; never paste the content.** Give file paths, symbol names and line numbers. Do not
  carry the text of a file, a diff or a log. A pasted file costs the tokens two times: one time in
  your prompt, and one time when the subagent reads the file anyway.
- **Name the folder of the roadmap.** If the task belongs to the cycle, the prompt names
  `docs/roadmap/<feature>/`. The subagent reads the three files itself, so the prompt stays short.
- **Give the goal, the scope, the paths and the acceptance criteria, and nothing more.** A subagent
  never sees this conversation.

**The template.** Every prompt takes this shape. Leave out a line that holds nothing; add no line.

```text
Feature: docs/roadmap/<feature>/         (leave out if the task carries no folder)
Phase:   <n> — <the subject of the phase>  (leave out if the task carries no phase)

Goal
<One sentence. What the code must do after your work.>

Tasks
<n>.1 <the line of plan.md, copied>
<n>.2 <the line of plan.md, copied>

Paths
<the files or the folders that you may change>

Out of scope
<the neighbouring area that you must not touch, if one exists>

Done when
- <the check that proves the work, with the command that runs it>
- You marked your own boxes in plan.md.
```

The lines of the tasks are the one thing that you copy. Everything else in the folder stays a path,
because the subagent reads the folder itself.

### When you may act alone

- **Delegate the work; do not do it inline.** Anything that reads or changes the codebase goes to a
  subagent. The one exception is `plan.md`, which you always write yourself.
- **The floor of the delegation.** A cold start loads more text than a small edit holds. So you may
  edit directly when the change meets all three conditions: it is under about 10 lines; it holds no
  judgment about the architecture; and you already read the file in this conversation. A `model`
  line, a configuration value and a check box meet the three conditions. Prose that states a rule
  does not, and product code never does.
- **Never run a `git` or `gh` command that changes state.** `git-manager` owns those.

### When a subagent reports a block

A subagent stops and reports. It does not guess. Read the report, and take one of these four roads.
**Never send the same prompt again.** A cold start with the same text gives the same block, and it
costs the same tokens.

| The report says | You do |
|---|---|
| A task is unclear, or it holds two readings | Ask the user the one question. Then delegate again, with the answer inside the prompt. |
| A task needs a decision about the architecture | Ask the user. If the decision changes the plan, correct `plan.md` before you delegate again. |
| The plan and the code disagree | Stop the phase. Correct `plan.md`, and say what changed. |
| A package is missing | Name the package to the user, and wait. No agent installs a dependency. |

A task that stays open keeps an empty box in `plan.md`. Deliver every other task of the phase, and
name the open box to the user. Never mark a box that a subagent did not close.
