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

- **Prefix every shell command with `rtk`.** This includes `git`, `gh` and `openspec` (`rtk pnpm run test`, `rtk nest build`, `rtk git status`, `rtk openspec validate`). The files of `.claude/commands/opsx/` show the bare form; add the prefix before you run it. Never invoke a CLI tool directly.
- **Never run ESLint.** That is the user's responsibility.
- **Ask the `LSP` tool about a symbol, and `Grep` about a text.** `findReferences`, `goToDefinition`, `goToImplementation` and `hover` give an exact answer, and `Grep` gives a guess. `LSP` is not a shell command, so it takes no `rtk` prefix.
- **Look before you write a helper, a type or a utility.** Search the codebase for one that already does the job, and call it. Mirroring the shape of a sibling file is not reuse; calling its existing symbol is.
- **Do not install dependencies.** Name the package that a task needs, and let the user install it.
- **When code changes, run the tests of the affected app**, with the commands of `package.json`. Never run E2E tests, and never use Playwright.

### The limits of a subagent

- A subagent never spawns another subagent.
- A subagent never commits, never pushes and never opens a Pull Request, unless its prompt says to. Only `git-manager` runs these operations.

### The change folder

When a prompt names `openspec/changes/<change-id>/`, read `proposal.md`, `design.md` and `tasks.md` before you start. These files carry the context, so the prompt stays short. If a file is absent, continue with the prompt alone, and say so in your report.

After your checks pass, edit `tasks.md`. Change `- [ ]` into `- [x]` for your own completed tasks alone. A task that you completed in part keeps an empty box. Explain the remainder in your report.

### The report

End with a short summary. Name what you did, what you verified with the result, and the follow-ups, or "none". Your final message is the only thing that returns to the caller, so write data and not chatter.

---

## 3. Where to read more

| The subject | The document |
|---|---|
| The layers, the one rule of the dependencies and the path aliases | [agent-rules](./docs/agent-rules.md). Read this card first; it is short. |
| The monorepo | [monorepo-architecture](./docs/monorepo-architecture.md) |
| The backend | [backend-architecture](./docs/backend-architecture.md) |
| The frontend | [frontend-architecture](./docs/frontend-architecture.md) |
| The infrastructure | [infrastructure-architecture](./docs/infrastructure-architecture.md) |
| The documentation itself | The `project-documentation` skill (`.claude/skills/project-documentation/SKILL.md`). It gives the map of `docs/` and the page that receives each kind of content. |
| The Git and GitHub workflow | The `git-github-workflow` skill (`.claude/skills/git-github-workflow/SKILL.md`). It is the authority for the branch, the commit and the Pull Request. |

**OpenSpec.** This project adopts the core `opsx` profile of [OpenSpec](https://openspec.dev/). The commands live in `.claude/commands/opsx/`, and you must not write a local copy of any of them. The expanded profile stays off: the project does not enable `/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify` or `/opsx:bulk-archive`.
