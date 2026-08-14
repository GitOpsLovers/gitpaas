## Why

The archive of the logs grows and nothing removes a row by its age. An archived row goes away only when its
deployment goes away, because the foreign key removes it in a cascade. `LOGS_MAX_LINES` limits the size of
one log, and it limits nothing across the installation.

Thus the table grows with the number of the deployments, for as long as the installation lives. A server
that deploys ten services a day writes a log for each run, keeps every one, and fills its disk with output
that nobody will read again.

## What Changes

- **New:** an archived log row goes away when it passes an age that the operator sets.
- **New:** a task runs on a schedule and removes the rows that passed that age.
- **Changed:** the removal of the output of a deployment no longer waits for the removal of the deployment
  itself. The record of the deployment stays, and its output goes away.

## Capabilities

### Modified Capabilities

- `logs`: an archived row has a life, and a task on a schedule removes the rows that passed it. A deployment
  whose output went away reads as an empty list, and not as a failure.

## Impact

**The backend.** The feature `logs` gains a use case that removes the rows by their age, and a task that
runs it on a schedule. `@nestjs/schedule` is already in `package.json`, so the change needs no new
dependency.

**The environment.** One new variable sets the age. It carries a value by default, so an installation that
sets nothing gets the behavior.

**The database.** No migration of the schema. The change needs an index on the date of the creation of a log
row, if none exists, so the removal does not read the whole table.

**The screen.** The durable list of the output of an old deployment becomes empty. The screen must say that
the output went away because of its age, and not show an empty list that reads as a defect.
