# The workflow of the SDD

Three commands drive a feature: work that changes the behavior of `apps/` or of `packages/`, and that needs a specification before the code. Each command is the gate: it runs its one step, and it stops. The orchestrator asks for no approval inside a command, because the user approves by typing the next command.

`docs/roadmap/<feature>/TODO.md` is the whole state of the work, and it is the one file of the folder. The research writes no file, and no `plan.md` exists. `project-documentation` gives the shape of `TODO.md`; read the section "The shape of `TODO.md`" of
[roadmap.md](../../project-documentation/references/roadmap.md).

## `/research <feature>`

The command `.claude/commands/research.md` holds this step. It delegates to `researcher`, which reads the code and the pages of `docs/business/` that the feature touches. **`researcher` writes no file.** It reports in its final message: what the system does today, the options, and the questions that the user must answer. The command relays those questions, and it stops. The findings stay in the conversation, because the next step needs them one time alone.

## `/plan <feature>`

The command `.claude/commands/plan.md` holds this step. It stops if no research ran in this conversation. The orchestrator writes `docs/roadmap/<feature>/TODO.md` itself, because it holds the conversation and the answers of the user; a cold subagent holds none of them.

The file holds a short introduction and the phases with their tasks, and nothing else. **Keep it short.** Six sentences at the most for the introduction, and under 100 lines for the whole file. Put no analysis, no refused option and no citation of a line of code into the file; those stay in the conversation. The command shows the phases, and it stops.

## `/implement <feature>`

The command `.claude/commands/implement.md` holds this step. It takes the first phase of `TODO.md` that holds an open box, groups the tasks with [grouping.md](grouping.md), and delegates. It runs `tester` one time for the phase, after the last code task. Then it invokes `git-manager`, which creates the branch, the commit, the push and the Pull Request of that phase. `git-manager` never merges, because a person reviews the Pull Request. The command reports the Pull Request, and it stops. It runs one phase, and it never continues to the next one.
