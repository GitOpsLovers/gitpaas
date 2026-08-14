## MODIFIED Requirements

### Requirement: The tab "Deployments" shows the history

The tab `deployments` SHALL show one entry per deployment, the newest first.

Each entry holds the status, the first line of the message of the commit, the short form of the SHA, the
branch, the origin of the run, the date of the creation and the length of the run. An entry of a deployment
that failed also holds the message of the error.

The origin says `user`, `push` or `repeat`.

Each entry gives three actions: view the output, deploy that commit again, and remove the record.

While the reading runs and the list is empty, the tab says "Loading deployments…". If the reading ends and
the list is empty, the tab says "No deployments yet.".

#### Scenario: The user removes a deployment

- **WHEN** the user removes a deployment, and the API answers `204`
- **THEN** the system reads the history again, and it shows the message "Deployment deleted"

#### Scenario: The removal fails

- **WHEN** the call of the removal fails
- **THEN** the system shows the message "Could not delete deployment"

#### Scenario: The service holds no deployment

- **WHEN** the reading ends, and the service holds no deployment
- **THEN** the tab says "No deployments yet."

#### Scenario: The user repeats a deployment

- **WHEN** the user chooses the action that deploys the commit of an entry again
- **THEN** the system starts a new deployment, it reads the history again, and the new entry carries the
  origin `repeat`

#### Scenario: The entry holds no commit

- **WHEN** an entry holds no commit
- **THEN** the action that deploys it again is not available on that entry

## ADDED Requirements

### Requirement: The state of the webhook in the tab "Provider"

The tab `provider` SHALL show whether the webhook of the service is on, and it SHALL give the action that
turns it on and the action that turns it off.

The tab SHALL NOT show the secret of the webhook, because the API never gives it.

#### Scenario: The webhook is off

- **WHEN** the user opens the tab, and the webhook of the service is off
- **THEN** the tab says that a push does not deploy, and it gives the action that turns the webhook on

#### Scenario: The operator turns the webhook on

- **WHEN** the operator turns the webhook on
- **THEN** the tab says that a push to the deployment branch now deploys the service

#### Scenario: The service is not deployable

- **WHEN** the service holds no repository or no deployment branch
- **THEN** the action that turns the webhook on is not available
