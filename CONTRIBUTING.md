# Contributing

Thanks for contributing to **GitPaaS**, a self-hostable PaaS platform for deploying personal projects. 

For architecture and design context, start with the documentation and come back here for the day-to-day workflow:

- [Backend architecture](./docs/backend-architecture.md)
- [Frontend architecture](./docs/frontend-architecture.md)
- [Infrastructure architecture](./docs/infrastructure-architecture.md)

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

GitPaaS deploys applications by driving the **local Docker daemon** through the `/var/run/docker.sock` unix socket (see [infrastructure-architecture.md](./docs/infrastructure-architecture.md)). Locally that is your own Docker, so everything you deploy lands on your machine. The stack in `iac/development/docker-compose.yml` provides the remaining services the project depends on:

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
| `architecture-analyst` | Audit the structure, and report. It never writes code                                                                      |
| `git-manager`          | Branch, commit, push, and open the Pull Request. It is the only agent that runs a `git` or `gh` command that changes state |

The orchestrator follows the skill `.claude/skills/agent-orchestration/SKILL.md`. Every agent follows `CLAUDE.md`. Read those two files if you want the exact rules.

### When a change needs a proposal

A task that changes behavior gets one first — a new capability, a changed rule, a new flow that the user sees. Four kinds of task need none: a bug fix that restores the documented behavior, a pure refactor, a documentation edit and a configuration edit. Those go straight to the code.

### What a session looks like

1. **You describe the work.** If the idea is unclear, run `/opsx:explore` first.
2. **You run `/opsx:propose`.** It writes the four artifacts of the change folder. It writes no code.
3. **You read the plan, and you approve it.** This is the first stop. No agent starts before it. Run `/opsx:update` if you want the plan changed.
4. **The orchestrator delivers one phase.** It reads `tasks.md`, it takes the next phase, and it hands each group of tasks to a subagent. Two groups that touch different areas run at the same time.
5. **The orchestrator runs `tester` one time for the phase**, and it derives the cases from the scenarios of the specification.
6. **`git-manager` opens the Pull Request of the phase.** One phase gives one branch, one commit and one Pull Request.
7. **You review the Pull Request, and you merge it.** This is the second stop. No agent merges.
8. **Steps 4 to 7 repeat, one time for each phase.** Before the commit of the last phase, and one time alone, `/opsx:sync` merges the delta into `openspec/specs/`.
9. **`/opsx:archive` runs after the last merge**, and it moves the change into `openspec/changes/archive/`.

Between the two stops, the agents work without a further question.

### One phase, one Pull Request

A change is delivered in phases, and never in one large Pull Request. A phase is the smallest set of tasks that leaves the two applications in a state that builds and that passes the tests. `tasks.md` names the phase, the agent and the paths at the head of each section:

```markdown
## 2. Phase 2 — The removal

Agent: implementer
Paths: apps/backend/src/features/logs/, apps/backend/src/features/server/

- [ ] 2.1 ...
```

The subagent that finishes a task marks its own box. So the file shows you the real progress.

### What a change folder holds

```text
openspec/changes/<change-id>/
  proposal.md   why the change exists, and what it changes
  design.md     the technical decisions, and the alternatives rejected
  tasks.md      the work, as a list of boxes that the agent marks
  specs/        the difference that the change makes to openspec/specs/
```

The commit stages `openspec/changes/<change-id>/` together with the code, so the specification and the code enter the repository at the same time. The Pull Request carries a title alone, so the body of the commit names the change and the phase. The branch takes its name from the change: the change `add-remember-me` gives the branch `feat/add-remember-me`.

### The commands

| The command | What it does | Who runs it |
|---|---|---|
| `/opsx:explore` | Investigate an unclear idea | You |
| `/opsx:propose` | Write the proposal, the design, the specs and the task list | You |
| `/opsx:update` | Revise those artifacts | You |
| `/opsx:sync` | Merge the delta into the main specifications | The orchestrator, before the last phase |
| `/opsx:archive` | Archive the change | The orchestrator, after the last merge |

Read the state of the work with the CLI:

```bash
openspec list                        # the capabilities and the active changes
openspec show <change>               # one change
openspec status --change <change>    # how many tasks are done
openspec validate --all              # check every file
```

Install the CLI with `npm install -g @fission-ai/openspec@latest`.

`openspec/config.yaml` holds the context of the project and the rules of each artifact. The CLI gives
them to every command, so a proposal comes out in the shape that this repository delegates from. Edit
that file when a convention changes, and not the command files of `.claude/commands/opsx/`.

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
