---
description: Research a feature before its plan. Delegates to `researcher`, relays its questions, and writes no file.
argument-hint: [the name of the feature]
---

# `/research`

## The argument

`$ARGUMENTS` holds the name of the feature. If it is empty, take the one folder of `docs/roadmap/`. If that folder does not exist, or if `docs/roadmap/` holds more than one, ask the user for the name and stop.

## The step

Load `.claude/skills/agent-orchestration/SKILL.md`, and read the section `/research <feature>` of
[workflow-sdd.md](../skills/agent-orchestration/references/workflow-sdd.md). Write the prompt of the delegation with
[prompt.md](../skills/agent-orchestration/references/prompt.md).

Delegate to `researcher`, one call, with the name of the feature and the request of the user.

## The report

Relay, in this order:

1. What the system does today.
2. The options that `researcher` found.
3. The questions that the user must answer, as a numbered list.

Then stop. Write no file, create no folder of `docs/roadmap/`, and do not run `/plan`. The user answers the questions in the conversation, and types `/plan` when the answers are complete.
