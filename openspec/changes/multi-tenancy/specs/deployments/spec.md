## MODIFIED Requirements

### Requirement: The deployment record

The system SHALL keep one record per deployment. The record holds the identifier, the identifier of the
service, the status, the branch, the commit, the first line of the message of the commit, the path of the
compose file, the user who triggered the run, the message of the error, the date of the creation and the
date of the end.

The status is `pending`, `running`, `success` or `failed`.

The user who triggered the run can be empty. An empty value means that no user started the run, which is the
case for a deployment that a rule of the platform starts by itself.

#### Scenario: The system gives a deployment

- **WHEN** a client reads a deployment
- **THEN** the system gives all these fields, and the fields of the commit, of the error and of the end date
  hold `null` while no value applies

#### Scenario: A user triggers a deployment

- **WHEN** an authenticated user triggers a deployment
- **THEN** the record holds that user

#### Scenario: The platform triggers a deployment

- **WHEN** the platform starts a deployment that no user requested
- **THEN** the record holds no user

### Requirement: List of the deployments of a service

The system SHALL answer with the deployments of one service at
`GET /api/v1/deployments?serviceId=<uuid>`, and only when the caller owns that service or carries the role
`admin`.

The parameter `serviceId` is obligatory, and it must be a UUID.

#### Scenario: The service holds deployments

- **WHEN** a client calls the endpoint with the identifier of a service that the caller owns
- **THEN** the system answers `200` with the deployments of that service only

#### Scenario: The parameter is absent or is no UUID

- **WHEN** a client calls the endpoint without `serviceId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

#### Scenario: The service belongs to another user

- **WHEN** a client calls the endpoint with the identifier of a service that another user owns
- **THEN** the system answers `404 Not Found`

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
