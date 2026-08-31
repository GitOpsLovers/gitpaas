# update-check-button

GitPaaS checks for a new release every 6 hours and one time at the boot. An administrator who waits for a version cannot start that check, and the source of GitHub hides its own errors, so a failed check looks the same as a current version. This feature adds a button to the card Maintenance that starts the check at once, and it makes a failure visible. The automatic check, the cron and the flow of the update itself do not change. The store of the release stays in memory, and no rate limit stands between two manual checks.

## Phase 1 — The check on demand in the backend

**Agent:** implementer
**Paths:** apps/backend/src/features/server/

- [x] 1.1 Change the adapter of the source of GitHub so that it reports a failure instead of `null`, and keep the timeout of 5 seconds.
- [x] 1.2 Change the use case of the check so that it propagates that failure, and keep the previous value in the store.
- [x] 1.3 Add `POST /server/update/check` to the controller of the server, for an administrator alone. It runs the check, and it returns the status of the update with the code 200.
- [x] 1.4 Make the endpoint answer with an error of the server when the source of GitHub fails.
- [x] 1.5 Let the endpoint run even when `UPDATE_CHECK_ENABLED` is false, because a person asks for the check.
- [x] 1.6 Write the unit tests of the adapter, of the use case and of the controller.
- [x] 1.7 Run `rtk pnpm run check-types --filter @gitpaas/backend`.

## Phase 2 — The button on the page of the maintenance

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/server/

- [x] 2.1 Add the method that calls `POST /server/update/check` to the repository of the API of the server.
- [x] 2.2 Add the button "Check for updates" to the card Maintenance. It stays visible even when the version is current.
- [x] 2.3 Show the four states of the button: idle, in progress, success and failure. Disable the button while the check runs.
- [x] 2.4 Refresh the resource of the status of the update with the answer, so that the alert of the update appears when a new version exists.
- [x] 2.5 Show a message of error when the check fails, and keep the version that the page shows.
- [x] 2.6 Write the unit tests of the repository and of the component.
- [x] 2.7 Run `rtk pnpm run check-types --filter @gitpaas/frontend`.

## Phase 3 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 3.1 Correct `docs/business/server.md`: the check on demand, the new action of the card Maintenance and the new state of the alert.
- [ ] 3.2 Write the new endpoint into the page of the architecture of the backend that lists the endpoints of the server.
- [ ] 3.3 Delete the folder `docs/roadmap/update-check-button/`, and its line of `docs/roadmap.md`.
