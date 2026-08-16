## Context

See proposal.md — Why.

The output of a deployment lives in two tiers. The hot store holds the output of a run, and it already expires: the copy stays 60 seconds after the archive. The archive in the database has no life at all.

## Goals / Non-Goals

**Goals:**

- The archive of the logs stops growing without a limit.
- The operator sets the age, and an installation that sets nothing still gets the behavior.
- A deployment whose output went away reads as a deployment whose output went away, and not as a defect.

**Non-Goals:**

- A limit on the size of the archive, in bytes or in rows. The age is the one rule. A limit on the size needs a policy about which log to drop first, and this change takes no view on that.
- The removal of the record of a deployment. The history of what ran stays. Only the output goes.
- A copy of the log to somewhere else before the removal. The output goes away.

## Decisions

**1. The age is the one rule, and it is measured from the creation of the row.**

A row of the log carries the date of its creation. The rule reads: a row older than the age goes away. It needs no join, no state, and no other table.

**Alternative that the change does not take:** the age of the deployment. It reads the same for almost every row, and it needs a join for every removal.

**2. The task runs on a schedule, and it removes in batches.**

A removal of a year of the output in one statement locks the table. The task removes a bounded number of rows, and it runs again until it removes none.

**3. The value by default keeps the output long enough to be useful.**

An operator reads a log to find out why a deployment failed, and that reading happens within days. The value by default is therefore measured in weeks, and not in years. `tasks.md` carries the exact number as a decision, because it is a product judgment and not a technical one.

**4. The screen names the reason.**

The durable list of an old deployment becomes empty. An empty list already means "the run has not ended yet", so the screen would say the wrong thing. The answer therefore separates the two: the output has not been archived yet, or the output went away because of its age.

## Risks / Trade-offs

**An operator loses a log that they wanted.** → The value by default is stated in the installer and in the documentation, and the operator raises it before the age passes. Once a row goes away, it does not come back.

**The removal is slow on a table that grew for a year before the change lands.** → The first run removes far more than a later one. The batch keeps each statement bounded, and the task runs again until nothing is left. An index on the date of the creation keeps the read of each batch cheap.

**A deployment that reads as broken.** An operator opens an old deployment, sees no output, and reports a defect. → The screen names the reason, which is the fourth decision.

## Migration Plan

1. The change adds the index on the date of the creation, if none exists.
2. The task runs for the first time and removes everything that already passed the age. On an installation that ran for a long time, this is the largest single run, and it happens in batches.
3. A rollback removes the task. The rows that already went away do not come back.
