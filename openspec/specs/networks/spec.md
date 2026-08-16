# networks Specification

## Purpose

This capability reads the Docker networks that the compose stack of a service makes. It gives the operator a view of the networks that belong to one service. It only reads, and it changes nothing.

## Requirements

### Requirement: List of the networks of a service

The system SHALL answer with the networks of one service at `GET /api/v1/networks?serviceId=<uuid>`.

The parameter `serviceId` is obligatory, and it must be a UUID.

Each network of the answer holds the identifier, the name, the driver, the scope, the state of the internal flag, the state of the attachable flag and the date of the creation.

#### Scenario: The service holds networks

- **WHEN** an authenticated client calls the endpoint with the identifier of an available service
- **THEN** the system answers `200` with the networks of the compose stack of that service

#### Scenario: The service holds no network

- **WHEN** a client calls the endpoint with the identifier of a service whose stack made no network
- **THEN** the system answers `200` with an empty list

#### Scenario: The service does not exist

- **WHEN** a client calls the endpoint with a UUID that matches no service
- **THEN** the system raises `SERVICE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The parameter is absent or is no UUID

- **WHEN** a client calls the endpoint without `serviceId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

### Requirement: The selection of the networks of a service

The system SHALL select the networks by two conditions together:

1. The network carries the label that marks a resource of the platform.
2. The name of the compose project of the network agrees with the slug of the service.

The system SHALL calculate the slug of the service in the same way as the capability `containers`.

#### Scenario: A network of another service

- **WHEN** the server holds a network of a different compose project
- **THEN** the system does not give that network

#### Scenario: A network that no platform label marks

- **WHEN** the server holds a network that carries no label of the platform
- **THEN** the system does not give that network

### Requirement: The daemon is not reachable

The system SHALL answer `503 Service Unavailable` if the Docker daemon does not answer. The message asks the operator to verify that the server runs and that it is reachable.

#### Scenario: The daemon does not answer

- **WHEN** the read of the networks fails because the daemon is not reachable
- **THEN** the system answers `503 Service Unavailable` with that message

### Requirement: The tab "Network"

The tab `network` SHALL show the networks of the service.

The tab shows its own state of the reading.

#### Scenario: The user opens the tab of the networks

- **WHEN** the user opens the tab `network`
- **THEN** the system shows the networks of the service, or the state of the reading
