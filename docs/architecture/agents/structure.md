# Structure

## The tree of `.claude/`

`.claude/` holds four kinds of file: the agents, the skills, the commands and the output style. `CLAUDE.md`, at the root of the repository, is the entry point that every agent reads first.

```text
.claude/
  agents/
    documenter.md
    git-manager.md
    implementer.md
    researcher.md
  commands/
    implement.md
    plan.md
    research.md
  skills/
    agent-orchestration/
    backend-architecture/
    backend-feature/
    backend-unit-testing/
    frontend-architecture/
    frontend-design/
    frontend-unit-testing/
    git-github-workflow/
    project-documentation/
    turborepo/
    typescript-advanced-types/
  output-styles/
    asd-ste100.md
  settings.json
```

## The four agents

`.claude/agents/` holds one file for one subagent. Each file carries the frontmatter that the harness reads (`name`, `description`, `tools`, `model`) and the body that the subagent reads at its own cold start; `conventions.md` gives the shape of that body.

| The agent     | It owns                                                                                                       |
|---------------|---------------------------------------------------------------------------------------------------------------|
| `implementer` | Every change of the code of `apps/` and of `packages/`: the feature, the bug fix, the restructure, the tests. |
| `documenter`  | The pages of `docs/` and, on request alone, a TSDoc comment. It takes the last phase of every feature.        |
| `researcher`  | The research of a cycle and the audit. It reads, and it writes no code, ever.                                 |
| `git-manager` | Every Git and GitHub operation that changes state. It is the only agent that runs one.                        |

The description of each agent states its own triggers, so the orchestrator picks by the type of the task and reads the description when the choice is close; `.claude/skills/agent-orchestration/references/which-agent.md` gives the table of that choice.

## The skills

`.claude/skills/` holds two tiers, and `CLAUDE.md` gives the rule that separates them.

- **The skill of the job**, one per area of the code, always loaded before the work starts: `backend-architecture`, `frontend-architecture`, `frontend-design`, `backend-feature`, `backend-unit-testing`, `frontend-unit-testing`, `project-documentation`, `git-github-workflow` and `agent-orchestration`. Each one routes to the page that is the single source of truth, so the skill itself carries a table of pointers and not the rule.
- **The skill of the reference**, on demand, one at a time: `turborepo` and `typescript-advanced-types`. A skill of the job wins over a skill of the reference when the two disagree.

A `SKILL.md` file holds the frontmatter and a table of the files of `references/`, one row for one file, and the row states when to read it. The content itself lives in `references/`, so a subagent reads the one file its step needs, and not the whole folder.

## The three commands

`.claude/commands/` holds the workflow of the SDD, one file for one step: `research.md`, `plan.md` and `implement.md`. Each command reads its own row of `.claude/skills/agent-orchestration/references/workflow-sdd.md`, runs the one step that its name states, and stops; the user types the next command to move to the next step. `docs/architecture/agents/key-flows.md` gives the diagram of the two workflows and the reason of the delivery.
