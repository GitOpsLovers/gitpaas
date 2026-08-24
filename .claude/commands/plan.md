---
description: Write `docs/roadmap/<feature>/TODO.md` from the research of this conversation, show the phases, and stop.
argument-hint: [the name of the feature]
---

# `/plan`

## The argument

`$ARGUMENTS` holds the name of the feature. If it is empty, take the one folder of `docs/roadmap/`. If that folder does not exist, or if `docs/roadmap/` holds more than one, ask the user for the name and stop.

## The gate

If no `/research` ran in this conversation, say so and stop. The plan needs the findings and the answers of the user, and a new conversation holds none of them.

## The step

Read the section `/plan <feature>` of
[workflow-sdd.md](../skills/agent-orchestration/references/workflow-sdd.md), and the section "The shape of `TODO.md`" of
[roadmap.md](../skills/project-documentation/references/roadmap.md).

Write `docs/roadmap/<feature>/TODO.md` yourself, one file and no other file in the folder. Add the line of the feature to `docs/roadmap.md`.

## The report

Show the title of each phase, its agent and the count of its tasks. Then stop. Delegate nothing, write no code, and do not run `/implement`. The user types `/implement` when the plan is right.
