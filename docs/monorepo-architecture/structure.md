# Structure

```text
├── .claude/              # AI instructions, skills, agents
├── .devcontainer/        # Dev container configuration
├── .github/workflows/    # CI: pr-verify.yml, release.yml
├── .vscode/              # Workspace settings
├── apps/
│   ├── backend/          # NestJS API
│   └── frontend/         # Angular SPA
├── docs/                 # Project documentation
├── iac/                  # development/ and production/ infrastructure
├── .dockerignore
├── .releaserc.json       # semantic-release configuration
├── .tool-versions        # Node/pnpm pins
├── CLAUDE.md             # Agent instructions
├── CONTRIBUTING.md
├── package.json          # Root scripts + turbo
├── pnpm-workspace.yaml   # Workspace definition
└── skills-lock.json      # AI skills lockfile
```
