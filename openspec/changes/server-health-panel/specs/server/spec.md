## ADDED Requirements

### Requirement: The panel of the health

The screen SHALL show a panel of the health above the actions of the maintenance.

The panel SHALL show one line per critical dependency, with the name of the dependency and its state. The
state is `up` or `down`. The panel SHALL also show one aggregate mark, so the operator reads the health of
the server without reading each line.

The aggregate mark says that the server is ready only when every dependency is `up`.

#### Scenario: Every dependency is available

- **WHEN** the user opens `/server`, and the API reports that every dependency is `up`
- **THEN** the panel shows one line per dependency with the state `up`, and the aggregate mark says that the
  server is ready

#### Scenario: One dependency is not available

- **WHEN** the API reports that one dependency is `down`
- **THEN** the panel shows the state of each dependency, and the aggregate mark says that the server is not
  ready

### Requirement: A dependency that is down is data, and not a failure of the screen

The API answers `503 Service Unavailable` when a dependency is down, and the body of that answer holds the
state of each dependency.

The screen SHALL read the body of that answer and show it. The screen SHALL NOT show the panel of a failed
reading in that case, because a dependency that is down is the case that the panel exists for.

#### Scenario: The API answers 503 with a body

- **WHEN** the API answers `503`, and the body holds the aggregate state and the state of each dependency
- **THEN** the panel shows those states, and it shows no message of a failed reading

#### Scenario: The API does not answer

- **WHEN** the call itself fails, and no body arrives
- **THEN** the panel says that it could not read the health of the server

### Requirement: The information of the Docker daemon

The panel SHALL show the information that the Docker daemon reports, when the daemon answers.

When the daemon does not answer, the panel SHALL say so in place of the information. The line of the
dependency of the daemon already carries the state, so the panel does not repeat it as a failure.

#### Scenario: The daemon answers

- **WHEN** the API gives the information of the daemon
- **THEN** the panel shows that information

#### Scenario: The daemon does not answer

- **WHEN** the API answers `503` for the state of the daemon
- **THEN** the panel says that the daemon is not reachable, in place of the information

### Requirement: The panel reads one time

The screen SHALL read the health when it opens, and it SHALL NOT read it again on a timer.

While the two reads run, the panel SHALL show that the reading runs.

The operator sees the state of the moment when the screen opens. A panel that reads again on a timer holds
a connection open for as long as the screen stays open, and this change does not add that.

#### Scenario: The user opens the screen

- **WHEN** the user opens `/server`
- **THEN** the screen reads the readiness and the state of the daemon one time, and it shows that the
  reading runs until the two answers arrive

#### Scenario: The screen stays open

- **WHEN** the screen stays open after the two answers arrived
- **THEN** the screen makes no further call, and the panel keeps the values that it read

## REMOVED Requirements

### Requirement: The screen shows no state of the server

**Reason:** this change closes the gap that the requirement recorded. The screen now reads the readiness and
the state of the daemon, and it shows both.

**Migration:** none. No behavior goes away, and no client depends on the absence of the panel. The
requirements of the panel of the health replace this one.
