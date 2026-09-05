# containers

## Purpose

This capability reads the Docker containers that the compose stack of a service makes. It gives the operator a view of what runs on the server for one service. It only reads, and it changes nothing.

## List of the containers of a service

The system SHALL answer with the containers of one service at `GET /api/v1/containers?serviceId=<uuid>`.

The parameter `serviceId` is obligatory, and it must be a UUID.

Each container of the answer holds the identifier, the name, the image, the state, the status, the date of the creation and the list of the published ports. Each port holds the private port, the public port and the kind of the protocol. The public port holds `null` if the container publishes no port to the server.

### Scenario: The service runs containers

- **WHEN** an authenticated client calls the endpoint with the identifier of an available service
- **THEN** the system answers `200` with the containers of the compose stack of that service

### Scenario: The service runs no container

- **WHEN** a client calls the endpoint with the identifier of a service that started no container
- **THEN** the system answers `200` with an empty list

### Scenario: The service does not exist

- **WHEN** a client calls the endpoint with a UUID that matches no service
- **THEN** the system raises `SERVICE_NOT_FOUND`, and it answers `404 Not Found`

### Scenario: The parameter is absent or is no UUID

- **WHEN** a client calls the endpoint without `serviceId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

## The name of a container

The system SHALL give a container the name `<namespace>_<project>_<compose service>_1`, where `<namespace>_<project>` is the name of the compose project of the service, and `<compose service>` is the name the recipe of the service gives the compose service that starts the container.

The system SHALL calculate the name of the compose project from the name of the namespace and the name of the project, once at the creation of the service, and it SHALL keep that name for the life of the service. Each segment turns to small letters, and each run of a character that is not a letter or a digit turns into one underscore. Two services of one project can declare the same name of a compose service, because the identifier of the service also marks every container, network and image that its stack makes; the label of that identifier, and not the name on the daemon, tells the containers of the two services apart.

## The selection of the containers of a service

The system SHALL select the containers by two conditions together:

1. The container carries the label that marks a resource of the platform.
2. The container carries the label `com.gitpaas.service` with the identifier of the service.

The system SHALL list the containers that stopped as well. Thus the operator sees a container that failed.

### Scenario: A container of another service

- **WHEN** the server runs a container that carries the label `com.gitpaas.service` of a different service
- **THEN** the system does not give that container

### Scenario: A container that no platform label marks

- **WHEN** the server runs a container that carries no label of the platform
- **THEN** the system does not give that container

### Scenario: A container that stopped

- **WHEN** a container of the service stopped
- **THEN** the system gives that container, with its state and its status

## The manual step after the change of the convention of the name

The system SHALL keep a container of an old name running until its service deploys again; it stops no container by itself. The operator SHALL re-deploy every service once, so each container, network and volume takes its new name, and so a volume that carries an old name copies its data over. See the requirement *The copy of the data of a volume of an old name* of the capability [volumes](./volumes.md).

Once every service redeployed, the operator SHALL remove by hand the containers that still carry an old name, because GitPaaS keeps neither a record nor a schedule that removes them.

### Scenario: The operator re-deploys after the change

- **WHEN** the operator triggers a deployment of a service that still runs containers of an old name
- **THEN** the new deployment starts the containers under the new convention, and the containers of the old name keep running until the operator removes them

## The daemon is not reachable

The system SHALL answer `503 Service Unavailable` if the Docker daemon does not answer. The message asks the operator to verify that the server runs and that it is reachable.

The `503` belongs to that failure alone. A read that fails for another reason, such as a failure of the database, SHALL answer `500 Internal Server Error` with the code `SERVER_ERROR`, so a `503` states an outage of the server alone and never hides a fault of the platform.

### Scenario: The daemon does not answer

- **WHEN** the read of the containers fails because the daemon is not reachable
- **THEN** the system answers `503 Service Unavailable` with that message

### Scenario: The read fails for another reason

- **WHEN** the read of the containers fails for a reason other than a daemon that is not reachable
- **THEN** the system answers `500 Internal Server Error` with the code `SERVER_ERROR`

## The tab "Containers"

The tab `containers` SHALL show the containers of the service.

The tab shows its own state of the reading.

### Scenario: The user opens the tab of the containers

- **WHEN** the user opens the tab `containers`
- **THEN** the system shows the containers of the service, or the state of the reading
