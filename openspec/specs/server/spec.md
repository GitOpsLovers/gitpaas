# server Specification

## Purpose

This capability keeps the server of the platform in good order. It reports the readiness of the critical
dependencies, it reports the state of the Docker daemon, it removes the unused resources, and it removes
the containers that agree with no available service.

## Requirements

### Requirement: The readiness probe

The system SHALL give a public readiness probe at `GET /api/v1/server/readiness`.

The probe examines the critical dependencies: PostgreSQL and the Docker daemon. The answer holds the
aggregate status and one entry per dependency. The aggregate status is `ok` only if every dependency is
`up`.

The system SHALL run every probe at the same time. A probe that gives `false`, and a probe that raises an
error, both give the state `down`. The check itself SHALL never raise an error.

#### Scenario: Every dependency is available

- **WHEN** a client calls the probe, and PostgreSQL and the Docker daemon both answer
- **THEN** the system answers `200` with the status `ok`, and with the state `up` for each dependency

#### Scenario: One dependency is not available

- **WHEN** a client calls the probe, and one dependency does not answer
- **THEN** the system answers `503 Service Unavailable`, and the body holds the status `error` and the
  state of each dependency

#### Scenario: The client sends no token

- **WHEN** a client calls the probe without an access token
- **THEN** the system runs the probe, because the endpoint is public

### Requirement: The state of the Docker daemon

The system SHALL answer with the information of the Docker daemon at `GET /api/v1/server/status`.

The answer holds the field `connected` and the information that the daemon reports. This endpoint needs an
access token.

#### Scenario: The daemon answers

- **WHEN** an authenticated client calls the endpoint, and the daemon answers
- **THEN** the system answers `200` with `connected` set to true, and with the information of the daemon

#### Scenario: The daemon does not answer

- **WHEN** the daemon is not reachable
- **THEN** the system answers `503 Service Unavailable` with a message that asks the operator to verify
  that the server runs

### Requirement: The removal of the unused resources

The system SHALL give three operations that remove the unused resources of the server:

| Endpoint | Removes |
|---|---|
| `POST /api/v1/server/prune/images` | The images that no container uses |
| `POST /api/v1/server/prune/volumes` | The local volumes that no container uses |
| `POST /api/v1/server/prune/containers` | The containers that stopped |

Each operation answers `200` with the count of the removed resources and the space of the disk that the
removal gives back.

#### Scenario: The removal succeeds

- **WHEN** an authenticated client calls one of the three endpoints
- **THEN** the system answers `200` with the count of the removed resources and the space that it gives
  back

#### Scenario: The daemon is not reachable

- **WHEN** the Docker daemon does not answer during one of the three operations
- **THEN** the system answers `503 Service Unavailable` with a message that names the resource of that
  operation

### Requirement: The removal of the orphan containers

The system SHALL remove the containers of the platform whose compose project agrees with no available
service, at `POST /api/v1/server/containers/orphaned`.

The system SHALL first read every service, and it SHALL calculate the name of the compose project of each
one. The system SHALL then remove by force every container of the platform whose project is not in that
set.

The answer holds the count of the removed containers and their names.

#### Scenario: The server holds orphan containers

- **WHEN** a container of the platform carries the name of a compose project that no available service
  gives
- **THEN** the system removes that container by force, and it answers `200` with the count and the names

#### Scenario: The server holds no orphan container

- **WHEN** every container of the platform agrees with an available service
- **THEN** the system removes nothing, and it answers `200` with the count 0 and an empty list of names

#### Scenario: The daemon is not reachable

- **WHEN** the Docker daemon does not answer
- **THEN** the system answers `503 Service Unavailable`
