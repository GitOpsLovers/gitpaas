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
