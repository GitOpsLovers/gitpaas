# networks

## Purpose

This capability gives a project a private network, so the services of that project reach each other without the traffic leaving to the Internet. The user creates the network, and a service joins it by choice; the connection arrives at the next deployment of that service. This capability also reads the Docker networks of one service: the networks that its compose stack declares, and the networks that its containers hold besides, which includes a network of the project that the service joined.

The list of the networks of a service never gives the network of the reverse proxy. That network belongs to the runtime of GitPaaS, and not to one service; a routed compose service joins it besides its own networks, so it can reach the proxy. See the capability [domains](./domains.md) for the routing that connects a service to that network.

## List of the networks of a service

The system SHALL answer with the networks of one service at `GET /api/v1/networks?serviceId=<uuid>`.

The parameter `serviceId` is obligatory, and it must be a UUID.

Each network of the answer holds the identifier, the name, the driver, the scope, the state of the internal flag, the state of the attachable flag, the date of the creation and the state of the network. See the requirement *The state of a network of a service* for that state.

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
2. The name of the compose project of the network agrees with the slug of the service.

The system SHALL calculate the slug of the service in the same way as the capability `containers`.

### Scenario: A network of another service

- **WHEN** the server holds a network of a different compose project
- **THEN** the system does not count that network among the declared networks of the service

### Scenario: A network that no platform label marks

- **WHEN** the server holds a network that carries no label of the platform
- **THEN** the system does not count that network among the declared networks of the service

## The state of a network of a service

The system SHALL give each network of a service one of three states, from the networks its containers hold besides the networks its stack declares:

1. **`attached`.** The stack declares the network, and a container of the service holds it.
2. **`declared`.** The stack declares the network, and no container of the service holds it.
3. **`connected`.** No declaration names the network, and a container of the service holds it. A network of the project that the service joined carries this state, until a change of the compose stack declares it.

### Scenario: A network the service joined besides its stack

- **WHEN** a container of the service holds a network that its stack does not declare
- **THEN** the system gives that network the state `connected`, together with the networks that the state `attached` or `declared` covers

## The daemon is not reachable

The system SHALL answer `503 Service Unavailable` if the Docker daemon does not answer, for the read of the networks of a service. The message asks the operator to verify that the server runs and that it is reachable.

### Scenario: The daemon does not answer

- **WHEN** the read of the networks of a service fails because the daemon is not reachable
- **THEN** the system answers `503 Service Unavailable` with that message

## The tab "Network" of a service

The tab `network` SHALL show the networks of the service, and it SHALL let the user join the service to a network of its project.

The tab shows its own state of the reading. The control that joins a network lists the networks of the project of the service; if the project holds none, the tab says so, and it points to the page of the networks of the project instead of the control.

### Scenario: The user opens the tab of the networks

- **WHEN** the user opens the tab `network`
- **THEN** the system shows the networks of the service, or the state of the reading

### Scenario: The project of the service holds no network

- **WHEN** the user opens the tab `network`, and the project of the service holds no network
- **THEN** the system replaces the control that joins a network with a message that points to the page of the networks of the project

## A network of a project

The system SHALL let the user create a private network for a project, so the services of that project reach each other without a route to the Internet.

The system SHALL create the network on the daemon with the driver `bridge` and the flag `internal`, under the name `gitpaas-<projectId>-<networkId>`. The display name that the user gives stays in the database alone; the system removes the empty places at its two ends and lowers its case, and the result holds only small letters, numbers and the hyphen, and it neither starts nor ends with the hyphen.

### Scenario: The project accepts the network

- **WHEN** a client creates a network with a name that no other network of that project carries
- **THEN** the system creates the network on the daemon, writes the record, and answers `201` with the network in the state `ready`

### Scenario: The name is already in use in that project

- **WHEN** a client creates a network with a name that another network of the same project already carries
- **THEN** the system raises `PROJECT_NETWORK_NAME_TAKEN`, and it answers `409 Conflict`

### Scenario: The project does not exist

- **WHEN** a client creates a network under a project that does not exist
- **THEN** the system raises `PROJECT_NOT_FOUND`, and it answers `404 Not Found`

### Scenario: The name breaks the rule

- **WHEN** a client creates a network with a name that holds a symbol other than the hyphen, or with a hyphen at one of its ends
- **THEN** the system answers `400 Bad Request`

## List of the networks of a project

The system SHALL answer with the networks of one project at `GET /api/v1/projects/:projectId/networks`.

Each network of the answer holds the identifier, the identifier of the project, the display name, the name on the daemon and one of three states:

1. **`ready`.** The database holds the network, and the daemon holds it too.
2. **`missing`.** The database holds the network, and the daemon does not hold it, for example because an operator removed it outside GitPaaS.
3. **`orphan`.** The daemon holds a network under the prefix of that project, and the database holds no matching record.

### Scenario: The project holds networks

- **WHEN** a client lists the networks of a project that holds networks
- **THEN** the system answers `200` with those networks, each one with its state

### Scenario: A network disappeared from the daemon

- **WHEN** the daemon no longer holds a network that the database still holds
- **THEN** the system gives that network the state `missing`

### Scenario: A network exists on the daemon alone

- **WHEN** the daemon holds a network under the prefix of the project, and the database holds no record of it
- **THEN** the system gives that network the state `orphan`

## Rename of a network of a project

The system SHALL rename a network of a project at `PUT /api/v1/projects/:projectId/networks/:id`, without any change on the daemon.

### Scenario: The rename succeeds

- **WHEN** a client renames a network of a project with a name that no other network of that project carries
- **THEN** the system writes the new name, and it answers `200` with the renamed network

### Scenario: The name is already in use in that project

- **WHEN** a client renames a network with a name that another network of the same project already carries
- **THEN** the system raises `PROJECT_NETWORK_NAME_TAKEN`, and it answers `409 Conflict`

### Scenario: The network does not exist in that project

- **WHEN** a client renames a network with an identifier that the project does not hold
- **THEN** the system raises `PROJECT_NETWORK_NOT_FOUND`, and it answers `404 Not Found`

## Removal of a network of a project

The system SHALL remove a network of a project at `DELETE /api/v1/projects/:projectId/networks/:id`, on the daemon and in the database, and it SHALL answer `204 No Content`.

The system SHALL refuse the removal when a container still holds the network, because disconnecting a container that a service still runs is out of scope of this capability.

### Scenario: The removal succeeds

- **WHEN** a client removes a network of a project that no container holds
- **THEN** the system removes the network on the daemon, removes the record, and answers `204`

### Scenario: A container still holds the network

- **WHEN** a client removes a network that a container still holds
- **THEN** the system raises `PROJECT_NETWORK_IN_USE`, and it answers `409 Conflict`

### Scenario: The network does not exist in that project

- **WHEN** a client removes a network with an identifier that the project does not hold
- **THEN** the system raises `PROJECT_NETWORK_NOT_FOUND`, and it answers `404 Not Found`

The removal of the project itself also removes the networks of that project on the daemon. See the capability [projects](./projects.md).

## Joining a service to a network of its project

The system SHALL let a service join a network of its own project, at `POST /api/v1/projects/:projectId/networks/:id/services`, and it SHALL answer `204 No Content`.

The join only records that the service belongs to the network. The containers of the service reach that network at the next deployment of the service, with the compose project of the service as their alias on it.

### Scenario: The join succeeds

- **WHEN** a client joins an available service of the project to an available network of the same project
- **THEN** the system records the join, and it answers `204`

### Scenario: The network does not exist in that project

- **WHEN** a client joins a service to a network with an identifier that the project does not hold
- **THEN** the system raises `PROJECT_NETWORK_NOT_FOUND`, and it answers `404 Not Found`

### Scenario: The service does not exist in that project

- **WHEN** a client joins a service that does not belong to the project of the network
- **THEN** the system raises `SERVICE_NOT_FOUND`, and it answers `404 Not Found`

## Leaving a network of a project

The system SHALL let a service leave a network of its own project, at `DELETE /api/v1/projects/:projectId/networks/:id/services/:serviceId`, and it SHALL answer `204 No Content`.

### Scenario: The leave succeeds

- **WHEN** a client removes a service that joined a network of its project from that network
- **THEN** the system removes the join, and it answers `204`

### Scenario: The network does not exist in that project

- **WHEN** a client removes a service from a network with an identifier that the project does not hold
- **THEN** the system raises `PROJECT_NETWORK_NOT_FOUND`, and it answers `404 Not Found`

### Scenario: The service did not join the network

- **WHEN** a client removes a service from a network that the service never joined
- **THEN** the system raises `SERVICE_NOT_FOUND`, and it answers `404 Not Found`

## The page of the networks of a project

The system SHALL give a page at `/namespaces/:namespaceId/projects/:id/networks`, which lists the networks of the project, and which holds a form that creates or renames one.

The page shows the display name, the name on the daemon and the state of each network. The actions that rename and that remove a network stay closed on a network in the state `orphan`, because that network holds no record to change or to remove through this capability.

### Scenario: The user opens the page

- **WHEN** a signed-in user opens the networks of a project
- **THEN** the system shows the networks of that project, or the state of the reading

### Scenario: The list is empty

- **WHEN** the project holds no network
- **THEN** the system shows a message that invites the user to create the first one

## The creation and the rename on the page

The system SHALL show a message of success after a creation or a rename that succeeds, and it SHALL read the list again.

If the API refuses the write, the system SHALL show the reason next to the form: the name already in use, or any other message the API gives.

### Scenario: The creation succeeds

- **WHEN** the API answers with the new network
- **THEN** the system shows a message of success, and it reads the list again

### Scenario: The name is already in use

- **WHEN** the API refuses the write, because another network of the project carries that name
- **THEN** the system shows the message "This project already holds a network of that name. Choose a different name."

## The removal on the page

The system SHALL ask the user to confirm before it removes a network, with a message that names the network and that warns that the services which joined it lose the private route.

If the API refuses the removal because a container still holds the network, the system SHALL show a message that asks the user to remove the network from its services, to deploy them again, and to delete the network then.

### Scenario: The removal succeeds

- **WHEN** the user confirms the removal, and the API answers `204`
- **THEN** the system shows a message of success, and it reads the list again

### Scenario: A container still holds the network

- **WHEN** the API refuses the removal, because a container still holds the network
- **THEN** the system shows the message "A container still holds this network. Remove it from the services that joined it, deploy them again, and delete the network then."
