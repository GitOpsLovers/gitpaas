# deployments

## Purpose

This capability starts and records each attempt to run the Docker Compose stack of a service. It divides the work into a quick request that records the intention and a background run that does the work, and it keeps the lifecycle of every attempt.

## The deployment record

The system SHALL keep one record per deployment. The record holds the identifier, the identifier of the service, the status, the branch, the commit, the first line of the message of the commit, the path of the compose file, the origin of the trigger, the message of the error, the date of the creation and the date of the end.

The status is `pending`, `running`, `success` or `failed`.

### Scenario: The system gives a deployment

- **WHEN** a client reads a deployment
- **THEN** the system gives all these fields, and the fields of the commit, of the error and of the end date hold `null` while no value applies

## The lifecycle of a deployment

The system SHALL move a deployment through the states `pending`, `running` and then `success` or `failed`.

A deployment SHALL NOT stay in the state `pending`. If the run cannot start or cannot finish, the system gives the deployment the status `failed`.

### Scenario: The run succeeds

- **WHEN** the runner completes the Docker work without an error
- **THEN** the system sets the status to `running` at the start, and to `success` at the end

### Scenario: The run fails

- **WHEN** the Docker work raises an error, for example a build error
- **THEN** the system sets the status to `failed`, and it writes the message of the error into the record

## Trigger of a deployment

The system SHALL create a deployment at `POST /api/v1/deployments`. The body holds only the identifier of the service.

The request means "deploy the head of the branch of this service, now". The system SHALL calculate every other value.

Before the system writes the record, it SHALL do these four checks and steps:

1. The service must exist.
2. The service must be deployable. It must hold an identifier of a provider, an identifier of a repository and a deployment branch.
3. The system loads the credentials of the provider of the service.
4. The system asks the provider client for the head commit of the branch, with those credentials.

The system SHALL then write the record with the status `pending`, the selected commit, the branch, the path of the compose file and the origin of the trigger.

### Scenario: The service is deployable

- **WHEN** a client posts the identifier of an available and deployable service
- **THEN** the system loads the credentials of the provider, it resolves the head commit, it writes a record with the status `pending`, and it puts a run task into the queue

### Scenario: The service does not exist

- **WHEN** a client posts a UUID that matches no service
- **THEN** the system raises `SERVICE_NOT_FOUND`, and it answers `404 Not Found`

### Scenario: The service is not deployable

- **WHEN** a client posts the identifier of a service that holds no identifier of a provider, no identifier of a repository, or no deployment branch
- **THEN** the system raises `SERVICE_NOT_DEPLOYABLE`, and it answers `400 Bad Request`

### Scenario: The provider cannot reach the repository

- **WHEN** the provider of the service cannot reach the stored repository
- **THEN** the system writes no record, and it answers with a message that names the provider and the repository

### Scenario: The provider client cannot give the commit

- **WHEN** the provider client cannot resolve the head of the branch
- **THEN** the system writes no record, and it answers with the error of the provider client

### Scenario: The body is not correct

- **WHEN** a client posts a body without a `serviceId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

## Immediate answer of the trigger

The system SHALL answer with the record before it starts any Docker work.

The identifier of the record is the most important part of the answer, because the client uses it to read the live output. A wait of some minutes can cause a timeout in the client or in a proxy, and it gives no data about the progress.

### Scenario: A client triggers a deployment

- **WHEN** the system writes the record and puts the run task into the queue
- **THEN** the system answers immediately with the record, and the status of that record is `pending`

## The durable queue of the runs

The system SHALL keep each run task as a row of a queue table, and not only in the memory. Thus the work that is not complete stays after a restart of the process.

### Scenario: A task enters the queue

- **WHEN** the system puts a run task into the queue
- **THEN** the system writes a row with the status `queued`, and it emits the task for the runner

### Scenario: The process restarts

- **WHEN** the application starts, and the queue table holds rows with the status `queued` or `processing`
- **THEN** the system sets those rows back to `queued`, and it emits each one again for the runner

## The order of the runs

The system SHALL run the tasks of the same service one after the other. Thus a new deployment never runs at the same time as the removal of the containers of the previous deployment of that service.

The system SHALL run the tasks of different services at the same time.

### Scenario: Two deployments of the same service

- **WHEN** the queue holds two tasks of the same service
- **THEN** the system starts the second task only after the first task ends

### Scenario: Two deployments of different services

- **WHEN** the queue holds two tasks of different services
- **THEN** the system runs the two tasks at the same time

## New attempts and the dead-letter state

The system SHALL try a task again after an unexpected failure, to a maximum of 3 attempts.

When no attempt is left, the system SHALL put the row into the dead-letter state, and it SHALL give the deployment the status `failed`.

A business failure is different. A build error, or a Docker daemon that is not available, becomes a deployment with the status `failed` and with its log entries, and the system does not try it again.

### Scenario: An unexpected failure with attempts left

- **WHEN** a run raises an unexpected failure, and the task made fewer than 3 attempts
- **THEN** the system puts the task into the queue again

### Scenario: An unexpected failure with no attempt left

- **WHEN** a run raises an unexpected failure, and the task made 3 attempts
- **THEN** the system sets the queue row to `failed`, and it gives the deployment the status `failed`

### Scenario: A business failure

- **WHEN** the Docker work fails because of a build error
- **THEN** the system gives the deployment the status `failed` with its log entries, and it does not try the task again

## The steps of the background run

The system SHALL do these steps for each run task:

1. Set the status of the deployment to `running`.
2. Load the credentials of the provider of the service.
3. Get the archive of the repository at the selected commit from the provider client, with those credentials.
4. Run the Docker executor. It extracts the archive, it builds the local services, it pulls the images of the registry, it stops the containers of the service alone, and it starts the new containers.
5. Record the volumes Compose created for the stack that the database does not hold yet. See the requirement *The origin of a volume* of the capability [volumes](./volumes.md).
6. Set the status to `success` or to `failed`.

The stop of the step 4 reaches the containers of the one service alone, and never the whole compose project, so a sibling service of the same project keeps running while this service deploys.

The runner SHALL NOT keep the output itself. It SHALL send each line of the executor to the write port of the logs, and it SHALL call the completion of that port with the terminal status.

### Scenario: The executor emits a line

- **WHEN** the Docker executor emits one line of output
- **THEN** the runner sends that line to the write port of the logs

### Scenario: The run ends

- **WHEN** the run reaches a terminal status
- **THEN** the runner calls the completion of the write port with `success` or with `failed`

### Scenario: The run fails

- **WHEN** a step of the run raises an error
- **THEN** the runner writes one more line that holds the message of the error, and then it calls the completion with `failed`

### Scenario: The provider went away

- **WHEN** the runner cannot load the credentials of the provider of the service
- **THEN** the run fails with a message that names the provider, and the deployment gets the status `failed`

## List of the deployments of a service

The system SHALL answer with the deployments of one service at `GET /api/v1/deployments?serviceId=<uuid>`.

The parameter `serviceId` is obligatory, and it must be a UUID.

### Scenario: The service holds deployments

- **WHEN** a client calls the endpoint with the identifier of a service that holds deployments
- **THEN** the system answers `200` with the deployments of that service only

### Scenario: The parameter is absent or is no UUID

- **WHEN** a client calls the endpoint without `serviceId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

## Read of one deployment

The system SHALL answer with one deployment at `GET /api/v1/deployments/:id`.

### Scenario: The deployment exists

- **WHEN** a client calls the endpoint with the identifier of an available deployment
- **THEN** the system answers `200` with that deployment

### Scenario: The deployment does not exist

- **WHEN** a client calls the endpoint with a UUID that matches no deployment
- **THEN** the system answers `404 Not Found`

## Removal of a deployment

The system SHALL remove a deployment at `DELETE /api/v1/deployments/:id`, and it SHALL answer `204 No Content`.

When the system removes the record, it SHALL also remove the log entries of that deployment. The database removes the remaining data by the cascade.

### Scenario: The deployment exists

- **WHEN** a client deletes an available deployment
- **THEN** the system removes the record, it removes the log entries of that deployment, and it answers `204`

### Scenario: The deployment does not exist

- **WHEN** a client deletes a UUID that matches no deployment
- **THEN** the system answers `404 Not Found`, and it removes no log entry

## The tab "Deployments" shows the history

The tab `deployments` SHALL show one entry per deployment, the newest first.

Each entry holds the status, the first line of the message of the commit, the short form of the SHA, the branch, the date of the creation and the length of the run. An entry of a deployment that failed also holds the message of the error.

Each entry gives two actions: view the output, and remove the record.

While the reading runs and the list is empty, the tab says "Loading deployments…". If the reading ends and the list is empty, the tab says "No deployments yet.".

### Scenario: The user removes a deployment

- **WHEN** the user removes a deployment, and the API answers `204`
- **THEN** the system reads the history again, and it shows the message "Deployment deleted"

### Scenario: The removal fails

- **WHEN** the call of the removal fails
- **THEN** the system shows the message "Could not delete deployment"

### Scenario: The service holds no deployment

- **WHEN** the reading ends, and the service holds no deployment
- **THEN** the tab says "No deployments yet."
