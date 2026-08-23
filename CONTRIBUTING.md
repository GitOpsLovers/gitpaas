# Contributing

Thanks for contributing to **GitPaaS**, a self-hostable PaaS platform for deploying personal projects. 

For context, start with the documentation and come back here for the day-to-day workflow:

| Doc                                       | What's inside                   |
|-------------------------------------------|---------------------------------|
| 🏛️ [Architecture](./docs/architecture.md) | How the application is built    |
| 📋 [Business](./docs/business.md)         | What the application does today |
| 🗺️ [Roadmap](./docs/roadmap.md)           | What it does not do yet         |

## Prerequisites

This repository is a monorepo managed with [Turborepo](https://turborepo.dev) and [pnpm](https://pnpm.io/) workspaces.

- **Node** `26.1.0` and **pnpm** `11.1.3` — both pinned in `.tool-versions`. Using a version manager (asdf, mise, `corepack`) that reads `.tool-versions` is the easiest way to match them.
- **Docker** running on your host.

## Setup

Install all workspace dependencies from the repository root:

```bash
pnpm install
```

### Environment variables

Copy the template containing the environment variables needed to run the backend service.

```bash
cp apps/backend/.env.example apps/backend/.env
```

### Local infrastructure

GitPaaS deploys applications by driving the **local Docker daemon** through the `/var/run/docker.sock` unix socket (see [Infrastructure](./docs/architecture/infrastructure.md)). Locally that is your own Docker, so everything you deploy lands on your machine. The stack in `iac/development/docker-compose.yml` provides the remaining services the project depends on.

You can set up the development environment using the following commands. You must run them from `iac/development/`:

```bash
cd iac/development

docker compose up -d --wait      # Start and wait until healthy
docker compose down              # Stop (keeps images/volumes)
docker compose logs -f postgres  # Follow a service's logs
docker compose down -v           # Wipe all state
```

### Database schema and migrations

In development, TypeORM `synchronize` is on, so schema changes to entities are applied automatically on backend boot.

Production is different: the backend ships **no migrations at all**. The production schema lives in plain SQL files under `iac/production/migrations/`, which `scripts/install.sh` applies straight into Postgres (tracked in a `schema_migrations` ledger) before any application container starts.

So whenever you add or change an entity, **hand-write the matching migration** and commit it alongside your change:

1. Add `iac/production/migrations/NNN_short_description.sql`, using the next free number.
2. Write idempotent SQL (`CREATE TABLE IF NOT EXISTS`, constraints added inside a `pg_constraint` guard) with the exact column types, defaults and constraint names TypeORM expects — otherwise production drifts from the entities while your local `synchronize` keeps working.
3. Never edit a file that already shipped; add a new numbered one.

## Running the apps

With the dev stack healthy, you can run the apps with the following commands:

| Script            | Runs                    | Purpose                  |
|-------------------|-------------------------|--------------------------|
| `pnpm dev`        | `turbo run dev`         | Start apps in watch mode |
| `pnpm build`      | `turbo run build`       | Build apps               |
| `pnpm lint`       | `turbo run lint`        | Lint apps                |
| `pnpm test`       | `turbo run test`        | Run apps' unit tests     |
| `pnpm check-types`| `turbo run check-types` | Type-check apps          |

Once you have successfully set up the local infrastructure and started the Backend and Frontend applications, you can log in using the credentials `admin@gitpaas.dev`/`gitpaas`.

## Testing

Run the affected app's tests before pushing, and keep them green:

- **All apps:** `pnpm test` from the root.
- **Backend:** unit tests run on Jest (`pnpm --filter backend test`).
- **Frontend:** unit tests run on Vitest (`pnpm --filter frontend test`).

Add or update tests for any behavior you change. When you cannot run the app's tests (for example, a docs-only change), say so in the PR.

## Coding conventions

- **TypeScript everywhere**, with the strictness the apps already enforce. Follow the layered structure each app uses rather than inventing new patterns.
- **Styling** uses Sass/Tailwind as configured in the frontend.
- **Linting** is enforced with ESLint via `pnpm lint`. Match the existing style; do not disable rules to get code through.

## Agent workflow

GitPaaS is built with AI agents, and the repository is arranged for them. This section tells you what to expect when you open a work session, and what stays your decision. The full rules live in the skill `.claude/skills/agent-orchestration/SKILL.md`, which the orchestrator follows; this section is the summary.

**The orchestrator** is the agent that you talk to. It writes no product code. It classifies your request, it splits the work, it hands each part to a subagent, and it reports the result back to you.

**A subagent** is a fresh agent with one job and no memory of your conversation. Six of them live in `.claude/agents/`:

| The agent     | Its job                                                                                      |
|---------------|----------------------------------------------------------------------------------------------|
| `implementer` | Build a feature, wire an endpoint or a component, fix a bug                                  |
| `refactorer`  | Restructure code, and keep the behavior                                                      |
| `tester`      | Write or repair a test, and change no product code                                           |
| `documenter`  | Write a page of `docs/`, or a doc-comment                                                    |
| `researcher`  | Write the research of the cycle, or audit the structure. It reads, and never writes code     |
| `git-manager` | Branch, commit, push, and open the Pull Request. It is the only agent that changes Git state |

### The two roads

A request takes one of two roads. The direct road covers a question, a document, a configuration edit, a test, a refactor that keeps the behavior, and a bug fix that restores a behavior that `docs/business/` already states; it goes straight to a subagent. A request that changes the behavior of `apps/` or of `packages/` — a new capability, a changed rule, a new user-visible flow — runs the cycle of the specification-driven development: research, then plan, then implement.

### Who owns each step of the cycle

| The step | Who owns it |
|----------------------------------------------------------------------------------------|----------------------------------------------------|
| Describe the work, and write or approve `docs/roadmap/<feature>/TODO.md`               | The person                                         |
| Research: `researcher` writes `research.md`                                            | The agent                                          |
| **Approve the research**                                                               | The person. The first stop.                        |
| Plan: the orchestrator writes `plan.md` itself                                         | The agent                                          |
| **Approve the plan**                                                                   | The person. The second stop.                       |
| Implement one phase: `implementer`, `refactorer`, `tester`, `documenter`               | The agent                                          |
| Open the branch, the commit, the push and the Pull Request of the phase: `git-manager` | The agent, with no confirmation asked              |
| **Review the Pull Request, and merge it**                                              | The person. No agent merges.                       |
| Install a dependency                                                                   | The person. An agent names the package, and waits. |
| Run ESLint                                                                             | The person. No agent runs it.                      |

Between the two stops, the agents work with no further question. The last phase of a feature always goes to `documenter`: it writes the new behavior into `docs/business/`, corrects the pages that the feature made false, and deletes the folder of the roadmap.

### One phase, one Pull Request

A change is delivered in phases, and never in one large Pull Request. A phase is the smallest set of tasks that leaves the two applications in a state that builds and that passes the tests. `plan.md` names the phase, the agent and the paths at the head of each section:

```markdown
### Phase 2 — The removal

**Agent:** implementer
**Paths:** apps/backend/src/features/logs/, apps/backend/src/features/server/

- [ ] 2.1 ...
```

The subagent that finishes a task marks its own box. So the file shows you the real progress.

### What the folder of a feature holds

```text
docs/roadmap/<feature>/
  TODO.md        why the feature matters, what must change, and what stays out of scope
  research.md    the result of the phase of the research
  plan.md        the decisions, the rules that the feature adds, and the phases with their tasks
```

A folder starts with `TODO.md` alone, and it goes away once the last phase of its feature merges.
`docs/roadmap.md` lists the folders that still exist.

## Commit & PR conventions

This project follows the **[Conventional Commits](https://www.conventionalcommits.org)** convention for commit messages. Keep the history clean and the type accurate.

```
<type>(optional scope): <short summary>

[optional body]

[optional footer, e.g. BREAKING CHANGE: ...]
```

### Branches and pull requests

- Branch off `main` using a short, descriptive name (e.g. `feat/project-archiving`, `fix/refresh-token-expiry`). A branch of the cycle takes its name from the feature: `remember-me` gives `feat/remember-me`.
- Keep commits scoped and messages in the Conventional Commits format.
- Open your PR **against `main`**. Ensure the affected apps' lint, type-check, and unit tests pass first. The Pull Request carries a title alone, so the body of the commit names the feature and the phase.
