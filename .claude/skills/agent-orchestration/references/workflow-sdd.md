# The workflow of the SDD

Three commands drive a feature: work that changes the behavior of `apps/` or of `packages/`, and that needs a specification before the code. Each command is the gate: it runs its one step, and it stops. The orchestrator asks for no approval inside a command, because the user approves by typing the next command.

`docs/roadmap/<feature>/` is the whole state of the work. `project-documentation` gives the shape of `TODO.md`, of `research.md` and of `plan.md`; read the section "The roadmap" of
[roadmap.md](../../project-documentation/references/roadmap.md).

## `/research <feature>`

The command `.claude/commands/research.md` holds this step. It opens `docs/roadmap/<feature>/TODO.md`, or it writes the file from the request of the user. It delegates to `researcher`, which reads the code and the pages of `docs/business/` that the feature touches, and writes `research.md`. The command relays the questions of the research, and it stops.

## `/plan <feature>`

The command `.claude/commands/plan.md` holds this step. It reads `TODO.md` and `research.md`, and it stops if `research.md` is absent. The orchestrator writes `plan.md` itself, because it holds the conversation and the answers of the user; a cold subagent holds none of them. The command shows the decisions and the phases, and it stops.

## `/implement <feature>`

The command `.claude/commands/implement.md` holds this step. It takes the first phase of `plan.md` that holds an open box, groups the tasks with [grouping.md](grouping.md), and delegates. It runs `tester` one time for the phase, after the last code task. Then it invokes `git-manager`, which creates the branch, the commit, the push and the Pull Request of that phase. `git-manager` never merges, because a person reviews the Pull Request. The command reports the Pull Request, and it stops. It runs one phase, and it never continues to the next one.
