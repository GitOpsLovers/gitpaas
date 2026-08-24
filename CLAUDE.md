# Guide for AI agents working on GitPaaS

This file holds three things alone: your role, the stack, and the rules that every agent obeys.
Everything else lives in the skill or in the agent file that owns it.

## Find your role

You are one of two kinds of agent. Read the row that describes you, and do what it says.

### Orchestrator

The main agent, in conversation with the user.

You write no product code yourself. Load the skill `agent-orchestration` (`.claude/skills/agent-orchestration/SKILL.md`) now, and follow it. A sentence of the user, with no folder of `docs/roadmap/`, takes **the workflow of the day**: you delegate to one or more subagents, and the change stays in the working tree. `/research`, `/plan` and `/implement` take **the workflow of the SDD**: each command runs the one step that it names, `/research` and `/plan` produce the one file `docs/roadmap/<feature>/TODO.md`, and `/implement` is the one place where `git-manager` opens a Pull Request.

### Subagent

A prompt launched you, and you hold no conversation history.

You do the one job of your prompt, and you report. Never load the skill `agent-orchestration`, because you never delegate. Your agent file (`.claude/agents/<name>.md`) holds your procedure.

---

## 1. Stack

- **Monorepo:** Turborepo
- **Package manager:** pNPM
- **Backend:** NestJS
- **Frontend:** Angular
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL via TypeORM

---

## 2. Rules of every agent

### Skills

The project holds two tiers of skill. Load the tier that your task needs, and no more.

- **The skill of the job — always, before you work.** It states the rule of this project, and it wins over every other statement. Your agent file names the ones that you load. Before you touch a file of `apps/`, that list always holds `backend-architecture` or `frontend-architecture`, which route to the pages of `docs/architecture/` that are the single source of truth.
- **The skill of the reference — on demand, one at a time.** Six skills hold the documentation of a third-party tool: `angular-developer`, `nestjs-best-practices`, `turborepo`, `vitest`, `tailwind-4-docs` and `typescript-advanced-types`. Invoke one when a question about the tool stays open after you read the page of `docs/architecture/` that covers it. Name the skill and the reason in the field **Notes** of your report.
- **When a skill of the job and a skill of the reference disagree, the skill of the job wins**, and you report the disagreement.
- **Read one file of `references/`, and not the folder.** A file `SKILL.md` holds a table of its reference files, and one row states when to read one. Pick the row that matches your task.

### Commands

- **Prefix every shell command with `rtk`.** When executing any Bash command, always precede it with the `rtk` tool, as this reduces tokens consumption.
- **Never run ESLint.** That is the user's responsibility.
- **Read a part of a file, and not the whole file.** Find the line with `Grep` and its parameter `-n`, then read that range with `Read` and its parameters `offset` and `limit`. Read a whole file only when it holds under 100 lines, or when you rewrite it. A file of 300 lines that you read for one function costs the tokens of three files that you needed.
- **Ask the `LSP` tool about a symbol, and `Grep` about a text.** `findReferences`, `goToDefinition`, `goToImplementation` and `hover` give an exact answer, and `Grep` gives a guess. `LSP` is not a shell command, so it takes no `rtk` prefix.
- **Look before you write a helper, a type or a utility.** Search the codebase for one that already does the job, and call it. Mirroring the shape of a sibling file is not reuse; calling its existing symbol is.
- **Do not install dependencies.** Name the package that a task needs, and let the user install it.
- **When code changes, run the tests of the affected app**, with the commands of `package.json`. Never run E2E tests, and never use Playwright.
- **Verify with one command for one application.** When a task changes a file of `apps/backend` or of `apps/frontend`, run `rtk pnpm run check-types --filter @gitpaas/<app>`. Run `build` too, and only, when the task changes a file of the build or of the compiler.
- **Stay in scope.** Do exactly what the prompt asks. Do not opportunistically improve, refactor or fix a file that the prompt does not name; report an unrelated bug or smell instead of fixing it.

### Limits of a subagent

- A subagent never spawns another subagent.
- A subagent never commits, never pushes and never opens a Pull Request. Only `git-manager` runs these operations, and only inside `/implement`.

### The folder of the feature

When a prompt names `docs/roadmap/<feature>/`, read `TODO.md` before you start. That one file carries the context, so the prompt stays short. The folder holds no other file. If the file is absent, continue with the prompt alone, and say so in your report.

After your checks pass, edit `TODO.md`. Change `- [ ]` into `- [x]` for your own completed tasks alone. A task that you completed in part keeps an empty box. Explain the remainder in your report. `.claude/skills/project-documentation/references/roadmap.md` gives the shape of `TODO.md` and of a phase.