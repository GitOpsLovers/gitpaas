---
description: Run the first phase of `TODO.md` that holds an open box, then open its Pull Request through `git-manager`, and stop.
argument-hint: [the name of the feature]
---

# `/implement`

## The argument

`$ARGUMENTS` holds the name of the feature. If it is empty, take the one folder of `docs/roadmap/`. If that folder does not exist, or if `docs/roadmap/` holds more than one, ask the user for the name and stop.

## The step

Read `docs/roadmap/<feature>/TODO.md`, and take **the first phase that holds an open box**. If every box is checked, say so and stop.

Read the section `/implement <feature>` of
[workflow-sdd.md](../skills/agent-orchestration/references/workflow-sdd.md). Group the tasks with
[grouping.md](../skills/agent-orchestration/references/grouping.md), and write each prompt with
[prompt.md](../skills/agent-orchestration/references/prompt.md).

1. Delegate the tasks of the phase to the agent that the phase names. `implementer` writes the code and its tests in the same call.
2. Call `git-manager` one time: the branch, the commit, the push and the Pull Request of this phase.

If a subagent reports a block, follow
[blocked.md](../skills/agent-orchestration/references/blocked.md).

## The report

Give the phase that ran, the boxes that the subagents checked, the result of the tests and the URL of the Pull Request. Then stop. Run one phase alone, and never continue to the next one; the user types `/implement` again.
