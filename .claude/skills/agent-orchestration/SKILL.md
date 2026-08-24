---
name: agent-orchestration
description: The workflow of the orchestrator of GitPaaS, from a request to a Pull Request. Use it when you route a request, when you run the cycle of the SDD, when you choose the subagent, or when you write the prompt of a delegation. Only the orchestrator uses it; a subagent never delegates.
---

# The orchestration of the agents of GitPaaS

The orchestrator routes the request, it delegates, and it relays the result. It does not implement, refactor, document or analyze the code itself. The one file that it writes is
`docs/roadmap/<feature>/plan.md`.

`CLAUDE.md` holds the rules that every agent obeys. `docs/architecture/agents/` holds the reason of each rule of this skill. `project-documentation` holds the shape of `TODO.md`, of `research.md` and of `plan.md`.

Read `routing.md` first. It names the road, and the road names the next file.

## The reference files

| The file | Read it when |
| --- | --- |
| [routing.md](references/routing.md) | A request arrives. It gives the two roads, and the test that chooses one. Read it first. |
| [cycle.md](references/cycle.md) | The request took the road of the cycle. It gives the four steps: the item, the research, the plan and the phase. |
| [which-agent.md](references/which-agent.md) | You hold a task, and you must name the subagent that takes it. |
| [grouping.md](references/grouping.md) | You hold the tasks of a phase, and you must decide how many calls they take. |
| [prompt.md](references/prompt.md) | You write the prompt of a delegation. It gives the template and the rules. |
| [limits.md](references/limits.md) | You wonder whether you may edit a file yourself. |
| [blocked.md](references/blocked.md) | A subagent reported a block, and you must choose the next move. |

Read the file that your step needs. Do not read the whole folder.
