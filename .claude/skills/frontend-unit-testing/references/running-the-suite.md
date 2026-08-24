# Running the suite

## The commands of the suite

```bash
# Full frontend suite (run from apps/frontend)
rtk pnpm test

# Scoped run — the builder takes a glob of the files, relative to the root of the project
rtk pnpm test -- --include "src/app/features/projects/**/*.spec.ts"
```

`apps/frontend/package.json` declares one test script only: `test` (`ng test --watch=false`). The builder `@angular/build:unit-test` compiles the specs with `tsconfig.spec.json` and runs them with Vitest in `jsdom`. There is no `vitest.config.ts` in the project, and you must not add one.

```bash
# Full frontend suite (run from apps/frontend)
rtk pnpm test

# Scoped run by file — --include takes a glob, relative to the root of the project
rtk pnpm test -- --include "src/app/features/projects/**/*.spec.ts"
rtk pnpm test -- --include "src/app/features/authentication/ui/guards/auth.guard.spec.ts"

# Scoped run by name — --filter takes a regular expression over the names of the suites and of the tests
rtk pnpm test -- --filter "^AuthService"

# Every app's unit tests, from the repo root (turbo run test)
rtk pnpm test
```

Obey these constraints of the project:

- **Put `rtk` before each shell command.** This rule applies also to `git` and to `gh`.
- **Do not run ESLint.** This is the responsibility of the user.
- **Do not run a test that uses Playwright.** The frontend has no E2E script, and you must not add one.
- **Do not install a dependency.** If a package is absent, give the name of the package to the caller.
- **Do not add a browser.** The suite runs in `jsdom`. If a test needs a real layout, a real navigation or a real `localStorage`, give a double instead. See `storage-service.md` and `browser-adapter.md`.
