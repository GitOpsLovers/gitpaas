# namespaces Specification

## Purpose

This capability groups the projects of the platform. A namespace is the widest scope of the domain model,
and it holds a set of projects. This capability gives the operations that read, create, change and remove
a namespace.

## Requirements

### Requirement: The namespace record

The system SHALL keep one record per namespace. The record holds the identifier and the name.

The identifier is a UUID that the database generates. The name is unique across all the namespaces.

#### Scenario: The system gives a namespace

- **WHEN** a client reads a namespace
- **THEN** the system gives the identifier and the name

#### Scenario: The name is already in use

- **WHEN** a client creates a namespace with a name that another namespace already carries
- **THEN** the system refuses the operation, and it writes no second record with that name

### Requirement: List of the namespaces

The system SHALL answer with every namespace at `GET /api/v1/namespaces`.

The system SHALL sort the list by the identifier, in the falling direction.

#### Scenario: The database holds namespaces

- **WHEN** an authenticated client calls `GET /api/v1/namespaces`
- **THEN** the system answers `200` with the list of the namespaces

#### Scenario: The database holds no namespace

- **WHEN** an authenticated client calls `GET /api/v1/namespaces`, and no namespace exists
- **THEN** the system answers `200` with an empty list

### Requirement: Read of one namespace

The system SHALL answer with one namespace at `GET /api/v1/namespaces/:id`.

The identifier in the path must be a UUID.

#### Scenario: The namespace exists

- **WHEN** a client calls `GET /api/v1/namespaces/:id` with the identifier of an available namespace
- **THEN** the system answers `200` with that namespace

#### Scenario: The namespace does not exist

- **WHEN** a client calls `GET /api/v1/namespaces/:id` with a UUID that matches no namespace
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The identifier is no UUID

- **WHEN** a client calls `GET /api/v1/namespaces/:id` with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

### Requirement: Creation of a namespace

The system SHALL create a namespace at `POST /api/v1/namespaces`.

The body holds only the name. The name must be a text, and it must not be empty. The system SHALL refuse
a body that holds an unknown field.

#### Scenario: The body is correct

- **WHEN** a client posts a body with a name that no namespace carries
- **THEN** the system writes the record, and it answers `201` with the new namespace

#### Scenario: The name is absent or empty

- **WHEN** a client posts a body without a name, or with an empty name
- **THEN** the system answers `400 Bad Request`

#### Scenario: The body holds an unknown field

- **WHEN** a client posts a body that holds a field which the data transfer object does not declare
- **THEN** the system answers `400 Bad Request`

### Requirement: Change of a namespace

The system SHALL change the name of a namespace at `PUT /api/v1/namespaces/:id`.

#### Scenario: The namespace exists

- **WHEN** a client puts a correct body to the identifier of an available namespace
- **THEN** the system writes the new name, and it answers `200` with the changed namespace

#### Scenario: The namespace does not exist

- **WHEN** a client puts a correct body to a UUID that matches no namespace
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The body is not correct

- **WHEN** a client puts a body without a name, or with an empty name
- **THEN** the system answers `400 Bad Request`

### Requirement: Removal of a namespace

The system SHALL remove a namespace at `DELETE /api/v1/namespaces/:id`, and it SHALL answer
`204 No Content`.

The system SHALL count the projects of the namespace before the removal. If the namespace still holds one
project or more, the system SHALL refuse the removal. Thus no project loses its namespace.

#### Scenario: The namespace is empty

- **WHEN** a client deletes an available namespace that holds no project
- **THEN** the system removes the record, and it answers `204`

#### Scenario: The namespace still holds projects

- **WHEN** a client deletes an available namespace that holds one project or more
- **THEN** the system raises `NAMESPACE_NOT_EMPTY`, it answers `409 Conflict`, and it removes no record

#### Scenario: The namespace does not exist

- **WHEN** a client deletes a UUID that matches no namespace
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`
