# Running the suite

`apps/backend/package.json` declares two test scripts only: `test` (`jest`) and `test:e2e` (`jest --config ./test/jest-e2e.json`).

```bash
# Full backend suite (run from apps/backend)
rtk pnpm test

# Scoped run — Jest treats the trailing argument as a testPathPattern regex
rtk pnpm test -- projects
rtk pnpm test -- src/features/services/infrastructure/database

# Every app's unit tests, from the repo root (turbo run test)
rtk pnpm test
```

Obey these constraints of the project:

- **Put `rtk` before each shell command.** This rule applies also to `git` and to `gh`.
- **Do not run ESLint.** This is the responsibility of the user.
- **Do not run `test:e2e` or a test that uses Playwright.**
- **Do not install a dependency.** If a package is absent, give the name of the package to the caller.
