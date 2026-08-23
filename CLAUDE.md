# Guide for AI agents working on GitPaaS

## Read the part that applies to you

You are one of two kinds of agent. Find your kind, and read the sections that it names.

| You are | You read |
|---|---|
| **The orchestrator** — the main agent, in conversation with the user | This whole file. Then load the skill `agent-orchestration` (`.claude/skills/agent-orchestration/SKILL.md`) before you delegate. It holds the workflow, the choice of the agent, and the rules of the prompt. |
| **A subagent** — you were launched with a prompt, and you have no conversation history | This whole file. Never load the skill `agent-orchestration`, because you never delegate and you never choose an agent. |

---

## 1. The stack

- **Monorepo:** Turborepo
- **Package manager:** pNPM
- **Node:** 26.1.0
- **Backend:** NestJS
- **Frontend:** Angular
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL via TypeORM
- **Linting:** ESLint

---

## 2. The rules of every agent

### The commands

- **Prefix every shell command with `rtk`.** There is no exception, and a plain file utility is no exception either: `rtk pnpm run test`, `rtk nest build`, `rtk git status`, `rtk grep -n "Provider" src/`, `rtk ls apps/`. `rtk` is a proxy that compacts the output before it reaches your context, so a bare call costs more tokens for the same result. No hook enforces this rule; you carry it. `.claude/settings.json` pre-approves the `rtk` form alone, so a bare call also stops for a permission prompt.
- **Never run ESLint.** That is the user's responsibility.
- **Read a part of a file, and not the whole file.** Find the line with `Grep` and its parameter `-n`, then read that range with `Read` and its parameters `offset` and `limit`. Read a whole file only when it holds under 100 lines, or when you rewrite it. A file of 300 lines that you read for one function costs the tokens of three files that you needed.
- **Ask the `LSP` tool about a symbol, and `Grep` about a text.** `findReferences`, `goToDefinition`, `goToImplementation` and `hover` give an exact answer, and `Grep` gives a guess. `LSP` is not a shell command, so it takes no `rtk` prefix.
- **Look before you write a helper, a type or a utility.** Search the codebase for one that already does the job, and call it. Mirroring the shape of a sibling file is not reuse; calling its existing symbol is.
- **Do not install dependencies.** Name the package that a task needs, and let the user install it.
- **When code changes, run the tests of the affected app**, with the commands of `package.json`. Never run E2E tests, and never use Playwright.

### The limits of a subagent

- A subagent never spawns another subagent.
- A subagent never commits, never pushes and never opens a Pull Request, unless its prompt says to. Only `git-manager` runs these operations.

### The end of a task

**Every task ends with a Pull Request.** After the checks of a task or of a phase pass, the orchestrator
delegates to `git-manager` as the last step, and it asks the user for no confirmation. `git-manager`
creates the branch, the commit, the push and the Pull Request, and it never merges, because a person
reviews it. A task that changes no file of the repository ends with the report alone.

### The folder of the feature

When a prompt names `docs/roadmap/<feature>/`, read `TODO.md`, `research.md` and `plan.md` before you start. These files carry the context, so the prompt stays short. If a file is absent, continue with the prompt alone, and say so in your report.

After your checks pass, edit `plan.md`. Change `- [ ]` into `- [x]` for your own completed tasks alone. A task that you completed in part keeps an empty box. Explain the remainder in your report.

### The report

Your final message is the only thing that returns to the caller, so write data and not chatter. **Write 200 words at the most**, and use these five fields. Write "none" in a field that holds nothing.

| The field | It holds |
|---|---|
| **Changed** | One line for one file: the path, and what you did to it. |
| **Verified** | The command that you ran, and its real result (the count of the tests, or the error). |
| **Open** | The task that you did not close, and the reason. Its box stays empty. |
| **Follow-ups** | The bug or the smell that you found and did not touch. |
| **Notes** | A decision that the caller must know. Nothing else. |

Never paste a diff, a file or a log into the report. Name the path, and give the line number.

---

## 3. Where to read more

| The subject | The document |
|---|---|
| The layers, the one rule of the dependencies and the path aliases | [agent-rules](./.claude/rules/agent-rules.md). Read this card first; it is short. |
| The monorepo | [monorepo](./docs/architecture/monorepo.md) |
| The backend | [backend](./docs/architecture/backend.md) |
| The frontend | [frontend](./docs/architecture/frontend.md) |
| The infrastructure | [infrastructure](./docs/architecture/infrastructure.md) |
| What the system does today, one page for one capability | [business](./docs/business.md) |
| What the system does not do yet, one folder for one feature | [roadmap](./docs/roadmap.md) |
| The configuration of the AI, and the workflow of the agents | [agents](./docs/architecture/agents.md) |
| The documentation itself | The `project-documentation` skill (`.claude/skills/project-documentation/SKILL.md`). It gives the map of `docs/`, the page that receives each kind of content, and the shape of a page of the business and of a file of the roadmap. |
| The Git and GitHub workflow | The `git-github-workflow` skill (`.claude/skills/git-github-workflow/SKILL.md`). It is the authority for the branch, the commit and the Pull Request. |

---

## 4. The specification-driven development

The project runs its own cycle, and it uses no external tool for it. The cycle owns two folders of
`docs/`, and nothing else.

| The folder | It holds |
|---|---|
| `docs/business/` | The behavior of today. One page for one capability, with its rules and the scenarios that prove them. |
| `docs/roadmap/<feature>/` | One feature that nobody built yet, with `TODO.md`, `research.md` and `plan.md`. |

A request takes one of two roads. A question, a document, a configuration, a test, a refactor and a
bug fix go straight to a subagent. **A request that changes the behavior of `apps/` or of
`packages/` runs the cycle of three phases: research, plan, implement.** The orchestrator stops
after the research and after the plan, and the user approves each one.

The last phase of a feature always writes the new behavior into `docs/business/` and deletes the
folder of the roadmap. So the roadmap holds the future alone, and the business holds the present.

The skill `agent-orchestration` holds the whole cycle. A subagent needs three facts alone:

1. If your prompt names `docs/roadmap/<feature>/`, read its three files first.
2. Mark your own boxes in `plan.md` when your checks pass.
3. Never write a rule of the business into a page of the architecture, and never the other way.
