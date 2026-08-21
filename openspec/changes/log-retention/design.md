## Context

See proposal.md — Why.

The output of a deployment lives in two tiers. The hot store holds the output of a run, and it already expires: the copy stays 60 seconds after the archive. The archive in the database has no life at all.

The age itself has no home either. The platform keeps no parameter that an operator can change, so a value of this kind would land in the environment, where a change needs a restart of the server.

## Goals / Non-Goals

**Goals:**

- The archive of the logs stops growing without a limit.
- The operator sets the age on the screen, without a restart and without access to the host.
- An installation whose operator changed nothing still gets the behavior.
- A deployment whose output went away reads as a deployment whose output went away, and not as a defect.

**Non-Goals:**

- A limit on the size of the archive, in bytes or in rows. The age is the one rule. A limit on the size needs a policy about which log to drop first, and this change takes no view on that.
- The removal of the record of a deployment. The history of what ran stays. Only the output goes.
- A copy of the log to somewhere else before the removal. The output goes away.
- A general system of the settings, with a page of its own and a parameter for every feature. This change adds one parameter, in the place where a second one can join it later.
- A history of the changes of a parameter, and an age per project or per service.

## Decisions

**1. The age is the one rule, and it is measured from the creation of the row.**

A row of the log carries the date of its creation. The rule reads: a row older than the age goes away. It needs no join, no state, and no other table.

**Alternative that the change does not take:** the age of the deployment. It reads the same for almost every row, and it needs a join for every removal.

**2. The task runs on a schedule, and it removes in batches.**

A removal of a year of the output in one statement locks the table. The task removes a bounded number of rows, and it runs again until it removes none.

**3. The value by default lives in the code, and one row of the settings holds the value that the operator sets.**

The settings of the server are one table with one row and with typed columns. A read that finds no row gives the value by default, so the behavior starts before the operator opens the screen.

**Alternative that the change does not take:** a table of keys and values. A typed column validates its value, and a bag of strings does not. The bag also invites a parameter for every feature, which the Non-Goals refuse.

An operator reads a log to find out why a deployment failed, and that reading happens within days. The value by default is therefore measured in weeks, and not in years. `tasks.md` carries the exact number as a decision, because it is a product judgment and not a technical one.

**4. The task reads the settings on every run.**

The task reads one row of one table, and that read costs almost nothing next to the removal itself. So a change of the value applies at the next run, and the server needs no restart. No copy of the value lives in the memory of the process.

**5. The value has bounds.**

The API refuses a value below 1 day and above 365 days, and it answers `400`. The screen states the same limits next to the field. A value of 0 would remove the output of every deployment that already ended, and an operator does not mean that when they type it.

**6. The route carries the tab.**

`/server` sends the browser to `/server/health`, and `/server/:tab` serves the three tabs: Health, Maintenance and Settings. Health is the main tab, because the operator opens the screen to read the state of the server.

This copies the page of the detail of a service, which already reads the tab from the route, and it reuses the component `@shared/components/tabs`. So a link to one tab stays a link, and the button of the browser that goes back works.

**7. The screen names the reason.**

The durable list of an old deployment becomes empty. An empty list already means "the run has not ended yet", so the screen would say the wrong thing. The answer therefore separates the two: the output has not been archived yet, or the output went away because of its age.

## Risks / Trade-offs

**An operator loses a log that they wanted.** → The screen states the value and its limits, and the operator raises it before the age passes. Once a row goes away, it does not come back.

**An operator writes a very short age, and the next run removes almost everything.** → The bounds refuse a value below one day, and the text of the screen says what the value does. The change adds no question before the save, because the removal is not immediate.

**The removal is slow on a table that grew for a year before the change lands.** → The first run removes far more than a later one. The batch keeps each statement bounded, and the task runs again until nothing is left. An index on the date of the creation keeps the read of each batch cheap.

**A deployment that reads as broken.** An operator opens an old deployment, sees no output, and reports a defect. → The screen names the reason, which is the seventh decision.

**The move of the four actions into a tab hides them.** An operator who knows the screen finds the actions in a new place. → The tab carries the name Maintenance, and the three tabs are visible at the same time.

## Migration Plan

1. The entity of the settings and the index on the date of the creation arrive with the code. The project runs no migration tool, so `synchronize` builds them.
2. The settings hold no row until the operator saves one time. Until then, every read gives the value by default.
3. The task runs for the first time and removes everything that already passed the age. On an installation that ran for a long time, this is the largest single run, and it happens in batches.
4. A rollback removes the task and the tabs. The rows that already went away do not come back.
