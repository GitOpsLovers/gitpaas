# platform-update

GitPaaS installs itself with `scripts/install.sh`, and no procedure updates it after that. An operator who wants a new version repeats the installation by hand, and the platform never says that a new release exists.

We add the script `update.sh`, which refreshes the source, applies the new migrations and pulls the new images. A short-lived container of the update runs that script, so it survives the restart of the backend. The tab "Maintenance" reports a new release, it starts the update, it shows the progress, and it reloads the page at the end.

The rollback stays out of scope, and a failed update needs a manual recovery.

## Phase 1 — The script of the update and its image

**Agent:** implementer
**Paths:** scripts/, iac/production/, .github/workflows/

- [ ] 1.1 Write `scripts/update.sh` beside `install.sh`. It takes an optional `--version`, and it resolves the latest release when the flag is absent.
- [ ] 1.2 Download the tarball of the target version, and replace `/opt/gitpaas/iac/production/` with its content. Never skip the download when the folder exists.
- [ ] 1.3 Keep the values of the existing `.env`, and write the new `IMAGE_TAG`. Add every new key of `.env.example` that the file misses.
- [ ] 1.4 Apply the new files of `iac/production/migrations/` through the ledger `schema_migrations`, with the same logic as `install.sh`.
- [ ] 1.5 Run `compose pull` and `compose up -d` at the end, and report a non-zero code when a step fails.
- [ ] 1.6 Refuse the value `latest` for `IMAGE_TAG` in `update.sh` and in `install.sh`. Both scripts stop with a message.
- [ ] 1.7 Write each step of the script to the table of the state of the update in PostgreSQL, with `psql`: the step, the percent and the error.
- [ ] 1.8 Bake `APP_VERSION` into the images of the backend and of the frontend in `.github/workflows/release.yml`, with the value of the tag of the release.

## Phase 2 — The version, the check and the endpoint of the update

**Agent:** implementer
**Paths:** apps/backend/src/features/server/, iac/production/migrations/

- [ ] 2.1 Add the migration that creates the table of the state of the update: the identifier, the target version, the step, the percent, the state and the error.
- [ ] 2.2 Report the installed version from the image that runs, with `resolveServiceVersion()`. That value is the one source of truth.
- [ ] 2.3 Add a job of the cron that reads `releases/latest` of the GitHub API, and that stores the answer. Add the setting that disables the job.
- [ ] 2.4 Add `GET /server/update` for an administrator. It answers the installed version, the latest version and the state of the last update.
- [ ] 2.5 Add `POST /server/update` for an administrator. It starts the detached container of the update, which mounts `/opt/gitpaas` and the socket of Docker, and it runs `update.sh`.
- [ ] 2.6 Refuse a second update while one runs, and refuse the start when the installed version is unknown or equal to the latest version.
- [ ] 2.7 Write the unit tests of the new use cases, of the job and of the controller.
- [ ] 2.8 Run `rtk pnpm run check-types --filter @gitpaas/backend`.

## Phase 3 — The notification, the button and the progress

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/server/

- [ ] 3.1 Add the two operations of `GET /server/update` and of `POST /server/update` to `server-api.repository.ts`.
- [ ] 3.2 Show an alert "A new version X.Y.Z is available" at the top of the tab "Maintenance" when the two versions differ. Show nothing when they are equal.
- [ ] 3.3 Add the button of the update to that alert, behind the modal of the confirmation of the feature.
- [ ] 3.4 Poll `GET /server/update` every two seconds while an update runs, and show a bar of the progress with the name of the step.
- [ ] 3.5 Reload the page when the state reports the end and the installed version is equal to the target version.
- [ ] 3.6 Show the error and the last step after a failure or after a timeout, and do not reload the page.
- [ ] 3.7 Hide the alert and the button from a user who is not an administrator.
- [ ] 3.8 Write the unit tests of the panel and of the container, and run `rtk pnpm run check-types --filter @gitpaas/frontend`.

## Phase 4 — The documentation of the behavior

**Agent:** documenter
**Paths:** docs/business/, docs/architecture/infrastructure/
**This is the last phase.**

- [ ] 4.1 Write the update of the platform into `docs/business/server.md`, and correct the section "The four actions of the maintenance".
- [ ] 4.2 Add the section of `update.sh` to `docs/architecture/infrastructure/installation.md`, and add the flow of the update to `key-flows.md`.
- [ ] 4.3 Correct the drift of `installation.md`: the flags `--dir` and `--email` do not exist, and `scripts/import-github-app-provider.sh` does not exist.
- [ ] 4.4 Delete the folder `docs/roadmap/platform-update/`, and its line of `docs/roadmap.md`.
