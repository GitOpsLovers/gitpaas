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
├── apps/
│   ├── backend/          # NestJS
│   └── frontend/         # Angular
├── .devcontainer/        # Dev container configuration
├── .vscode/              # VS Code workspace settings
├── .tool-versions        # Node/pnpm version pins
├── turbo.json            # Turborepo task pipeline
├── pnpm-workspace.yaml   # Workspace definition
└── package.json          # Root dependencies
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

| Task requested                                                                                          | Subagent               |
|---------------------------------------------------------------------------------------------------------|------------------------|
| Build a feature, fix a bug, wire an endpoint/controller/service/component, or otherwise change behavior | `implementer`          |
| Pure refactoring — restructure code without changing its behavior                                       | `refactorer`           |
| Write or update documentation, keep the `docs/` pages in sync, add doc-comments                         | `documenter`           |
| Analyze/audit the architecture, report on its state, or suggest improvements (read-only)                | `architecture-analyst` |

### Orchestration rules

- **Delegate; never do the work inline.** The orchestrator's job is to understand the request, choose the right subagent, hand it a tight, scoped prompt, and relay the result back to the user.
- **Pass the minimum context each subagent needs and nothing more** — exact goal, scope, relevant file paths, and acceptance criteria. Never assume a subagent can see this conversation.
- **Split multi-type requests.** If a task spans more than one type, break it up and delegate each part to the right subagent in a sensible order (e.g. `implementer` first, then `documenter`), reading each agent's report before launching the next.
- **Direct handling is the exception.** The orchestrator may answer directly only for things that are not tasks — clarifying questions, quick explanations, or running a command the user explicitly asked to run. Anything that reads or changes the codebase goes to a subagent.

### Project-wide constraints (every agent must follow)

- Never run ESLint; this is the user's responsibility.
- Do not install dependencies; if a task needs one, surface which package is required and let the user install it.
- Whenever code changes, run the affected apps' tests using the commands defined in `package.json` — but never run E2E tests with Playwright.