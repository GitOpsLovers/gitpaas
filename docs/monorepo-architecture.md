# Monorepo Architecture

## Contents

```
├── .claude/              # Instructions, skills, and agents for AI
├── .devcontainer/        # Dev container configuration
├── .github/              # Github workflows
├── .vscode/              # VS Code workspace settings
├── apps/
│   ├── backend/          # NestJS
│   └── frontend/         # Angular
├── docs/                 # Project documentation
├── iac/                  # Infrastructure for development and production
├── .dockerignore         # Ignores for Dockerfiles
├── .gitignore            # Ignores for Git
├── .releaserc.json       # Configuration for Semantic release
├── .tool-versions        # Node/pnpm version pins
├── CLAUDE.md             # General instructions for the AI Agent
├── CONTRIBUTING.md       # Document for making contributions
├── LICENSE               # License document
├── package.json          # Root dependencies
├── pnpm-workspace.yaml   # Workspace definition
├── README.md             # Project description
├── skills-lock.json      # AI skills definition
└── turbo.json            # Turborepo task pipeline
```

### Available scripts

| Script  | Command           | Purpose |
|---------|-------------------|---------|
| `dev`   | `turbo run dev`   |
| `build` | `turbo run build` |
| `lint`  | `turbo run lint`  |
| `test`  | `turbo run test`  |

### Turborepo Pipeline

- `build`: depends on `^build` (parallelizable across apps).
- `dev`: no cache, persistent.
- `lint`: depends on `^lint`.