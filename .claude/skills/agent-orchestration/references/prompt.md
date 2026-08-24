# How to write the prompt of a delegation

- **Name the path; never paste the content.** Give file paths, symbol names and line numbers. Do not carry the text of a file, a diff or a log. A pasted file costs the tokens two times: one time in your prompt, and one time when the subagent reads the file anyway.
- **Name the folder of the roadmap.** If the task belongs to the cycle, the prompt names `docs/roadmap/<feature>/`. The subagent reads `TODO.md` itself, so the prompt stays short.
- **Give the goal, the scope, the paths and the acceptance criteria, and nothing more.** A subagent never sees this conversation.

**The template.** Every prompt takes this shape. Leave out a line that holds nothing; add no line.

```text
Feature: docs/roadmap/<feature>/           (leave out if the task carries no folder)
Phase:   <n> — <the subject of the phase>  (leave out if the task carries no phase)

Goal
<One sentence. What the code must do after your work.>

Tasks
<n>.1 <the line of TODO.md, copied>
<n>.2 <the line of TODO.md, copied>

Paths
<the files or the folders that you may change>

Out of scope
<the neighbouring area that you must not touch, if one exists>

Done when
- <the check that proves the work, with the command that runs it>
- You marked your own boxes in TODO.md.
```

The lines of the tasks are the one thing that you copy. Everything else in the folder stays a path, because the subagent reads the file itself.
