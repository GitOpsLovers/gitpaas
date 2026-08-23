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
- **Read a part of a file, and not the whole file.** Find the line with `Grep` and its parameter `-n`, then read that range with `Read` and its parameters `offset` and `limit`. Read a whole file only when it holds under 100 lines, or when you rewrite it. A file of 300 lines that you read for one function costs the tokens of three files that you needed.
- **Ask the `LSP` tool about a symbol, and `Grep` about a text.** `findReferences`, `goToDefinition`, `goToImplementation` and `hover` give an exact answer, and `Grep` gives a guess. `LSP` is not a shell command, so it takes no `rtk` prefix.
- **Look before you write a helper, a type or a utility.** Search the codebase for one that already does the job, and call it. Mirroring the shape of a sibling file is not reuse; calling its existing symbol is.
- **Do not install dependencies.** Name the package that a task needs, and let the user install it.
- **When code changes, run the tests of the affected app**, with the commands of `package.json`. Never run E2E tests, and never use Playwright.
- **A change of `CLAUDE.md`, of `.claude/` or of `openspec/config.yaml` carries an entry in `AGENTS-CHANGELOG.md`.** The page [operations](./docs/agents-architecture/operations.md) gives the shape of the entry and the script of its numbers. A check of GitHub fails the Pull Request that forgets the entry.

### The limits of a subagent

- A subagent never spawns another subagent.
- A subagent never commits, never pushes and never opens a Pull Request, unless its prompt says to. Only `git-manager` runs these operations.

### The end of a task

**Every task ends with a Pull Request.** After the checks of a task or of a phase pass, the orchestrator
delegates to `git-manager` as the last step, and it asks the user for no confirmation. `git-manager`
creates the branch, the commit, the push and the Pull Request, and it never merges, because a person
reviews it. A task that changes no file of the repository ends with the report alone.

### The change folder

When a prompt names `openspec/changes/<change-id>/`, read `proposal.md`, `design.md` and `tasks.md` before you start. These files carry the context, so the prompt stays short. If a file is absent, continue with the prompt alone, and say so in your report.

After your checks pass, edit `tasks.md`. Change `- [ ]` into `- [x]` for your own completed tasks alone. A task that you completed in part keeps an empty box. Explain the remainder in your report.

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
| The monorepo | [monorepo-architecture](./docs/monorepo-architecture.md) |
| The backend | [backend-architecture](./docs/backend-architecture.md) |
| The frontend | [frontend-architecture](./docs/frontend-architecture.md) |
| The infrastructure | [infrastructure-architecture](./docs/infrastructure-architecture.md) |
| The configuration of the AI, the workflow of the agents and the metrics of the tokens | [agents-architecture](./docs/agents-architecture.md) |
| The documentation itself | The `project-documentation` skill (`.claude/skills/project-documentation/SKILL.md`). It gives the map of `docs/` and the page that receives each kind of content. |
| The Git and GitHub workflow | The `git-github-workflow` skill (`.claude/skills/git-github-workflow/SKILL.md`). It is the authority for the branch, the commit and the Pull Request. |

**OpenSpec.** This project adopts the core `opsx` profile of [OpenSpec](https://openspec.dev/). The commands live in `.claude/commands/opsx/`. Three decisions are closed; do not reopen one of them.

1. **Never write a local copy of an `opsx` command.** An upgrade of OpenSpec would leave the copy behind. The project shapes the commands from `openspec/config.yaml`, which holds the context, the rules of each artifact and the guidance of each operation.
2. **Never run `/opsx:apply`.** The orchestrator reads `tasks.md` and delegates, so the command has no work to do here. The four commands that stay in the workflow are `/opsx:propose`, `/opsx:update`, `/opsx:sync` and `/opsx:archive`.
3. **Ignore every block about a "store".** A store is a standalone OpenSpec repository, registered on the machine. This project registers none, and `openspec store list` gives an empty list. So never pass `--store`, and read the specifications of `openspec/` of this repository.

The expanded profile stays off: the project does not enable `/opsx:new`, `/opsx:continue`, `/opsx:ff`, `/opsx:verify` or `/opsx:bulk-archive`.
