## MODIFIED Requirements

### Requirement: Trigger of a deployment

The system SHALL create a deployment at `POST /api/v1/deployments`. The body holds only the identifier of
the service.

The request means "deploy the head of the branch of this service, now". The system SHALL calculate every
other value.

Before the system writes the record, it SHALL do these four checks and steps:

1. The service must exist.
2. The service must be deployable. It must hold an identifier of a provider, an identifier of a repository
   and a deployment branch.
3. The system loads the credentials of the provider of the service.
4. The system asks the provider client for the head commit of the branch, with those credentials.

The system SHALL then write the record with the status `pending`, the selected commit, the branch, the path
of the compose file and the origin of the trigger.

#### Scenario: The service is deployable

- **WHEN** a client posts the identifier of an available and deployable service
- **THEN** the system loads the credentials of the provider, it resolves the head commit, it writes a record
  with the status `pending`, and it puts a run task into the queue

#### Scenario: The service does not exist

- **WHEN** a client posts a UUID that matches no service
- **THEN** the system raises `SERVICE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The service is not deployable

- **WHEN** a client posts the identifier of a service that holds no identifier of a provider, no identifier
  of a repository, or no deployment branch
- **THEN** the system raises `SERVICE_NOT_DEPLOYABLE`, and it answers `400 Bad Request`

#### Scenario: The provider cannot reach the repository

- **WHEN** the provider of the service cannot reach the stored repository
- **THEN** the system writes no record, and it answers with a message that names the provider and the
  repository

#### Scenario: The provider client cannot give the commit

- **WHEN** the provider client cannot resolve the head of the branch
- **THEN** the system writes no record, and it answers with the error of the provider client

#### Scenario: The body is not correct

- **WHEN** a client posts a body without a `serviceId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

### Requirement: The steps of the background run

The system SHALL do these steps for each run task:

1. Set the status of the deployment to `running`.
2. Load the credentials of the provider of the service.
3. Get the archive of the repository at the selected commit from the provider client, with those
   credentials.
4. Run the Docker executor. It extracts the archive, it builds the local services, it pulls the images of
   the registry, it stops the previous stack, and it starts the new stack.
5. Set the status to `success` or to `failed`.

The runner SHALL NOT keep the output itself. It SHALL send each line of the executor to the write port of
the logs, and it SHALL call the completion of that port with the terminal status.

#### Scenario: The executor emits a line

- **WHEN** the Docker executor emits one line of output
- **THEN** the runner sends that line to the write port of the logs

#### Scenario: The run ends

- **WHEN** the run reaches a terminal status
- **THEN** the runner calls the completion of the write port with `success` or with `failed`

#### Scenario: The run fails

- **WHEN** a step of the run raises an error
- **THEN** the runner writes one more line that holds the message of the error, and then it calls the
  completion with `failed`

#### Scenario: The provider went away

- **WHEN** the runner cannot load the credentials of the provider of the service
- **THEN** the run fails with a message that names the provider, and the deployment gets the status `failed`
