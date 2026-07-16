# Artifactory — Project conventions

## Tech stack

- **Monorepo:** Turborepo with pnpm workspaces
- **Package manager:** pnpm
- **Node:** 26.1.0 (pinned in `.tool-versions`)
- **Backend:** NestJS v11
- **Frontend:** Angular v22
- **Language:** TypeScript
- **Styling:** Saas
- **Database:** PostgreSQL via TypeORM
- **Linting:** ESLint v10 with `@gitopslovers/eslint-config-multistack`

## Monorepo structure

```
├── .claude/              # Instructions, skills, and agents for AI
├── .devcontainer/        # Dev container configuration
├── .vscode/              # VS Code workspace settings
├── apps/
│   ├── backend/          # NestJS
│   └── frontend/         # Angular
├── docs/                 # Project documentation
├── iac/                  # Infrastructure for development and production
├── .tool-versions        # Node/pnpm version pins
├── package.json          # Root depemdemcoes
├── pnpm-workspace.yaml   # Workspace definition
└── turbo.json            # Turborepo task pipeline
```

---

## App: Backend (`apps/backend/`)

If the agent needs information about the backend application, refer to the [backend-architecture document](./docs/backend-architecture.md) document.

---

## App: Frontend (`apps/frontend/`)

If the agent needs information about the frontend application, refer to the [frontend-architecture document](./docs/frontend-architecture.md) document.

---

## Root Level

### Scripts

| Script | Command |
|--------|---------|
| `dev` | `turbo run dev` |
| `build` | `turbo run build` |
| `lint` | `turbo run lint` |
| `test` | `turbo run test` |

### Turborepo Pipeline

- `build`: depends on `^build` (parallelizable across apps).
- `dev`: no cache, persistent.
- `lint`: depends on `^lint`.

---

## Work process

The main agent acts as an **orchestrator**. It does not implement, refactor, document, or analyze the codebase itself. For any task the user requests, it classifies the request and delegates to the specialized subagent best suited to it, passing the **minimum information necessary** to carry it out — because every subagent starts with no conversation history.

### Routing

Pick the subagent by the type of task requested:

| Task requested                                                                                                       | Subagent               |
|----------------------------------------------------------------------------------------------------------------------|------------------------|
| Build a feature, fix a bug, wire an endpoint/controller/service/component, or otherwise change behavior              | `implementer`          |
| Pure refactoring — restructure code without changing its behavior                                                    | `refactorer`           |
| Write, update, or expand automated tests (unit specs, coverage, fix failing tests) without changing product behavior | `tester`               |
| Write or update documentation, keep the `docs/` pages in sync, add doc-comments                                      | `documenter`           |
| Analyze/audit the architecture, report on its state, or suggest improvements (read-only)                             | `architecture-analyst` |
| Manage version control — create branches, commit, push, or open Pull Requests                                        | `git-manager`          |

### Orchestration rules

- **Delegate; never do the work inline.** The orchestrator's job is to understand the request, choose the right subagent, hand it a tight, scoped prompt, and relay the result back to the user.
- **Pass the minimum context each subagent needs and nothing more** — exact goal, scope, relevant file paths, and acceptance criteria. Never assume a subagent can see this conversation.
- **Split multi-type requests.** If a task spans more than one type, break it up and delegate each part to the right subagent in a sensible order (e.g. `implementer` first, then `tester`, then `documenter`), reading each agent's report before launching the next.
- **Dedicated test work goes to `tester`.** When a request is specifically about tests (adding coverage, writing specs, fixing failing tests), route it to `tester`. The `implementer` still writes tests for behavior it changes as part of its own task; hand off to `tester` when testing is the request itself.
- **Direct handling is the exception.** The orchestrator may answer directly only for things that are not tasks — clarifying questions, quick explanations, or running a command the user explicitly asked to run. Anything that reads or changes the codebase goes to a subagent.

### Project-wide constraints (every agent must follow)

- **Run every bash/CLI command through RTK.** Prefix all shell commands with `rtk` (e.g. `rtk pnpm run test`, `rtk nest build`, `rtk git status`). Never invoke a CLI tool directly.
- Never run ESLint; this is the user's responsibility.
- Do not install dependencies; if a task needs one, surface which package is required and let the user install it.
- Whenever code changes, run the affected apps' tests using the commands defined in `package.json` — but never run E2E tests with Playwright.

### Git & GitHub Workflow

**All Git/GitHub operations are delegated to the `git-manager` subagent.** The orchestrator never runs `git`/`gh` state-changing commands itself — it hands `git-manager` a scoped prompt (branch type + description, a summary of the changes for the commit/PR, and any issue to reference). The conventions below are the rules that agent follows.

**Branch Strategy:** Trunk-based development on `main`.
**Never commit directly to `main`.** All development tasks must begin by creating a new branch from the latest version of `main`.
**Branch naming:**

- `feat/<short-description>` for new features
- `fix/<short-description>` for fixes
- `chore/<short-description>` for maintenance tasks
- `docs/<short-description>` for documentation

**Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/) format: `type(scope): short description` (types: feat, fix, refactor, chore, docs, test). Subject lines ≤ 72 characters. Add a body when the diff is large.
**Before committing:** Run `pnpm run test` and make sure it passes.
**Tool:** Use the `gh` CLI for GitHub operations (branch, commit, push, PR).
**Standard workflow for each development task:**

1. Create and switch to a new branch from `main` (`git checkout -b <type>/<description>`).
2. Implement the change.
3. Run `pnpm run test` on the changed code and confirm that it passes.
4. Commit following Conventional Commits.
5. Run `git push -u origin <branch>`.
6. Open a Pull Request with `gh pr create`, including:
   - Summary of changes (“## Summary”)
   - Test plan (“## Test plan”) with a checklist
   - Reference to the issue if applicable (`Closes #N`)
7. **Never merge automatically.** The PR is pending human review.

**Confirmation:** Ask for explicit confirmation before running `git push` (a high-risk action because it affects the remote state).