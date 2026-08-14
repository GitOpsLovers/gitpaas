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
