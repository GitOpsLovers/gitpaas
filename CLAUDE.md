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

- The agent should never run ESLint; this is the user's responsibility.
- If new dependencies need to be installed, ask the user to install them, specifying which ones.
- For any pure refactoring task delegate to the `refactorer` subagent instead of doing it inline. Give it the complete scope (exact goal + file paths) in the prompt, since it starts with no conversation history. Do not delegate bug fixes or new features to it.
- For any documentation task (writing or updating docs, keeping the `docs/` pages in sync, adding doc-comments) delegate to the `documenter` subagent instead of doing it inline. Give it the complete scope (what to document + file paths + where the output goes) in the prompt, since it starts with no conversation history. Do not delegate code changes to it.
- Whenever a change is made, run the tests on the affected apps using the commands defined in package.json, but never run E2E tests with Playwright.