## 1. Phase 1 — The settings of the server

Agent: implementer
Paths: apps/backend/src/features/server/

- [x] 1.1 **Decided: 30 days.** The value by default of the age is 30 days.
- [x] 1.2 Create in the feature `server` the entity of the settings of the platform: one row, and one typed column for the age in days.
- [x] 1.3 Hold the value by default in the code, and give it for every read that finds no row.
- [x] 1.4 Create the use case that reads the settings, and the use case that writes them.
- [x] 1.5 Refuse in the write a value below 1 day and above 365 days, and answer `400`.
- [x] 1.6 Add the endpoint that reads the settings and the endpoint that writes them, both behind an access token.
- [x] 1.7 Create the specs of the two use cases: the read with no row, the read with a row, a value inside the bounds, and a value outside them.

## 2. Phase 2 — The removal

Agent: implementer
Paths: apps/backend/src/features/logs/, apps/backend/src/features/server/

- [x] 2.1 Add to the repository of the logs the operation that removes the rows older than a date, with a bounded count.
- [x] 2.2 Add the index on the date of the creation of a log row, if none exists, so the read of each batch stays cheap.
- [x] 2.3 Create the use case that removes the rows that passed the age, and that runs again until it removes none. It reads the age from the settings on every run.
- [x] 2.4 Create the task that runs the use case on a schedule, with `@nestjs/schedule`, which `package.json` already holds.
- [x] 2.5 Catch every failure of the task, write it into the log of the application, and let the next run try again.
- [x] 2.6 Create the specs of the use case: many rows, no row, a changed age, and a removal that fails.

## 3. Phase 3 — The three cases of the durable list

Agent: implementer
Paths: apps/backend/src/features/logs/, packages/contracts/

- [x] 3.1 Separate the three cases in the answer of `GET /api/v1/logs`: the output is available, the run has not ended, and the output went away because of its age.
- [x] 3.2 Read the state and the date of the end of the deployment to tell the second case from the third.
- [x] 3.3 Update the spec of the endpoint for the three cases.

## 4. Phase 4 — The screen of the server

Agent: implementer
Paths: apps/frontend/src/app/features/server/, apps/frontend/src/app/pages/server/

- [x] 4.1 Change the route of the page: `/server` sends the browser to `/server/health`, and `/server/:tab` serves the page.
- [x] 4.2 Show the three tabs with the component `@shared/components/tabs`: Health, Maintenance and Settings. An unknown tab reads as Health.
- [x] 4.3 Move the panel of the health into the tab Health, and the four actions of Docker into the tab Maintenance.
- [x] 4.4 Build the tab Settings: the form of the age in days, its limits next to the field, and the message of the result of the save.
- [x] 4.5 Read the settings when the tab opens, and write them when the user saves.
- [x] 4.6 Create the specs of the container of the settings and of the choice of the tab.

## 5. Phase 5 — The window of the output

Agent: implementer
Paths: apps/frontend/src/app/features/deployments/

- [x] 5.1 Say in the window of the output why a list is empty, with the reason that the API gives.
- [x] 5.2 Create the spec of that message.