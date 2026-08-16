# server Specification

## Purpose

This capability keeps the server of the platform in good order. It reports the readiness of the critical dependencies, it reports the state of the Docker daemon, it removes the unused resources, and it removes the containers that agree with no available service. It also gives the screen of the maintenance of the server, at the route `/server`, where the operator gives back the space of the disk, and removes the containers that no service needs.

## Requirements

### Requirement: The readiness probe

The system SHALL give a public readiness probe at `GET /api/v1/server/readiness`.

The probe examines the critical dependencies: PostgreSQL and the Docker daemon. The answer holds the aggregate status and one entry per dependency. The aggregate status is `ok` only if every dependency is `up`.

The system SHALL run every probe at the same time. A probe that gives `false`, and a probe that raises an error, both give the state `down`. The check itself SHALL never raise an error.

#### Scenario: Every dependency is available

- **WHEN** a client calls the probe, and PostgreSQL and the Docker daemon both answer
- **THEN** the system answers `200` with the status `ok`, and with the state `up` for each dependency

#### Scenario: One dependency is not available

- **WHEN** a client calls the probe, and one dependency does not answer
- **THEN** the system answers `503 Service Unavailable`, and the body holds the status `error` and the state of each dependency

#### Scenario: The client sends no token

- **WHEN** a client calls the probe without an access token
- **THEN** the system runs the probe, because the endpoint is public

### Requirement: The state of the Docker daemon

The system SHALL answer with the information of the Docker daemon at `GET /api/v1/server/status`.

The answer holds the field `connected` and the information that the daemon reports. This endpoint needs an access token.

#### Scenario: The daemon answers

- **WHEN** an authenticated client calls the endpoint, and the daemon answers
- **THEN** the system answers `200` with `connected` set to true, and with the information of the daemon

#### Scenario: The daemon does not answer

- **WHEN** the daemon is not reachable
- **THEN** the system answers `503 Service Unavailable` with a message that asks the operator to verify that the server runs

### Requirement: The removal of the unused resources

The system SHALL give three operations that remove the unused resources of the server:

| Endpoint                               | Removes                                  |
|----------------------------------------|------------------------------------------|
| `POST /api/v1/server/prune/images`     | The images that no container uses        |
| `POST /api/v1/server/prune/volumes`    | The local volumes that no container uses |
| `POST /api/v1/server/prune/containers` | The containers that stopped              |

Each operation answers `200` with the count of the removed resources and the space of the disk that the removal gives back.

#### Scenario: The removal succeeds

- **WHEN** an authenticated client calls one of the three endpoints
- **THEN** the system answers `200` with the count of the removed resources and the space that it gives back

#### Scenario: The daemon is not reachable

- **WHEN** the Docker daemon does not answer during one of the three operations
- **THEN** the system answers `503 Service Unavailable` with a message that names the resource of that operation

### Requirement: The removal of the orphan containers

The system SHALL remove the containers of the platform whose compose project agrees with no available service, at `POST /api/v1/server/containers/orphaned`.

The system SHALL first read every service, and it SHALL calculate the name of the compose project of each one. The system SHALL then remove by force every container of the platform whose project is not in that set.

The answer holds the count of the removed containers and their names.

#### Scenario: The server holds orphan containers

- **WHEN** a container of the platform carries the name of a compose project that no available service gives
- **THEN** the system removes that container by force, and it answers `200` with the count and the names

#### Scenario: The server holds no orphan container

- **WHEN** every container of the platform agrees with an available service
- **THEN** the system removes nothing, and it answers `200` with the count 0 and an empty list of names

#### Scenario: The daemon is not reachable

- **WHEN** the Docker daemon does not answer
- **THEN** the system answers `503 Service Unavailable`

### Requirement: The four actions of the maintenance

The system SHALL show four actions, each one with a name, a short description and a button:

| Action                     | Description                                                         |
|----------------------------|---------------------------------------------------------------------|
| Clear unused images        | Remove the images that no container uses                            |
| Clear unused volumes       | Remove the volumes that no container uses                           |
| Clear unused containers    | Remove the containers that stopped                                  |
| Remove orphaned containers | Stop by force and remove the containers of a service that went away |

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens `/server`
- **THEN** the system shows the four actions with their descriptions

### Requirement: The question before an action

The system SHALL ask the user to confirm before it runs any of the four actions.

The question carries the name of the action, and a message that says what goes away and that the action has no way back. The user can confirm or cancel.

#### Scenario: The user chooses an action

- **WHEN** the user chooses the button of one action
- **THEN** the system opens the question with the name and the message of that action, and it calls no endpoint

#### Scenario: The user cancels

- **WHEN** the user cancels the question
- **THEN** the system closes the question, and it calls no endpoint

### Requirement: One action at a time

The system SHALL block the buttons of the four actions while an action runs. The question shows the state of the work.

#### Scenario: An action runs

- **WHEN** the user confirms an action, and the call runs
- **THEN** the system blocks the four buttons until the call ends

### Requirement: The report of the result

The system SHALL show a message with the result of the action.

For the three removals of the unused resources:

- The action removed nothing: "No unused &lt;resource&gt; to remove."
- The action removed something: the count and the space of the disk that it gives back, in a compact form such as "1.5 MB".

For the removal of the orphan containers:

- The action removed nothing: "No orphaned containers to remove."
- The action removed something: the count of the removed containers.

#### Scenario: The action removed resources

- **WHEN** the API answers with a count above zero
- **THEN** the system shows a message of success with the count and the space that the action gives back

#### Scenario: The action removed nothing

- **WHEN** the API answers with the count zero
- **THEN** the system shows a message of success that says that there was nothing to remove

#### Scenario: The action fails

- **WHEN** the call fails, for example because the Docker daemon does not answer
- **THEN** the system shows a message of failure that asks the user to verify that the daemon runs

### Requirement: The panel of the health

The screen SHALL show a panel of the health above the actions of the maintenance.

The panel SHALL show one line per critical dependency, with the name of the dependency and its state. The state is `up` or `down`. The panel SHALL also show one aggregate mark, so the operator reads the health of the server without reading each line.

The aggregate mark says that the server is ready only when every dependency is `up`.

#### Scenario: Every dependency is available

- **WHEN** the user opens `/server`, and the API reports that every dependency is `up`
- **THEN** the panel shows one line per dependency with the state `up`, and the aggregate mark says that the server is ready

#### Scenario: One dependency is not available

- **WHEN** the API reports that one dependency is `down`
- **THEN** the panel shows the state of each dependency, and the aggregate mark says that the server is not ready

### Requirement: A dependency that is down is data, and not a failure of the screen

The API answers `503 Service Unavailable` when a dependency is down, and the body of that answer holds the state of each dependency.

The screen SHALL read the body of that answer and show it. The screen SHALL NOT show the panel of a failed reading in that case, because a dependency that is down is the case that the panel exists for.

#### Scenario: The API answers 503 with a body

- **WHEN** the API answers `503`, and the body holds the aggregate state and the state of each dependency
- **THEN** the panel shows those states, and it shows no message of a failed reading

#### Scenario: The API does not answer

- **WHEN** the call itself fails, and no body arrives
- **THEN** the panel says that it could not read the health of the server

### Requirement: The information of the Docker daemon

The panel SHALL show the information that the Docker daemon reports, when the daemon answers.

When the daemon does not answer, the panel SHALL say so in place of the information. The line of the dependency of the daemon already carries the state, so the panel does not repeat it as a failure.

#### Scenario: The daemon answers

- **WHEN** the API gives the information of the daemon
- **THEN** the panel shows that information

#### Scenario: The daemon does not answer

- **WHEN** the API answers `503` for the state of the daemon
- **THEN** the panel says that the daemon is not reachable, in place of the information

### Requirement: The panel reads one time

The screen SHALL read the health when it opens, and it SHALL NOT read it again on a timer.

While the two reads run, the panel SHALL show that the reading runs.

The operator sees the state of the moment when the screen opens. A panel that reads again on a timer holds a connection open for as long as the screen stays open, and this change does not add that.

#### Scenario: The user opens the screen

- **WHEN** the user opens `/server`
- **THEN** the screen reads the readiness and the state of the daemon one time, and it shows that the reading runs until the two answers arrive

#### Scenario: The screen stays open

- **WHEN** the screen stays open after the two answers arrived
- **THEN** the screen makes no further call, and the panel keeps the values that it read
