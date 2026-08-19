# Config, constants and bootstrap

The modules of simple functions in `core/infrastructure/config/` and in `core/infrastructure/database/` are tested as pure functions. `env-validation.config.spec.ts` is the model. Import `'reflect-metadata'` first, then make a `validEnv()` arrow that returns a complete environment. Assert the correct case, one test for each absent or incorrect variable, the message that groups several errors, and the changes of a string into a number. The spec also asserts the **absences**: the application needs no `DOCKER` variable, and it accepts a removed variable as an additional value with no validation. Thus a removed feature stays removed.

A file of constants gets a spec only if the value itself is a contract (e.g. `GITPAAS_CONTROL_PLANE_PROJECTS` must be equal to `['gitpaas', 'gitpaas-dev']`).
