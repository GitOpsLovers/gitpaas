## MODIFIED Requirements

### Requirement: The service record

The system SHALL keep one record per service. The record holds the identifier, the name, the identifier of
the project, the identifier of the provider, the identifier of the repository, the deployment branch and the
path of the compose file.

The identifier is a UUID that the database generates. The identifier of the provider is obligatory, and the
database refuses the removal of a provider that a service still names. The three fields of the deployment
start as an empty text, because a caller gives them after the creation.

#### Scenario: The system gives a service

- **WHEN** a client reads a service
- **THEN** the system gives the identifier, the name, the identifier of the project, the identifier of the
  provider, the identifier of the repository, the deployment branch and the path of the compose file

### Requirement: Creation of a service

The system SHALL create a service at `POST /api/v1/services`.

The body holds the name, the identifier of the project and the identifier of the provider. The system SHALL
set the identifier of the repository, the deployment branch and the path of the compose file to an empty
text. Thus a new service is not deployable, and a caller makes it deployable with a later change.

#### Scenario: The body is correct

- **WHEN** a client posts a name, the identifier of an available project and the identifier of an available
  provider
- **THEN** the system writes the record, and it answers `201` with the new service

#### Scenario: The project does not exist

- **WHEN** a client posts a name and a UUID that matches no project
- **THEN** the database refuses the foreign key, the system raises `PROJECT_NOT_FOUND`, and it answers
  `404 Not Found`

#### Scenario: The provider does not exist

- **WHEN** a client posts a UUID that matches no provider
- **THEN** the database refuses the foreign key, the system raises `PROVIDER_NOT_FOUND`, and it answers
  `404 Not Found`

#### Scenario: The body is not correct

- **WHEN** a client posts a body without a name, with an empty name, without a `projectId`, without a
  `providerId`, or with a value that is no UUID
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
