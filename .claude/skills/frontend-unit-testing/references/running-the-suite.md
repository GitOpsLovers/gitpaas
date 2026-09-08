# Running the suite

`apps/frontend/package.json` declares one script of the tests: `test` (`ng test --watch=false`).
The builder `@angular/build:unit-test` compiles the specs with `tsconfig.spec.json`, and it runs them with Vitest 4 in `jsdom`.
The configuration is `apps/frontend/angular.json`, target `test`. The project holds no `vitest.config.ts`, and you must not add one.

```bash
# The whole suite of the frontend, from apps/frontend
rtk pnpm test

# One set of files — --include takes a glob, relative to apps/frontend
rtk pnpm test -- --include "src/app/features/projects/**/*.spec.ts"
rtk pnpm test -- --include "src/app/features/authentication/ui/guards/auth.guard.spec.ts"

# One set of names — --filter takes a regular expression over the names of the suites and of the tests
rtk pnpm test -- --filter "^AuthService"

# The suites of every application, from the root of the repository
rtk pnpm test
```

Obey these constraints of the project:

- **Put `rtk` before each shell command.**
- **Do not run ESLint.** This is the responsibility of the user.
- **Do not install a dependency.** If a package is absent, give its name to the caller.
- **Do not add a browser, and do not add an E2E test.** The suite runs in `jsdom`. If a test needs a real navigation or a real `localStorage`, give a double instead. See `storage-service.md` and `browser-adapter.md`.
