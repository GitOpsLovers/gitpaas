## MODIFIED Requirements

### Requirement: The namespace record

The system SHALL keep one record per namespace. The record holds the identifier, the name and the owner.

The identifier is a UUID that the database generates. The name is unique across all the namespaces. The
owner is the user who created the namespace, and every project, service and deployment below that namespace
belongs to the same owner.

#### Scenario: The system gives a namespace

- **WHEN** a client reads a namespace
- **THEN** the system gives the identifier and the name

#### Scenario: The name is already in use

- **WHEN** a client creates a namespace with a name that another namespace already carries
- **THEN** the system refuses the operation, and it writes no second record with that name

#### Scenario: The system creates a namespace

- **WHEN** a user creates a namespace
- **THEN** the system writes that user as the owner

### Requirement: List of the namespaces

The system SHALL answer with the namespaces that the caller owns, at `GET /api/v1/namespaces`.

A user with the role `admin` receives every namespace of the installation.

The system SHALL sort the list by the identifier, in the falling direction.

#### Scenario: The database holds namespaces

- **WHEN** an authenticated client calls `GET /api/v1/namespaces`
- **THEN** the system answers `200` with the namespaces that the caller owns

#### Scenario: The database holds no namespace

- **WHEN** an authenticated client calls `GET /api/v1/namespaces`, and the caller owns no namespace
- **THEN** the system answers `200` with an empty list

#### Scenario: An administrator reads the list

- **WHEN** a user with the role `admin` calls `GET /api/v1/namespaces`
- **THEN** the system answers `200` with every namespace of the installation

### Requirement: Read of one namespace

The system SHALL answer with one namespace at `GET /api/v1/namespaces/:id`, and only when the caller owns it
or carries the role `admin`.

The identifier in the path must be a UUID.

A namespace of another user SHALL answer as a namespace that does not exist. Thus the path gives away
nothing about the resources of another user.

#### Scenario: The namespace exists

- **WHEN** a client calls `GET /api/v1/namespaces/:id` with the identifier of a namespace that the caller
  owns
- **THEN** the system answers `200` with that namespace

#### Scenario: The namespace does not exist

- **WHEN** a client calls `GET /api/v1/namespaces/:id` with a UUID that matches no namespace
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The identifier is no UUID

- **WHEN** a client calls `GET /api/v1/namespaces/:id` with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

#### Scenario: The namespace belongs to another user

- **WHEN** a client reads a namespace that another user owns
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`

### Requirement: Change of a namespace

The system SHALL change the name of a namespace at `PUT /api/v1/namespaces/:id`, and only when the caller
owns it or carries the role `admin`.

#### Scenario: The namespace exists

- **WHEN** a client puts a correct body to a namespace that the caller owns
- **THEN** the system writes the new name, and it answers `200` with the changed namespace

#### Scenario: The namespace does not exist

- **WHEN** a client puts a correct body to a UUID that matches no namespace
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The body is not correct

- **WHEN** a client puts a body without a name, or with an empty name
- **THEN** the system answers `400 Bad Request`

#### Scenario: The namespace belongs to another user

- **WHEN** a client changes a namespace that another user owns
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`

### Requirement: Removal of a namespace

The system SHALL remove a namespace at `DELETE /api/v1/namespaces/:id`, and it SHALL answer
`204 No Content`. The caller must own the namespace, or carry the role `admin`.

The system SHALL count the projects of the namespace before the removal. If the namespace still holds one
project or more, the system SHALL refuse the removal. Thus no project loses its namespace.

#### Scenario: The namespace is empty

- **WHEN** a client deletes a namespace that the caller owns and that holds no project
- **THEN** the system removes the record, and it answers `204`

#### Scenario: The namespace still holds projects

- **WHEN** a client deletes a namespace that the caller owns and that holds one project or more
- **THEN** the system raises `NAMESPACE_NOT_EMPTY`, it answers `409 Conflict`, and it removes no record

#### Scenario: The namespace does not exist

- **WHEN** a client deletes a UUID that matches no namespace
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The namespace belongs to another user

- **WHEN** a client deletes a namespace that another user owns
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`
