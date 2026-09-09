# networks

## Purpose

This capability reads the Docker networks of one service: the networks that its compose stack declares, and the networks that its containers hold besides. The user consults this list to know what a service reaches on the network of the daemon; the list is a read, and it holds no action.

The list of the networks of a service never gives the network of the reverse proxy. That network belongs to the runtime of GitPaaS, and not to one service; a routed compose service joins it besides its own networks, so it can reach the proxy. See the capability [domains](./domains.md) for the routing that connects a service to that network.

A network of a service comes from `compose.yml` alone: the service declares it under `networks`, and Docker Compose creates it under the project of the stack. This capability adds no network, and it joins no service to one; the support of a shared network through `external: true` stays under the compose stack, and this capability only shows it once the daemon holds it.

## List of the networks of a service

The system SHALL answer with the networks of one service at `GET /api/v1/networks?serviceId=<uuid>`.

The parameter `serviceId` is obligatory, and it must be a UUID.

Each network of the answer holds the identifier, the name, the driver, the scope, the state of the internal flag, the state of the attachable flag, the date of the creation, and the state.

### Scenario: The service holds networks

- **WHEN** an authenticated client calls the endpoint with the identifier of an available service
- **THEN** the system answers `200` with the networks of the compose stack of that service, and the networks its containers hold besides

### Scenario: The service holds no network

- **WHEN** a client calls the endpoint with the identifier of a service whose stack made no network, and whose containers hold none
- **THEN** the system answers `200` with an empty list

### Scenario: The service does not exist

- **WHEN** a client calls the endpoint with a UUID that matches no service
- **THEN** the system raises `SERVICE_NOT_FOUND`, and it answers `404 Not Found`

### Scenario: The parameter is absent or is no UUID

- **WHEN** a client calls the endpoint without `serviceId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

## The declared networks of a service

The system SHALL select the networks that the stack of a service declares by two conditions together:

1. The network carries the label that marks a resource of the platform.
2. The network carries the label `com.gitpaas.service` with the identifier of the service.

### Scenario: A network of another service

- **WHEN** the server holds a network that carries the label `com.gitpaas.service` of a different service
- **THEN** the system does not count that network among the declared networks of the service

### Scenario: A network that no platform label marks

- **WHEN** the server holds a network that carries no label of the platform
- **THEN** the system does not count that network among the declared networks of the service

## The state of a network of a service

The system SHALL give each network of a service one of three states, from the networks its containers hold and the networks its stack declares:

1. **`attached`.** The stack declares the network, and a container of the service holds it.
2. **`declared`.** The stack declares the network, and no container of the service holds it.
3. **`connected`.** No declaration names the network, and a container of the service holds it, for example a network shared through `external: true`.

### Scenario: A network the service joined besides its stack

- **WHEN** a container of the service holds a network that its stack does not declare
- **THEN** the system gives that network the state `connected`, together with the networks that the state `attached` or `declared` covers

## The daemon is not reachable

The system SHALL answer `503 Service Unavailable` if the Docker daemon does not answer, for the read of the networks of a service. The message asks the operator to verify that the server runs and that it is reachable.

The `503` belongs to that failure alone. A read that fails for another reason, such as a failure of the database, SHALL answer `500 Internal Server Error` with the code `SERVER_ERROR`, so a `503` states an outage of the server alone and never hides a fault of the platform.

### Scenario: The daemon does not answer

- **WHEN** the read of the networks of a service fails because the daemon is not reachable
- **THEN** the system answers `503 Service Unavailable` with that message

### Scenario: The read fails for another reason

- **WHEN** the read of the networks of a service fails for a reason other than a daemon that is not reachable
- **THEN** the system answers `500 Internal Server Error` with the code `SERVER_ERROR`

## The tab "Network" of a service

The tab `network` SHALL show, read-only, the networks the stack of the service declares and the networks its containers hold besides.

The tab shows its own state of the reading. Every network of the list comes from the daemon, so the columns Driver, Scope, Internal, Attachable and Created always carry a value.

### Scenario: The user opens the tab of the networks

- **WHEN** the user opens the tab `network`
- **THEN** the system shows the networks of the service, or the state of the reading
