## 1. The age and its variable

- [ ] 1.1 **Decision needed.** Choose the value by default of the age, measured in days. `design.md` argues for weeks and not years, and the exact number is a product judgment.
- [ ] 1.2 Add the variable `LOGS_RETENTION_DAYS` to the validation of the environment, with that value by default.
- [ ] 1.3 Add the variable to `iac/production/.env.example` and to `apps/backend/.env.example`.
- [ ] 1.4 State the value by default in the summary of the installer, so an operator who needs a longer life raises it before the age passes.

## 2. The removal

- [ ] 2.1 Add to the repository of the logs the operation that removes the rows older than a date, with a bounded count.
- [ ] 2.2 Add the index on the date of the creation of a log row, if none exists, so the read of each batch stays cheap.
- [ ] 2.3 Create the use case that removes the rows that passed the age, and that runs again until it removes none.
- [ ] 2.4 Create the task that runs the use case on a schedule, with `@nestjs/schedule`, which `package.json` already holds.
- [ ] 2.5 Catch every failure of the task, write it into the log of the application, and let the next run try again.
- [ ] 2.6 Create the specs of the use case: many rows, no row, and a removal that fails.

## 3. The three cases of the durable list

- [ ] 3.1 Separate the three cases in the answer of `GET /api/v1/logs`: the output is available, the run has not ended, and the output went away because of its age.
- [ ] 3.2 Read the state and the date of the end of the deployment to tell the second case from the third.
- [ ] 3.3 Update the spec of the endpoint for the three cases.

## 4. The screen

- [ ] 4.1 Say in the window of the output why a list is empty, with the reason that the API gives.
- [ ] 4.2 Create the spec of that message.

## 5. What this change does not close

- [ ] 5.1 Record that the leak of the hot store stays open. `docs/TODO.md` holds it: nothing recovers the streams of Redis that an interrupted deployment leaves behind. This change removes rows of the archive, and it touches no key of the hot store.
