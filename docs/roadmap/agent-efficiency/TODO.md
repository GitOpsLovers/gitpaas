# The efficiency of the layer of the agents

Every request pays for the configuration of the AI two times, and sometimes seven: the orchestrator loads it, and each subagent loads it again. The layer held 33.9 KB of agent files, 10.7 KB of the skill of the orchestration and 4.3 KB of descriptions, with the workflow of the cycle written three times in three shapes. We give the layer two named workflows — the workflow of the day, which leaves the change in the working tree, and the workflow of the SDD, which is three commands — and we put one fact in one file. Out of scope: the architecture of the two applications, the pages of `docs/business/`, a seventh agent, a fourth command, and the tool `rtk`.

## Phase 1 — One pattern for every skill

**Agent:** refactorer
**Paths:** .claude/skills/, .claude/agents/, docs/architecture/agents/key-flows.md

- [x] 1.1 Shorten the description of the six reference skills to 120 characters, and name the skill of the job that wins.
- [x] 1.2 Move the content of every `SKILL.md` into `references/`, and keep the table of the reference files alone.
- [x] 1.3 Rename `nestjs-best-practices/rules/` into `references/`.
- [x] 1.4 Give every row of every table one sentence "Read it when …".
- [x] 1.5 Correct every pointer that named a section of a `SKILL.md` that no longer holds it.
- [x] 1.6 Replace the paragraph that forbids a skill in four agent files with the rule of the two tiers of `CLAUDE.md`.
- [x] 1.7 Add to each reference skill the line **The snapshot**: the version of the reference, the version of the project, and the refresh.

## Phase 2 — The two workflows, and one fact in one file

**Agent:** documenter
**Paths:** CLAUDE.md, .claude/skills/agent-orchestration/, .claude/skills/project-documentation/, .claude/skills/backend-feature/

- [x] 2.1 Rewrite `agent-orchestration/SKILL.md` around the two workflows, and delete the section "Route the request".
- [x] 2.2 Write the workflow of the day: the choice of the agent, the grouping, the prompt, and the rule that it opens no Pull Request.
- [x] 2.3 Write the workflow of the SDD: one paragraph per command, and the rule that the command is the gate.
- [x] 2.4 Delete the rule "Every task ends with a Pull Request", and replace it with the rule of the delivery.
- [x] 2.5 Cut the shape of the file of the plan, and link the section of `project-documentation` that owns it.
- [x] 2.6 Cut the reason of each rule, and link `docs/architecture/agents/key-flows.md` at the head of the file.
- [x] 2.7 Correct `backend-feature/SKILL.md`: one order that invokes the skill `backend-architecture`.
- [x] 2.8 Rewrite the table "Find your role" of `CLAUDE.md`, and reduce section 2 to the rules that every agent obeys.

## Phase 3 — One shape for the six agent files

**Agent:** refactorer
**Paths:** .claude/agents/

- [x] 3.1 Write the six sections into each of the six files, in one order.
- [x] 3.2 Delete from every agent file the preamble of the cold start, the rule of the scope and the commands of the verification.
- [x] 3.3 Make one table of the report, with the same five fields in the same order.
- [x] 3.4 Add to `git-manager.md` that `/implement` is its one caller.
- [x] 3.5 Add to the five other files that the agent runs no `git` command that changes state.
- [x] 3.6 Apply the rule of the verification: one command for one application.
- [x] 3.7 Give one command for the tests of the frontend in `tester.md`.

## Phase 4 — The routes state the cost

**Agent:** documenter
**Paths:** .claude/skills/backend-architecture/, .claude/skills/frontend-architecture/, .claude/skills/backend-unit-testing/, .claude/skills/frontend-unit-testing/

- [x] 4.1 Add the column of the heading `##` to the routing table of the two skills of the architecture.
- [x] 4.2 Add above each table the order to find the heading with `rtk grep -n`, and to read the range.
- [x] 4.3 Check every link and every heading of the two tables.
- [x] 4.4 Give the same column to the two skills of the unit testing.

## Phase 5 — The three commands of the SDD

**Agent:** implementer
**Paths:** .claude/commands/

- [ ] 5.1 Write `.claude/commands/research.md`: it delegates to `researcher`, it relays the questions, it writes no file, and it stops.
- [ ] 5.2 Write `.claude/commands/plan.md`: the orchestrator writes `docs/roadmap/<name>/TODO.md` itself, short, and it stops.
- [ ] 5.3 Write `.claude/commands/implement.md`: it takes the first phase of `TODO.md` that holds an open box, it delegates, it runs `tester` one time, it invokes `git-manager`, and it stops.
- [ ] 5.4 Give the three commands one rule of the argument: the name of the feature, or the one folder of `docs/roadmap/`.
- [ ] 5.5 Keep each command under 40 lines, and copy no rule of the skill of the orchestration.

## Phase 6 — The documentation of the layer

**Agent:** documenter
**Paths:** docs/architecture/agents/, docs/architecture/agents.md, docs/roadmap.md
**This is the last phase.**

- [ ] 6.1 Create `docs/architecture/agents/structure.md`: the tree of `.claude/`, the six agents, the skills and the three commands.
- [ ] 6.2 Create `docs/architecture/agents/conventions.md`: the sections of an agent file, and the rules of the source, of the skill and of the verification.
- [ ] 6.3 Rewrite `key-flows.md` with one diagram per workflow, and the reason of each delivery.
- [ ] 6.4 Add the two new subpages to the list `## Sections` of `docs/architecture/agents.md`.
- [ ] 6.5 Measure the four rows of the table below again, and write the result beside the target.
- [ ] 6.6 Delete `docs/roadmap/agent-efficiency/`, and remove its line from `docs/roadmap.md`.

## The measure of the phase 6

| The measure | Today | The target |
|---|---|---|
| `rtk wc -c CLAUDE.md` | 3 433 | 2 500 or less |
| The total of `.claude/agents/*.md` | 33.9 KB | 20 KB or less |
| `.claude/skills/agent-orchestration/SKILL.md` | 10.7 KB | 7 KB or less |
| The descriptions of the skills | 4.3 KB | 2.1 KB or less |
