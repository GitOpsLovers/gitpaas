# containers

## Purpose

This capability reads the Docker containers that the compose stack of a service makes. It gives the operator a view of what runs on the server for one service. It only reads, and it changes nothing.

## List of the containers of a service

The system SHALL answer with the containers of one service at `GET /api/v1/containers?serviceId=<uuid>`.

The parameter `serviceId` is obligatory, and it must be a UUID.

Each container of the answer holds the identifier, the name, the image, the state, the status, the date of the creation, the mark `ephemeral` and the list of the published ports. Each port holds the private port, the public port and the kind of the protocol. The public port holds `null` if the container publishes no port to the server.

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

## The one-shot container

A stack can hold a container that runs one time, for an initialization or a migration, and that exits when its work ends. The system SHALL carry that mark in the field `ephemeral` of the container, which holds `true` for a one-shot container and `false` for every other one. The field is always present, and it is never absent.

The system SHALL mark a compose service as one-shot at the deployment, in two cases:

1. Another compose service of the stack waits for it with the condition `service_completed_successfully`.
2. The compose file of the user already declares the label `io.gitpaas.ephemeral` on it.

In both cases the system stamps the label `io.gitpaas.ephemeral` on the compose service, and the read of the containers turns that label into the field `ephemeral`. The interface of GitPaaS gives no way to mark a service; the mark comes from the compose file of the user alone.

The state of a service ignores a one-shot container that exited, so one initialization that completed does not turn the bullet of the card red. See the requirement *The bullet of the state of a service* of the capability [services](./services.md).

**A stack that the operator deployed before this feature carries no such label.** The system stamps the label at the deployment alone, and it changes no container that already runs. The operator SHALL deploy such a service one more time, so that its one-shot containers take the label and the state of the service counts them correctly.

### Scenario: Another compose service waits for the completion

- **WHEN** a compose service of the stack waits for another one with the condition `service_completed_successfully`
- **THEN** the deployment stamps the label `io.gitpaas.ephemeral` on the service it waits for, and the answer holds `ephemeral` with the value `true` for that container

### Scenario: The compose file declares the label

- **WHEN** the compose file of the user declares the label `io.gitpaas.ephemeral` on a compose service
- **THEN** the deployment keeps that label, and the answer holds `ephemeral` with the value `true` for that container

### Scenario: The container is no one-shot container

- **WHEN** no compose service waits for the completion of a compose service, and its compose file declares no such label
- **THEN** the answer holds `ephemeral` with the value `false` for that container

### Scenario: The stack is of before this feature

- **WHEN** the operator reads the containers of a service that he deployed before this feature
- **THEN** every container holds `ephemeral` with the value `false`, until he deploys the service one more time

## The manual step after the change of the convention of the name

The system SHALL keep a container of an old name running until its service deploys again; it stops no container by itself. The operator SHALL re-deploy every service once, so each container and network takes its new name. A volume of an old name keeps its data under that name; GitPaaS copies none of it, and the operator handles the migration of its data to a volume of the new name by hand.

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

The tab SHALL show the badge `One-shot` beside the state of a container that holds `ephemeral`. The badge explains that the container runs one time, and the state of the container stays as the daemon reports it. Thus the operator reads a container `exited` of the stack, and he knows that this exit is the end of one run and not a failure.

The tab shows its own state of the reading.

### Scenario: The user opens the tab of the containers

- **WHEN** the user opens the tab `containers`
- **THEN** the system shows the containers of the service, or the state of the reading

### Scenario: The tab shows a one-shot container

- **WHEN** the tab shows a container that holds `ephemeral`
- **THEN** the system shows the badge `One-shot` beside the state of that container
