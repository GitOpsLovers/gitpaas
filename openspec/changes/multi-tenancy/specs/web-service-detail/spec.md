## MODIFIED Requirements

### Requirement: The tab "Deployments" shows the history

The tab `deployments` SHALL show one entry per deployment, the newest first.

Each entry holds the status, the first line of the message of the commit, the short form of the SHA, the
branch, the user who triggered the run, the date of the creation and the length of the run. An entry of a
deployment that failed also holds the message of the error.

An entry whose record holds no user SHALL say "automatic", because the platform started that run and no user
requested it.

Each entry gives two actions: view the output, and remove the record.

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

#### Scenario: A user triggered the run

- **WHEN** the record of a deployment holds a user
- **THEN** the entry shows the email of that user

#### Scenario: The platform triggered the run

- **WHEN** the record of a deployment holds no user
- **THEN** the entry says "automatic"
