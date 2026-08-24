# The efficiency of the layer of the agents

## Why

Every request of the user pays for the configuration of the AI two times, and sometimes seven times.
The orchestrator loads it one time. Each subagent that the orchestrator starts loads it again, because
a subagent holds no history and it reads `CLAUDE.md`, its own agent file and the descriptions of every
skill of the project.

The layer of the agents holds 33.9 KB of agent files, 10.7 KB of the skill of the orchestration, and
4.3 KB of descriptions of the skills. Six of the fifteen skills are curated references of a
third-party tool, and four agent files forbid them by name, so the layer pays the description of each
one and it uses none of them. The workflow of the cycle is written three times, in three files, in
three shapes.

The layer also gives one shape to two kinds of work. A user who wants a small change gets the
machinery of a feature: a branch, a commit and a Pull Request. A user who wants a feature drives the
cycle by prose, because no command exists, and the cycle stops at three gates.

## What must change

- **The layer holds two workflows, and it names them.**
  - **The workflow of the day** is a conversation. The user speaks to the orchestrator, the
    orchestrator delegates to one or more subagents, and the change stays in the working tree. No
    agent touches Git.
  - **The workflow of the SDD** is three commands: `/research`, `/plan` and `/implement`. Each
    command calls the orchestrator, and the orchestrator runs the one step of that command.
    `/implement` is the one place where `git-manager` opens a Pull Request.
- **The layer costs fewer tokens.** One fact lives in one file. A subagent loads the text of its own
  job, and no text of another job.
- **The architecture of the agents is explicit.** One page states which agent exists, what it owns,
  which skill it loads, and which workflow starts it.
- **A skill states when it applies and where it applies.** A description names the question that the
  skill answers, and the skill that wins over it. An agent equips a reference when it needs one, and
  no agent file forbids a skill that the repository holds.

## The state today

The audit is in [research.md](./research.md). It holds the size of each file, the duplication between
the files, the routes that point at the wrong page, and the commands that run the same build two
times. [plan.md](./plan.md) holds the phases that close them.

## Out of scope

- The architecture of `apps/backend` and of `apps/frontend`. This change reads the pages of
  `docs/architecture/backend/` and of `docs/architecture/frontend/`; it does not rewrite them.
- The pages of `docs/business/`. The behavior of the product does not change.
- A new subagent. The six agents stay six agents, and only the workflow that starts each one changes.
- A fourth command, and a command that merges a Pull Request.
- The tool `rtk`, and the plugin `typescript-lsp`.

## Impact

`CLAUDE.md`, the six files of `.claude/agents/`, the descriptions of the fifteen skills, the new
folder `.claude/commands/` with its three commands, and the area `docs/architecture/agents/`.
