# projects Specification

## Purpose

This capability groups the services of the platform. A project belongs to one namespace, and it holds a
set of services. It sits between the namespace and the service in the domain model, and every endpoint of
this capability lives under the path of its namespace.

## Requirements

### Requirement: The project record

The system SHALL keep one record per project. The record holds the identifier, the name, the identifier of
the namespace and the count of the services.

The identifier is a UUID that the database generates. The system SHALL calculate the count of the services
from the services that belong to the project.

#### Scenario: The system gives a project

- **WHEN** a client reads a project
- **THEN** the system gives the identifier, the name, the identifier of the namespace and the count of the
  services

#### Scenario: The system creates or changes a project

- **WHEN** the system answers a creation or a change
- **THEN** the count of the services holds 0, because the operation does not load the services

### Requirement: The name of a project is unique inside its namespace

The system SHALL refuse a project whose name another project of the same namespace already carries.

Two projects of different namespaces can carry the same name.

#### Scenario: The name is already in use in that namespace

- **WHEN** a client creates or changes a project with a name that another project of the same namespace
  carries
- **THEN** the system raises `PROJECT_NAME_TAKEN`, and it answers `409 Conflict`

#### Scenario: The name is in use in another namespace

- **WHEN** a client creates a project with a name that only a project of a different namespace carries
- **THEN** the system writes the record

### Requirement: Every operation runs inside a namespace

The system SHALL put every endpoint of this capability under
`/api/v1/namespaces/:namespaceId/projects`.

The system SHALL check that the project belongs to the namespace of the path, for the read of one project,
for the change and for the removal. A project of a different namespace SHALL give the same answer as a
project that does not exist. Thus the path gives no information about a project of another namespace.

#### Scenario: The project belongs to another namespace

- **WHEN** a client reads, changes or deletes a project with the correct identifier of the project, but
  with the identifier of a namespace that does not hold it
- **THEN** the system raises `PROJECT_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The identifier of the namespace is no UUID

- **WHEN** a client calls any endpoint with a value that is no UUID as the identifier of the namespace
- **THEN** the system answers `400 Bad Request`

### Requirement: List of the projects of a namespace

The system SHALL answer with the projects of one namespace at
`GET /api/v1/namespaces/:namespaceId/projects`.

The system SHALL sort the list by the identifier, in the falling direction. Each project of the list
carries its count of the services.

#### Scenario: The namespace holds projects

- **WHEN** a client calls the endpoint with the identifier of a namespace that holds projects
- **THEN** the system answers `200` with the projects of that namespace only

#### Scenario: The namespace holds no project

- **WHEN** a client calls the endpoint with the identifier of a namespace that holds no project
- **THEN** the system answers `200` with an empty list

### Requirement: Read of one project

The system SHALL answer with one project at `GET /api/v1/namespaces/:namespaceId/projects/:id`.

#### Scenario: The project exists in that namespace

- **WHEN** a client calls the endpoint with the identifiers of an available project and of its namespace
- **THEN** the system answers `200` with that project

#### Scenario: The project does not exist

- **WHEN** a client calls the endpoint with a UUID that matches no project
- **THEN** the system raises `PROJECT_NOT_FOUND`, and it answers `404 Not Found`

### Requirement: Creation of a project

The system SHALL create a project at `POST /api/v1/namespaces/:namespaceId/projects`.

The body holds only the name. The system SHALL take the identifier of the namespace from the path.

#### Scenario: The body is correct

- **WHEN** a client posts a name that no project of that namespace carries
- **THEN** the system writes the record, and it answers `201` with the new project

#### Scenario: The body is not correct

- **WHEN** a client posts a body without a name, or with an empty name
- **THEN** the system answers `400 Bad Request`

### Requirement: Change of a project

The system SHALL change the name of a project at `PUT /api/v1/namespaces/:namespaceId/projects/:id`.

#### Scenario: The project exists in that namespace

- **WHEN** a client puts a correct body to an available project of that namespace
- **THEN** the system writes the new name, and it answers `200` with the changed project

#### Scenario: The project does not exist

- **WHEN** a client puts a correct body to a UUID that matches no project of that namespace
- **THEN** the system raises `PROJECT_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The body is not correct

- **WHEN** a client puts a body without a name, or with an empty name
- **THEN** the system answers `400 Bad Request`

### Requirement: Removal of a project

The system SHALL remove a project at `DELETE /api/v1/namespaces/:namespaceId/projects/:id`, and it SHALL
answer `204 No Content`.

The database removes the services of the project by the cascade. The system SHALL NOT count the services
before the removal, so a project that holds services goes away with them.

#### Scenario: The project exists in that namespace

- **WHEN** a client deletes an available project of that namespace
- **THEN** the system removes the record, the database removes the services of the project, and the system
  answers `204`

#### Scenario: The project does not exist

- **WHEN** a client deletes a UUID that matches no project of that namespace
- **THEN** the system raises `PROJECT_NOT_FOUND`, and it answers `404 Not Found`
