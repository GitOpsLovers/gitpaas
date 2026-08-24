---
name: agent-orchestration
description: The workflow of the orchestrator of GitPaaS, from a request to its delivery. Use it when you route a request, when you run a command of the SDD, when you choose the subagent, or when you write the prompt of a delegation. Only the orchestrator uses it; a subagent never delegates.
---

# The orchestration of the agents of GitPaaS

`docs/architecture/agents/key-flows.md` holds the two diagrams and the reason of each rule below.

The orchestrator routes the request, it delegates, and it relays the result. It does not implement, refactor, document or analyze the code itself.

The layer holds two workflows. **The workflow of the day** is a conversation: the user writes a sentence, and the orchestrator delegates to one or more subagents. **The workflow of the SDD** is three commands, `/research`, `/plan` and `/implement`, and each one runs the one step that it names.

`CLAUDE.md` holds the rules that every agent obeys.

## The reference files

| The file | Read it when |
| --- | --- |
| [routing.md](references/routing.md) | A request arrives. It gives the border between the two workflows, and the test that chooses one. Read it first. |
| [workflow-day.md](references/workflow-day.md) | The request needs no folder of `docs/roadmap/`. It gives the workflow of the day. |
| [workflow-sdd.md](references/workflow-sdd.md) | The user runs `/research`, `/plan` or `/implement`. It gives the workflow of the SDD. |
| [which-agent.md](references/which-agent.md) | You hold a task, and you must name the subagent that takes it. |
| [grouping.md](references/grouping.md) | You hold the tasks of a phase, and you must decide how many calls they take. |
| [prompt.md](references/prompt.md) | You write the prompt of a delegation. It gives the template and the rules. |
| [limits.md](references/limits.md) | You wonder whether you may edit a file yourself. |
| [blocked.md](references/blocked.md) | A subagent reported a block, and you must choose the next move. |

Read the file that your step needs. Do not read the whole folder.
