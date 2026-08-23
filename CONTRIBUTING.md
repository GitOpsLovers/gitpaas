# Contributing

Thanks for contributing to **GitPaaS**, a self-hostable PaaS platform for deploying personal projects. 

For architecture and design context, start with the documentation and come back here for the day-to-day workflow:

- [Backend architecture](./docs/architecture/backend.md)
- [Frontend architecture](./docs/architecture/frontend.md)
- [Infrastructure architecture](./docs/architecture/infrastructure.md)

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

The variables cover: 

- Runtime: `NODE_ENV`, `PORT`
- Security: `CORS_ORIGIN`, `APP_BASE_URL`, `THROTTLE_TTL`/`THROTTLE_LIMIT`, `THROTTLE_STREAM_TTL`/ `THROTTLE_STREAM_LIMIT`
- Deployment logs: `LOGS_MAX_LINES` (per-deployment cap, e.g. `5000`)
- PostgreSQL: `DB_*`
- GitHub App: `GITHUB_APP_*`, 
- Authentication: `JWT_ACCESS_SECRET`/`JWT_ACCESS_EXPIRES_IN` and `JWT_REFRESH_SECRET`/`JWT_REFRESH_EXPIRES_IN`

### Local infrastructure

GitPaaS deploys applications by driving the **local Docker daemon** through the `/var/run/docker.sock` unix socket (see [infrastructure-architecture.md](./docs/architecture/infrastructure.md)). Locally that is your own Docker, so everything you deploy lands on your machine. The stack in `iac/development/docker-compose.yml` provides the remaining services the project depends on:

- **`postgres`**: the application database. It also stores deployment logs, which back both the live SSE stream and its replayable history.
- **`pgadmin`**: web UI for the local Postgres at `http://127.0.0.1:5050`.

You can set up the development environment using the following commands. You must run them from `iac/development/`:

```bash
cd iac/development

docker compose up -d --wait      # Start and wait until healthy
docker compose down              # Stop (keeps images/volumes)
docker compose logs -f postgres  # Follow a service's logs
docker compose down -v           # Wipe all state
```

Your local Docker daemon must be running: the backend connects to `/var/run/docker.sock` and fails its Docker-backed endpoints if the socket is unavailable.

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

If you have questions about the project, read the documentation files in `docs`.

## Agent workflow

GitPaaS is built with AI agents, and the repository is arranged for them. This section describes a work session, so you know what to expect when you open one, and what stays your decision.

### The two kinds of agent

**The orchestrator** is the agent that you talk to. It writes no product code. It classifies your request, it splits the work, it hands each part to a subagent, and it reports the result back to you.

**A subagent** is a fresh agent with one job and no memory of your conversation. Six of them live in
`.claude/agents/`:

| The agent              | Its job                                                                                                                    |
|------------------------|----------------------------------------------------------------------------------------------------------------------------|
| `implementer`          | Build a feature, wire an endpoint or a component, fix a bug                                                                |
| `refactorer`           | Restructure code, and keep the behavior                                                                                    |
| `tester`               | Write or repair a test, and change no product code                                                                         |
| `documenter`           | Write a page of `docs/`, or a doc-comment                                                                                  |
| `researcher`           | Write the research of the cycle, or audit the structure. It reads, and it never writes code                                |
| `git-manager`          | Branch, commit, push, and open the Pull Request. It is the only agent that runs a `git` or `gh` command that changes state |

The orchestrator follows the skill `.claude/skills/agent-orchestration/SKILL.md`. Every agent follows `CLAUDE.md`. Read those two files if you want the exact rules.

### When a change needs the cycle

A request takes one of two roads. A question, a document, a configuration edit, a test that you ask for, and a refactor or a bug fix that keeps the documented behavior go straight to a subagent. A request that changes the behavior of `apps/` or of `packages/` — a new capability, a changed rule, a new user-visible flow — runs the cycle of the specification-driven development: research, then plan, then implement.

### What a session looks like

1. **You describe the work.** The orchestrator classifies it, and it says which road it takes.
2. **For the cycle, `researcher` writes the research.** It reads the code and the pages of `docs/business/` that the feature touches, and it records what the system does today, which pages it changes, which options exist, and what stays unknown.
3. **You read the research, and you approve it.** This is the first stop. No agent starts the plan before it.
4. **The orchestrator writes the plan.** It is the one file that the orchestrator writes itself. The plan holds three parts: the decisions with the option that each one refused, the rules that the feature adds, and the phases with their tasks. The rules are the contract of the feature: they are written in the shape of a page of `docs/business/`, and the last phase moves them there.
5. **You read the plan, and you approve it.** This is the second stop. No agent starts a phase before it.
6. **The orchestrator delivers one phase.** It takes the next phase, and it hands each group of tasks to a subagent. Two groups that touch different areas run at the same time.
7. **The orchestrator runs `tester` one time for the phase**, and it derives the cases from the scenarios of the page of `docs/business/` that the phase touches.
8. **`git-manager` opens the Pull Request of the phase.** One phase gives one branch, one commit and one Pull Request.
9. **You review the Pull Request, and you merge it.** No agent merges.
10. **Steps 6 to 9 repeat, one time for each phase.** The last phase always goes to `documenter`. It writes the new behavior into `docs/business/`, corrects the pages that the feature made false, and deletes the folder of the feature.

Between the two stops, the agents work without a further question.

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

A folder starts with `TODO.md` alone, and it goes away once the last phase of its feature merges;
`docs/roadmap.md` lists the folders that still exist. The branch takes its name from the feature: the
feature `remember-me` gives the branch `feat/remember-me`. The Pull Request carries a title alone, so
the body of the commit names the feature and the phase.

## Commit & PR conventions

This project follows the **[Conventional Commits](https://www.conventionalcommits.org)** convention for commit messages. Keep the history clean and the type accurate.

```
<type>(optional scope): <short summary>

[optional body]

[optional footer, e.g. BREAKING CHANGE: ...]
```

### Branches and pull requests

- Branch off `main` using a short, descriptive name (e.g. `feat/project-archiving`, `fix/refresh-token-expiry`).
- Keep commits scoped and messages in the Conventional Commits format.
- Open your PR **against `main`**. Ensure the affected apps' lint, type-check, and unit tests pass first.
