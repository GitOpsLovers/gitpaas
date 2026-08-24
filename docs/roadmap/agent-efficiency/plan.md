# Plan — the efficiency of the layer of the agents

The feature is stated in [TODO.md](./TODO.md). The findings are in [research.md](./research.md). This
file holds the decisions, the rules that the change adds, and the phases with their tasks.

## The context

Every request pays for the configuration of the AI one time in the orchestrator, and one more time in
each subagent that the phase starts. So a fact that lives in two files costs two times, and a fact
that lives in three files costs three times. The change removes the copy, and it keeps the fact.

The layer also carries two kinds of work that it does not separate today. A user asks for a small
change and gets the machinery of a feature. A user asks for a feature and drives it by prose. The
change gives one workflow to each kind, and it names them.

## The goals

**Goals:**

- The layer holds two workflows: the workflow of the day, and the workflow of the SDD.
- The workflow of the day is a conversation. The user speaks to the orchestrator, and the
  orchestrator delegates. No agent touches Git.
- The workflow of the SDD is three commands: `/research`, `/plan` and `/implement`.
- The base of a session drops from 10 KB to 6 KB or less.
- The cold start of one subagent drops by 40 % or more.
- One fact lives in one file, and every other file links it.
- One page states which agent exists, what it owns, and which workflow starts it.
- An agent equips a skill of the reference when it needs one, and it loads no skill that it does not
  need.

**Non-Goals:**

- A change of the six agents into a smaller set. Option C of the research is refused below.
- A change of the pages of `docs/architecture/backend/` or of `docs/architecture/frontend/`.
- A change of a page of `docs/business/`, because no behavior of the product changes.
- A fourth command, and a command that merges a Pull Request.

## The decisions

**1. The change takes option B: trim the text, and add the commands.**

Option A gains the tokens and it leaves the workflow of the user as prose. Option B gains the same
tokens, and it also answers the second request of the user, which is a simple workflow.

**Alternative that the change does not take:** option C, the merge of the six agents into three. The
page `docs/architecture/agents/key-flows.md` states why the three borders between `implementer`,
`refactorer` and `tester` exist: each one guards one edge of the question "does this change the
behavior". A merged agent loads the caution of three jobs on every task, and it loses the check.

**2. The layer holds two workflows, and the shape of the request chooses one.**

| The workflow | It starts with | The orchestrator does | It ends with |
|---|---|---|---|
| The workflow of the day | A sentence of the user | It reads the request, and it delegates to one or more subagents | The report to the user, and the changed files in the working tree |
| The workflow of the SDD | `/research`, `/plan` or `/implement` | It runs the one step that the command names | The step that the command names |

The workflow of the day takes a question, a small fix, a test, a refactor, a document, a
configuration and an audit. The workflow of the SDD takes a feature: work that changes the behavior
of `apps/` or of `packages/`, and that needs a specification before the code.

The border is the file `docs/roadmap/<feature>/`. Work that needs that folder takes the SDD. Work
that needs no folder takes the day.

**Alternative that the change does not take:** the two roads of today, both inside one skill and both
ending in a Pull Request. The road decides itself, the user cannot see which road it took, and the
small change pays for the branch and the Pull Request of a feature.

**3. `git-manager` runs in the workflow of the SDD alone, and it runs at the end of `/implement`.**

The workflow of the day never invokes `git-manager`. It leaves the change in the working tree, and it
names the files that it changed. The user reads the diff, and the user commits.

The reason is the size of the unit. A phase of the SDD is a unit that a reviewer judges, and it earns
a branch and a Pull Request. A change of the day is one edit, and a branch for one edit costs the
start of an agent, a push and a page of GitHub for a diff that the user already reads in the
terminal.

**Alternative that the change does not take:** the rule of today, "every task ends with a Pull
Request". It gives the same delivery to a typo and to a feature.

**4. The command is the gate.**

`/research` writes `research.md` and it stops. `/plan` writes `plan.md` and it stops. `/implement`
runs one phase and it stops. The orchestrator asks for no approval inside a command, because the user
approves by typing the next command.

So the cycle keeps its two decisions of the user, and it loses the prose that asks for them.
`/implement` repeats for each phase, one call for one phase.

**Alternative that the change does not take:** one command that runs the three steps and stops at a
question. It hides the step that is running, and the user cannot re-run one step alone.

**5. The six reference skills stay, and the agent equips one when it needs it.**

A skill loads its body when an agent invokes it, and never before. So a reference skill costs its
description, and it costs nothing else. Deleting it saves the description and it loses the reference;
shortening the description saves most of the same characters and it keeps the reference. The second
trade is better.

The layer therefore holds two tiers of skill.

| The tier | It loads | The skills |
|---|---|---|
| The skill of the job | Always, before the agent works | `agent-orchestration`, `backend-architecture`, `frontend-architecture`, `backend-feature`, `backend-unit-testing`, `frontend-unit-testing`, `project-documentation`, `git-github-workflow`, `tailadmin-ui-patterns` |
| The skill of the reference | On demand, one at a time | `angular-developer`, `nestjs-best-practices`, `turborepo`, `vitest`, `tailwind-4-docs`, `typescript-advanced-types` |

The skill of the job states the rule of this project. The skill of the reference states the behavior
of a third-party tool. So the skill of the job always wins, and the agent reaches the reference only
for a question that no page of `docs/architecture/` answers.

| The question | The skill of the job that wins | The reference that answers what it does not |
|---|---|---|
| Where does this component go? Which name? | `frontend-architecture` | `angular-developer` |
| Where does this provider go? Which layer? | `backend-architecture` | `nestjs-best-practices` |
| How do I write this spec of the frontend? | `frontend-unit-testing` | `vitest` |
| Which class does this card take? | `tailadmin-ui-patterns` | `tailwind-4-docs` |
| Which task of the pipeline runs this? | `docs/architecture/monorepo/` | `turborepo` |
| Which utility type does this signature take? | None. `Pick`, `Omit`, `Partial` and `Record` need no skill | `typescript-advanced-types` |

**Alternative that the change does not take:** delete the six skills, and reach the same
documentation with `WebFetch`. It saves the whole description instead of most of it, and it costs
more on the day that an agent needs the answer: a page of a site holds the navigation, the examples
of every framework and the markup, and a curated reference holds the answer alone. The reference is
also pinned to a version, and the site is not. Five of the six skills carry that version in their
frontmatter.

**Alternative that the change does not take:** keep the door closed, as today. The layer then pays
the description of six skills that no agent may use.

**6. One pattern serves every skill: `SKILL.md` routes, and `references/` holds the content.**

A file `SKILL.md` loads whole, and a file of `references/` loads only when an agent reads it. So
every sentence that stays in `SKILL.md` is a sentence that every invocation pays for, even the
invocation that needed one other section.

A file `SKILL.md` therefore holds four parts and nothing else:

1. The frontmatter: the name and the description.
2. One paragraph of the purpose, and the skill or the page that wins over this skill.
3. The table of the reference files. One row holds the file, and the sentence "Read it when …".
4. The neighbouring skills, when one exists.

Every rule, every procedure, every example and every table of the detail moves into
`references/<subject>.md`. The folder is named `references/` in every skill, and it carries no other
name.

**Alternative that the change does not take:** a free shape for each skill, as today. Two skills
already used a table of the references, and thirteen mixed the content and the route, so an agent
could not tell whether the file that it loaded was the whole answer or the index of the answer.

**7. One fact lives in one file, and the reader chooses the file.**

| The fact | The file that holds it | The files that link it |
|---|---|---|
| The rule that every agent obeys | `CLAUDE.md` | every agent file |
| The two workflows, the grouping and the prompt | `.claude/skills/agent-orchestration/SKILL.md` | `CLAUDE.md`, the three commands |
| The step of one command | `.claude/commands/<name>.md` | the skill of the orchestration |
| The reason of a rule of the layer | `docs/architecture/agents/` | the skill of the orchestration |
| The shape of `TODO.md`, of `research.md` and of `plan.md` | `.claude/skills/project-documentation/SKILL.md` | the skill of the orchestration |
| The route to a page of the architecture | `backend-architecture`, `frontend-architecture` | every agent file |

The skill of the orchestration loses the shape of `plan.md` and the reason of each rule. It keeps the
rule, and it names the file that holds the shape and the reason.

**Alternative that the change does not take:** one large file that holds the rule and the reason
together. It reads well one time for a person, and it reloads on every request for a machine.

**8. An agent file holds one job, and it holds a fixed set of six sections.**

The sections are: the frontmatter, "What you own", "The skill that you load", "How you work", "How
you verify" and "The report". A block that every agent shares moves into `CLAUDE.md`, and the agent
file states the exception alone.

**Alternative that the change does not take:** a free shape for each agent. The five files already
drifted into five orders of the same five fields.

**9. The verification runs one command for one application.**

`check-types` is that command, for the backend and for the frontend. `build` runs only when the task
changes a build file or a configuration of the compiler.

**Alternative that the change does not take:** the offer of two commands with the note "the cheapest
sufficient check". The note asks each agent to judge, and the two commands compile the application
two times when the agent runs both.

## The rules that this change adds

These rules describe the layer of the AI, and not the product. They go into
`docs/architecture/agents/`, and not into `docs/business/`.

### The rule of the two workflows

The layer SHALL hold two workflows, and the orchestrator SHALL name the workflow that it takes in its
first answer.

- **WHEN** the user writes a sentence, and the work needs no folder of `docs/roadmap/`
- **THEN** the orchestrator takes the workflow of the day, and it delegates to one or more subagents

- **WHEN** the user writes `/research`, `/plan` or `/implement`
- **THEN** the orchestrator takes the workflow of the SDD, and it runs the one step of that command

- **WHEN** the user writes a sentence, and the work changes the behavior of `apps/` or of `packages/`
- **THEN** the orchestrator names the feature and it asks the user to run `/research <feature>`

### The rule of the delivery

`git-manager` SHALL run in the command `/implement` alone.

- **WHEN** the orchestrator runs the workflow of the day
- **THEN** it invokes no `git-manager`, it leaves the change in the working tree, and it names every
  file that it changed

- **WHEN** `/implement` closes the last task of a phase, and the tests of the phase pass
- **THEN** the orchestrator invokes `git-manager`, and the phase ends with a Pull Request

- **WHEN** any agent other than `git-manager` holds a task of Git
- **THEN** the agent refuses the task, and it reports the refusal

### The rule of the three commands

The workflow of the SDD SHALL hold three commands, and one command SHALL run one step.

| The command | It reads | It writes | It stops after |
|---|---|---|---|
| `/research <feature>` | `TODO.md`, the code, `docs/business/` | `TODO.md` if it is absent, then `research.md` | The questions of the research |
| `/plan <feature>` | `TODO.md`, `research.md`, the answers of the user | `plan.md` | The decisions and the phases |
| `/implement <feature>` | `plan.md` | The code, the tests, the boxes of `plan.md` | The Pull Request of one phase |

- **WHEN** the user runs `/plan` and `research.md` is absent
- **THEN** the orchestrator stops, and it asks the user to run `/research` first

- **WHEN** the user runs `/implement` and `plan.md` holds no open box
- **THEN** the orchestrator reports that the feature is complete, and it starts no subagent

- **WHEN** the user runs `/implement` and `plan.md` holds an open phase
- **THEN** the orchestrator runs the first open phase, one phase for one call

### The rule of the single source

The layer SHALL state one fact in one file, and every other file SHALL link that file.

- **WHEN** a file states a rule that another file already states
- **THEN** the second file holds a link, and it holds no copy of the text

### The rule of the skill that an agent loads

The layer SHALL hold two tiers of skill, and an agent file SHALL name the skill of the job that the
agent always loads.

- **WHEN** an agent starts a task of an application
- **THEN** it loads the skill of the job of that application, before it reads a file

- **WHEN** an agent holds a question about a third-party tool, and no page of `docs/architecture/`
  answers it
- **THEN** it invokes the one skill of the reference that covers the tool, and it reads the one
  reference file that covers the question

- **WHEN** a skill of the job and a skill of the reference disagree
- **THEN** the skill of the job wins, and the agent reports the disagreement

- **WHEN** an agent invokes a skill of the reference
- **THEN** it names the skill and the reason in the field **Notes** of its report

- **WHEN** a skill exists that no agent file, no command and no other skill names
- **THEN** the skill leaves `.claude/skills/`

### The rule of the shape of an agent file

An agent file SHALL hold the six sections of decision 8, in that order, and it SHALL hold no block
that `CLAUDE.md` already holds.

- **WHEN** two agent files hold the same instruction
- **THEN** the instruction moves into `CLAUDE.md`, and both files lose it

### The rule of the verification

An agent SHALL run one command of the verification for one application, and that command is
`check-types`.

- **WHEN** an agent changes a file of `apps/backend` or of `apps/frontend`
- **THEN** it runs `rtk pnpm run check-types --filter @gitpaas/<app>`, and it runs `build` only when
  it changed a file of the build or of the compiler

## The phases

### Phase 1 — One pattern for every skill, and a description that states its border

**Agent:** refactorer
**Paths:** `.claude/skills/`, `.claude/agents/`, `docs/architecture/agents/key-flows.md`

Every `SKILL.md` now holds the same four parts and nothing else: the frontmatter, one paragraph of
the purpose with the skill that wins over it, the table of the reference files, and the neighbouring
skills. Every rule, every procedure and every example lives in `references/`.

- [x] 1.1 Shorten the description of `angular-developer`, `nestjs-best-practices`, `turborepo`,
      `vitest`, `tailwind-4-docs` and `typescript-advanced-types` to 120 characters or less. One
      description names the tool, the question that the skill answers, and the skill of the job that
      wins over it. The table of decision 5 gives the pairs.
- [x] 1.2 Move the content of every `SKILL.md` into `references/`. The file `SKILL.md` keeps the
      table of the reference files alone. This applies to the fifteen skills, and not to the six
      references alone.
- [x] 1.3 Rename `nestjs-best-practices/rules/` into `references/`, so one name serves every skill.
- [x] 1.4 Give every row of every table of the reference files one sentence "Read it when …", so an
      agent picks one file and reads no other.
- [x] 1.5 Correct every pointer that named a section of a file `SKILL.md` that no longer holds it:
      `tester.md`, `researcher.md`, `turborepo/command/turborepo.md` and
      `docs/architecture/agents/key-flows.md`.
- [x] 1.6 Replace the paragraph that forbids a skill in `documenter.md`, `tester.md`,
      `implementer.md` and `refactorer.md` with the two tiers. The rule of the two tiers is a rule
      that every agent obeys, so it lives one time, in section 2 of `CLAUDE.md`. Each agent file now
      names its own skills of the job, and it links that section.
- [x] 1.7 Add to each of the six reference skills one line **The snapshot**: the version that the
      reference files follow, the version that this project runs, and the way to refresh the
      snapshot.

**Done when:** every `SKILL.md` holds a table of the reference files and no other content, every link
of every table resolves, no file of `references/` is orphaned, and the six descriptions hold 120
characters or less each.

**The result of phase 1.** The descriptions fell from 4 300 characters to 2 188. The fifteen files
`SKILL.md` hold 551 lines in total, and the largest one holds 70. Every link resolves, and every file
of every folder `references/` is reachable from its table.

**Two drifts that 1.7 revealed.** The snapshot of `vitest` follows Vitest 5.x beta, and
`apps/frontend` runs Vitest 4.1.10, so the reference is one major version ahead of the code. The
reference files of `angular-developer` target Angular v21, and `apps/frontend` runs Angular 22.0.7.
Both lines now carry the two versions, and `vitest/SKILL.md` and `tester.md` carry a warning.

**`git-manager` keeps its closed door.** Its file says "Invoke that one skill, and no other", and
that stays true. It runs the commands of Git, and no question of a third-party tool reaches it.

**One note for phase 2.** Task 1.6 already added the block of the skills to section 2 of `CLAUDE.md`.
Task 2.8 must keep that block, and add the two blocks that stay: the commands of the verification,
and the rule of the scope.

### Phase 2 — The two workflows, and one fact in one file

**Agent:** documenter
**Paths:** `CLAUDE.md`, `.claude/skills/agent-orchestration/SKILL.md`,
`.claude/skills/project-documentation/SKILL.md`, `.claude/skills/backend-feature/SKILL.md`

- [ ] 2.1 Rewrite `agent-orchestration/SKILL.md` around two sections and no other: "The workflow of
      the day" and "The workflow of the SDD". Delete the section "Route the request" and its two
      roads. The rule of the two workflows, above, gives the border.
- [ ] 2.2 Write the section "The workflow of the day". It holds the table of the choice of the agent,
      the rules of the grouping, the template of the prompt, and the sentence "This workflow invokes
      no `git-manager`, and it opens no Pull Request."
- [ ] 2.3 Write the section "The workflow of the SDD". It holds one paragraph for each of the three
      commands, and it names the file `.claude/commands/<name>.md` that holds the step. It states
      that the command is the gate, and that the orchestrator asks for no approval inside a command.
- [ ] 2.4 Delete from the file the rule "Every task ends with a Pull Request". Replace it with the
      rule of the delivery, above.
- [ ] 2.5 Cut the shape of `plan.md` and the shape of a phase. Replace them with a link to the
      section "The roadmap" of `project-documentation/SKILL.md`.
- [ ] 2.6 Cut the paragraphs that explain the reason of a rule, and cut the duties of the last phase.
      Keep the rule. Add one link to `docs/architecture/agents/key-flows.md` at the head of the file.
- [ ] 2.7 Correct `backend-feature/SKILL.md`. Replace the four orders that name
      `docs/architecture/backend.md` with one order that invokes the skill `backend-architecture`.
- [ ] 2.8 Rewrite the table "Find your role" of `CLAUDE.md`. It names the two workflows, and it names
      the three commands. Reduce section 2 to the rules that every agent obeys, and add the two
      blocks that phase 3 moves out of the agent files: the commands of the verification, and the
      rule of the scope.

**Done when:** `agent-orchestration/SKILL.md` holds 140 lines or less and two top sections,
`CLAUDE.md` holds 70 lines or less, and no file states the shape of `plan.md` twice.

### Phase 3 — One shape for the six agent files

**Agent:** refactorer
**Paths:** `.claude/agents/`

- [ ] 3.1 Write the six sections of decision 8 into each of the six files, in that order.
- [ ] 3.2 Delete from every agent file the preamble of the cold start, the rule of the scope and the
      commands of the verification. `CLAUDE.md` holds them after phase 2.
- [ ] 3.3 Make one table of the report, with the fields **Changed**, **Verified**, **Open**,
      **Follow-ups** and **Notes**. Use the same order and the same wording in the five files that
      carry it. `git-manager` keeps its report of one line.
- [ ] 3.4 Add one line to `git-manager.md`: the command `/implement` is the one caller, and the agent
      refuses a task that arrives outside a phase of `docs/roadmap/<feature>/plan.md`.
- [ ] 3.5 Add one line to the five other agent files: the agent runs no `git` and no `gh` command
      that changes state, and it reports the change that it left in the working tree.
- [ ] 3.6 Apply the rule of the verification: one command for one application, and `build` only when
      the task changes a file of the build. Correct `implementer.md` and `refactorer.md`.
- [ ] 3.7 Give one command for the tests of the frontend, `rtk pnpm --filter @gitpaas/frontend test`,
      in `tester.md`. Delete the second form `rtk ng test --watch=false`.

**Done when:** the six files hold 20 KB or less in total, the five reports hold the same five fields
in the same order, and `git-manager.md` names `/implement` as its one caller.

### Phase 4 — The routes state the cost

**Agent:** documenter
**Paths:** `.claude/skills/backend-architecture/SKILL.md`,
`.claude/skills/frontend-architecture/SKILL.md`, `.claude/skills/backend-unit-testing/SKILL.md`,
`.claude/skills/frontend-unit-testing/SKILL.md`

- [x] 4.1 Add a column to the routing table of `backend-architecture` and of
      `frontend-architecture`. The column holds the heading `##` of the section of the page of
      `docs/architecture/`, so the agent finds the line with `Grep -n` and reads the range.
- [x] 4.2 Add one line above each of those two tables: "Find the heading with `rtk grep -n`, then
      read the range with `Read`. Never read the whole page."
- [x] 4.3 Check every link and every heading of the two tables. Every path resolves, and every named
      heading exists in its page.
- [ ] 4.4 Give the same column to `backend-unit-testing` and to `frontend-unit-testing` where a row
      points at a page of `docs/`. A row that points at a file of `references/` needs no heading,
      because the file is small and the agent reads it whole.

**Done when:** every row that points at a page of `docs/` names a heading, and every link of the
four tables resolves.

### Phase 5 — The three commands of the SDD

**Agent:** implementer
**Paths:** `.claude/commands/`

- [ ] 5.1 Write `.claude/commands/research.md`. It takes the name of the feature. It opens
      `docs/roadmap/<name>/TODO.md`, or it writes the file from the request of the user and it shows
      it. It delegates to `researcher`. It relays the questions of the research, and it stops.
- [ ] 5.2 Write `.claude/commands/plan.md`. It reads `TODO.md` and `research.md`, and it stops if
      `research.md` is absent. The orchestrator writes `plan.md` itself, because it holds the
      conversation and the answers of the user. It shows the decisions and the phases, and it stops.
- [ ] 5.3 Write `.claude/commands/implement.md`. It reads `plan.md` and it takes the first phase that
      holds an open box. It groups the tasks by agent and by area, it delegates, it runs `tester` one
      time for the phase, and it invokes `git-manager`. It reports the Pull Request, and it stops.
      It runs one phase, and it never continues to the next one.
- [ ] 5.4 Give the three commands one rule of the argument: the argument is the name of the feature.
      If the argument is absent and `docs/roadmap/` holds one folder, take that folder. If it holds
      several, list them and stop.
- [ ] 5.5 Keep each command under 40 lines. A command names the step, the file and the agent; it
      copies no rule of `agent-orchestration/SKILL.md`.

**Done when:** `/research`, `/plan` and `/implement` appear in the list of the commands, each one
runs one step and stops, `/implement` is the one command that reaches `git-manager`, and no command
repeats a rule of the skill of the orchestration.

### Phase 6 — The documentation of the layer

**Agent:** documenter
**Paths:** `docs/architecture/agents/`, `docs/architecture/agents.md`, `docs/roadmap.md`,
`docs/roadmap/agent-efficiency/`
**This is the last phase.**

- [ ] 6.1 Create `docs/architecture/agents/structure.md`. It holds the tree of `.claude/`, the six
      agents with the owner of each job, the skills with the agent that loads each one, and the three
      commands with the step of each one.
- [ ] 6.2 Create `docs/architecture/agents/conventions.md`. It holds the six sections of an agent
      file, the rule of the single source, the rule of the skill that an agent loads, and the rule of
      the verification.
- [ ] 6.3 Rewrite `docs/architecture/agents/key-flows.md`. It holds one diagram for the workflow of
      the day and one diagram for the workflow of the SDD. It states why the delivery of the day is
      the working tree and the delivery of the SDD is a Pull Request, and why the command is the
      gate. It keeps the section that explains the border between the six agents.
- [ ] 6.4 Add the two new subpages to the list `## Sections` of `docs/architecture/agents.md`.
- [ ] 6.5 Measure the four rows of the table "The measure" again, and write the result beside the
      target. Count the tokens with `POST /v1/messages/count_tokens` if a key of the API holds
      credit, and add a column of the tokens to the table. Keep the column of the bytes either way.
- [ ] 6.6 Delete `docs/roadmap/agent-efficiency/`, and remove its line from `docs/roadmap.md`.

**Done when:** the area `agents` holds three subpages, the index lists them, `key-flows.md` holds the
two diagrams, the table of the measure holds the result of each row, and the folder of the roadmap is
gone.

## The measure

Phase 6 reports these four numbers, and it compares them with the numbers of the research.

| The measure | Today | The target |
|---|---|---|
| `rtk wc -c CLAUDE.md` | 3 433 | 2 500 or less |
| The total of `.claude/agents/*.md` | 33.9 KB | 20 KB or less |
| `.claude/skills/agent-orchestration/SKILL.md` | 10.7 KB | 7 KB or less |
| The descriptions of the skills | 4.3 KB | 2.1 KB or less |

**The unit is the byte, and not the token.** A token is the unit that the model bills, and the
endpoint `POST /v1/messages/count_tokens` gives the exact count. The key of `.dev/.env` holds no
credit today, so the endpoint refuses every call, and the table holds bytes. Task 6.5 adds the
column of the tokens when a key of the API holds credit. The byte stays in the table, because it
needs no network and it ranks the files in the same order.
