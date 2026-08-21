## Why

The archive of the logs grows and nothing removes a row by its age. An archived row goes away only when its deployment goes away, because the foreign key removes it in a cascade. `LOGS_MAX_LINES` limits the size of one log, and it limits nothing across the installation.

Thus the table grows with the number of the deployments, for as long as the installation lives. A server that deploys ten services a day writes a log for each run, keeps every one, and fills its disk with output that nobody will read again.

The age itself needs a home. A value that lives in the environment needs a restart of the server, and only the person with access to the host can change it. The operator who reads the logs works on the screen, and that is where the value belongs.

## What Changes

- **New:** an archived log row goes away when it passes an age that the operator sets.
- **New:** the operator sets that age on the screen of the server. The system carries a value by default, so an installation that changes nothing still removes its old rows.
- **New:** a task runs on a schedule and removes the rows that passed that age.
- **New:** the screen of the server becomes a set of tabs: Health, Maintenance and Settings. Health is the main tab, and the four actions of Docker move into Maintenance.
- **Changed:** the removal of the output of a deployment no longer waits for the removal of the deployment itself. The record of the deployment stays, and its output goes away.

## Capabilities

### Modified Capabilities

- `logs`: an archived row has a life, and a task on a schedule removes the rows that passed it. A deployment whose output went away reads as an empty list, and not as a failure.
- `server`: the screen carries tabs, and the platform keeps the parameters of the deployment system that the operator sets. The age of a log is the first parameter.

## Impact

**The backend.** The feature `logs` gains a use case that removes the rows by their age, and a task that runs it on a schedule. `@nestjs/schedule` is already in `package.json`, so the change needs no new dependency. The feature `server` gains the settings of the platform: one entity, the two use cases that read and write them, and two endpoints.

**The environment.** No new variable. The value by default lives in the code, and the settings hold the value that the operator sets.

**The database.** One new table for the settings, and it holds one row. The change needs an index on the date of the creation of a log row, if none exists, so the removal does not read the whole table. The project runs no migration tool, so the entities carry both, and `synchronize` builds them.

**The screen.** The page of the server changes its route to `/server/:tab`, and it serves three tabs. The durable list of the output of an old deployment becomes empty. The screen must say that the output went away because of its age, and not show an empty list that reads as a defect.
