# containers Specification

## Purpose

This capability reads the Docker containers that the compose stack of a service makes. It gives the
operator a view of what runs on the server for one service. It only reads, and it changes nothing.

## Requirements

### Requirement: List of the containers of a service

The system SHALL answer with the containers of one service at `GET /api/v1/containers?serviceId=<uuid>`.

The parameter `serviceId` is obligatory, and it must be a UUID.

Each container of the answer holds the identifier, the name, the image, the state, the status, the date of
the creation and the list of the published ports. Each port holds the private port, the public port and
the kind of the protocol. The public port holds `null` if the container publishes no port to the server.

#### Scenario: The service runs containers

- **WHEN** an authenticated client calls the endpoint with the identifier of an available service
- **THEN** the system answers `200` with the containers of the compose stack of that service

#### Scenario: The service runs no container

- **WHEN** a client calls the endpoint with the identifier of a service that started no container
- **THEN** the system answers `200` with an empty list

#### Scenario: The service does not exist

- **WHEN** a client calls the endpoint with a UUID that matches no service
- **THEN** the system raises `SERVICE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The parameter is absent or is no UUID

- **WHEN** a client calls the endpoint without `serviceId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

### Requirement: The selection of the containers of a service

The system SHALL select the containers by two conditions together:

1. The container carries the label that marks a resource of the platform.
2. The name of the compose project of the container agrees with the slug of the service.

The system SHALL calculate the slug from the name of the service. It puts the name into small letters, and
it replaces each group of other characters with one hyphen. If the result is empty, the system uses the
identifier of the service instead.

The system SHALL list the containers that stopped as well. Thus the operator sees a container that failed.

#### Scenario: A container of another service

- **WHEN** the server runs a container of a different compose project
- **THEN** the system does not give that container

#### Scenario: A container that no platform label marks

- **WHEN** the server runs a container that carries no label of the platform
- **THEN** the system does not give that container

#### Scenario: A container that stopped

- **WHEN** a container of the service stopped
- **THEN** the system gives that container, with its state and its status

### Requirement: The daemon is not reachable

The system SHALL answer `503 Service Unavailable` if the Docker daemon does not answer. The message asks
the operator to verify that the server runs and that it is reachable.

#### Scenario: The daemon does not answer

- **WHEN** the read of the containers fails because the daemon is not reachable
- **THEN** the system answers `503 Service Unavailable` with that message

### Requirement: The tab "Containers"

The tab `containers` SHALL show the containers of the service.

The tab shows its own state of the reading.

#### Scenario: The user opens the tab of the containers

- **WHEN** the user opens the tab `containers`
- **THEN** the system shows the containers of the service, or the state of the reading
