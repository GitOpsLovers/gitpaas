# Conventions

- The name of each workspace package is `@gitopslovers/gitpaas/<app>`.
- All the applications give the same script names (`dev`, `build`, `lint`, `test`). Thus the root command `turbo run <task>` operates in the same manner for each application.
- The Node and pnpm versions are set in one place (`.tool-versions`). The same values are copied into `engines`, `packageManager` and the Docker build arguments in `iac/production/`.
- Commits obey the Conventional Commits rules. The commits control the semantic version and the release notes.
- Each application declares its own runtime dependencies. The root declares only `turbo` and `typescript`.
