# The reduction of the complexity

The audit of the three areas found that the architecture of GitPaaS is sound: the dependencies point inward, every use case is a pure function, and no page injects a service. The cost sits in three other places — the same code written two to four times, a unit that holds two jobs, and dead code that a reader must still read. We remove those, and we keep every rule of the business exactly as it is today. This list takes the cheap sweep and the two structural cuts; the redistribution of `providers`, of the translator of the errors and of the filter of the exceptions stays out of scope, and it takes its own folder if the user wants it. No task here changes a behavior, so no page of `docs/business/` becomes false.

## Phase 1 — The build of the release

**Agent:** implementer
**Paths:** iac/production/, .github/workflows/

- [ ] 1.1 Copy `packages/contracts/` into the two Dockerfiles of the production, so an image builds again.
- [ ] 1.2 Make `turbo.json` build `contracts` before `dev`.
- [ ] 1.3 Correct `globalPassThroughEnv`: remove the variable that does not exist, and add the one that does.

## Phase 2 — The duplication of the backend

**Agent:** implementer
**Paths:** apps/backend/src/

- [ ] 2.1 Extract the wrapper `run<T>` of the telemetry, which four adapters copy.
- [ ] 2.2 Extract the block of the emission of the telemetry, which the middleware and the runner of the deployments copy.
- [ ] 2.3 Split `deployment-runner.service.ts`: the queue on one side, the telemetry on the other.
- [ ] 2.4 Stop `logs.module.ts` re-providing the two repositories that other modules already own.
- [ ] 2.5 Align the three patterns of "not found" of the controllers on one pattern.

## Phase 3 — The dead code of the backend

**Agent:** implementer
**Paths:** apps/backend/src/, packages/contracts/

- [ ] 3.1 Stop exporting the three providers that no consumer outside their feature uses.
- [ ] 3.2 Delete the dead export and the exports that the tests alone use.
- [ ] 3.3 Correct the drift of the naming and of the placement that the audit listed.
- [ ] 3.4 Delete the 46 exports of `@gitpaas/contracts` that neither application uses.
- [ ] 3.5 Delete the readiness that `app.controller.ts` and `app.service.ts` duplicate.

## Phase 4 — The duplication of the frontend

**Agent:** implementer
**Paths:** apps/frontend/src/app/

- [ ] 4.1 Delete the engine of the submenu of the sidebar, which no item of the navigation uses.
- [ ] 4.2 Delete the dead API of the icon of the shared button, and the bypass of the HTML that it forces.
- [ ] 4.3 Move the two containers that live in `ui/components/` and inject a repository.
- [ ] 4.4 Give the route parameters one road into the containers, and not two.
- [ ] 4.5 Put the breadcrumb in one place, and not in the page four times and in the container five times.
- [ ] 4.6 Split `server-maintenance`: the prune, the removal of the orphans, and the formatter.
- [ ] 4.7 Write the shell of the tabs one time, and not twice.

## Phase 5 — The conventions of the frontend

**Agent:** implementer
**Paths:** apps/frontend/src/app/

- [ ] 5.1 Replace the decorator `@Output()` of the two shared primitives with the function `output()`.
- [ ] 5.2 Remove `CommonModule` and `ngClass` from the shell, which the conventions forbid.
- [ ] 5.3 Move the three shared items that serve one caller each into that caller.
- [ ] 5.4 Delete the placeholder data of `pages/dashboard`.
- [ ] 5.5 Remove the check of the authentication that the two containers of the registration repeat after the guard.

## Phase 6 — The tests and the infrastructure

**Agent:** implementer
**Paths:** apps/frontend/src/app/shared/, turbo.json, iac/, .github/

- [ ] 6.1 Write the specs of `shared/` of the frontend, which holds no test at all.
- [ ] 6.2 Keep the cache of Turborepo in CI, and stop repeating the setup.
- [ ] 6.3 Correct the outputs of the four tasks of turbo that do not match their command.
- [ ] 6.4 Lint `contracts` as a package of vitest, and not of jest.
- [ ] 6.5 Pin the version of Node and of pnpm in one place, and point the eight others at it.
- [ ] 6.6 Keep `.dev/` out of the context of the build of Docker, private keys included.
- [ ] 6.7 Delete the scripts and the tasks that nothing calls, and give `install.sh` the port that it made configurable.

## Phase 7 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 7.1 Correct the pages of `docs/architecture/` that the refactors made false.
- [ ] 7.2 Delete this folder of the roadmap, and remove its line from `docs/roadmap.md`.
