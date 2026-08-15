# services Specification

## Purpose

This capability holds the deployable units of the platform. A service belongs to one project, and it
points to a Git repository, to a deployment branch and to a compose file. This capability gives the
operations that read, create, change and remove a service, and it removes the resources of the server
when a service goes away.

## Requirements

### Requirement: The service record

The system SHALL keep one record per service. The record holds the identifier, the name, the identifier of
the project, the identifier of the provider, the identifier of the repository, the deployment branch and the
path of the compose file.

The identifier is a UUID that the database generates. The identifier of the provider can be empty, and the
database refuses the removal of a provider that a service still names. A service with no provider is not
deployable. The three fields of the deployment start as an empty text, because a caller gives them after the
creation.

#### Scenario: The system gives a service

- **WHEN** a client reads a service
- **THEN** the system gives the identifier, the name, the identifier of the project, the identifier of the
  provider, the identifier of the repository, the deployment branch and the path of the compose file

### Requirement: List of the services of a project

The system SHALL answer with the services of one project at `GET /api/v1/services?projectId=<uuid>`.

The parameter `projectId` is obligatory, and it must be a UUID. The system SHALL sort the list by the
identifier, in the falling direction.

#### Scenario: The project holds services

- **WHEN** a client calls the endpoint with the identifier of a project that holds services
- **THEN** the system answers `200` with the services of that project only

#### Scenario: The project holds no service

- **WHEN** a client calls the endpoint with the identifier of a project that holds no service
- **THEN** the system answers `200` with an empty list

#### Scenario: The parameter is absent or is no UUID

- **WHEN** a client calls the endpoint without `projectId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

### Requirement: Read of one service

The system SHALL answer with one service at `GET /api/v1/services/:id`.

#### Scenario: The service exists

- **WHEN** a client calls `GET /api/v1/services/:id` with the identifier of an available service
- **THEN** the system answers `200` with that service

#### Scenario: The service does not exist

- **WHEN** a client calls `GET /api/v1/services/:id` with a UUID that matches no service
- **THEN** the system answers `404 Not Found`

#### Scenario: The identifier is no UUID

- **WHEN** a client calls `GET /api/v1/services/:id` with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

### Requirement: Creation of a service

The system SHALL create a service at `POST /api/v1/services`.

The body holds the name and the identifier of the project. It can also hold the identifier of the provider.
The system SHALL set the identifier of the repository, the deployment branch and the path of the compose
file to an empty text. Thus a new service is not deployable, and a caller makes it deployable with a later
change.

#### Scenario: The body is correct

- **WHEN** a client posts a name, the identifier of an available project and the identifier of an available
  provider
- **THEN** the system writes the record, and it answers `201` with the new service

#### Scenario: The body holds no provider

- **WHEN** a client posts a name and the identifier of an available project, and no identifier of a provider
- **THEN** the system writes the record with an empty identifier of a provider, and it answers `201` with the
  new service

#### Scenario: The project does not exist

- **WHEN** a client posts a name and a UUID that matches no project
- **THEN** the database refuses the foreign key, the system raises `PROJECT_NOT_FOUND`, and it answers
  `404 Not Found`

#### Scenario: The provider does not exist

- **WHEN** a client posts a UUID that matches no provider
- **THEN** the database refuses the foreign key, the system raises `PROVIDER_NOT_FOUND`, and it answers
  `404 Not Found`

#### Scenario: The body is not correct

- **WHEN** a client posts a body without a name, with an empty name, without a `projectId`, or with a value
  that is no UUID
- **THEN** the system answers `400 Bad Request`

### Requirement: Change of a service

The system SHALL change a service at `PUT /api/v1/services/:id`.

The body holds the name, which is obligatory. The body can also hold the identifier of the provider, the
identifier of the repository, the deployment branch and the path of the compose file. The system SHALL
change only the fields that the body holds.

A caller makes a service deployable with this operation, because it gives the provider, the identifier of
the repository and the deployment branch.

#### Scenario: The service exists

- **WHEN** a client puts a correct body to the identifier of an available service
- **THEN** the system writes the given fields, and it answers `200` with the changed service

#### Scenario: The body holds only the name

- **WHEN** a client puts a body that holds only the name
- **THEN** the system changes the name, and it keeps the identifier of the provider, the identifier of the
  repository, the deployment branch and the path of the compose file

#### Scenario: The service does not exist

- **WHEN** a client puts a correct body to a UUID that matches no service
- **THEN** the system answers `404 Not Found`

#### Scenario: The body is not correct

- **WHEN** a client puts a body without a name, or with an empty name
- **THEN** the system answers `400 Bad Request`

### Requirement: Removal of a service

The system SHALL remove a service at `DELETE /api/v1/services/:id`, and it SHALL answer `204 No Content`.

The system SHALL read the deployments of the service before the removal of the record, because the
database removes those rows by the cascade.

After the removal of the record, the system SHALL clean the server in this order:

1. Remove the containers of the service.
2. Remove the networks of the service.
3. Remove the images that the system built for the service.
4. Remove the log entries of each deployment of the service.

The system SHALL keep the shared images that it pulled from a registry, because another service can use
them.

#### Scenario: The service exists

- **WHEN** a client deletes an available service
- **THEN** the system removes the record, it removes the containers, the networks and the built images of
  the service, it removes the log entries of each deployment, and it answers `204`

#### Scenario: The service does not exist

- **WHEN** a client deletes a UUID that matches no service
- **THEN** the system answers `404 Not Found`, and it cleans nothing on the server

#### Scenario: The service holds no deployment

- **WHEN** a client deletes an available service that holds no deployment
- **THEN** the system removes the record, it cleans the resources of the server, and it answers `204`
