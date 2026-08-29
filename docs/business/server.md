# server

## Purpose

This capability keeps the server of the platform in good order. It reports the readiness of the critical dependencies, it reports the state of the Docker daemon, it removes the unused resources, and it removes the containers that agree with no available service. It also gives the screen of the maintenance of the server, at the route `/server`, where the operator gives back the space of the disk, removes the containers that no service needs, and updates the platform to a new release.

## The readiness probe

The system SHALL give a public readiness probe at `GET /api/v1/server/readiness`.

The probe examines the six critical dependencies of the stack, in this order: PostgreSQL, the Docker daemon, Redis, the reverse proxy, the backend container and the frontend container. The answer holds the aggregate status and one entry per dependency. The aggregate status is `ok` only if every dependency is `up`.

The system SHALL run every probe at the same time. A probe that gives `false`, and a probe that raises an error, both give the state `down`. The check itself SHALL never raise an error.

### Scenario: Every dependency is available

- **WHEN** a client calls the probe, and the six dependencies all answer
- **THEN** the system answers `200` with the status `ok`, and with the state `up` for each dependency

### Scenario: One dependency is not available

- **WHEN** a client calls the probe, and one dependency does not answer
- **THEN** the system answers `503 Service Unavailable`, and the body holds the status `error` and the state of each dependency

### Scenario: The client sends no token

- **WHEN** a client calls the probe without an access token
- **THEN** the system runs the probe, because the endpoint is public

## The state of the Docker daemon

The system SHALL answer with the information of the Docker daemon at `GET /api/v1/server/status`.

The answer holds the field `connected` and the information that the daemon reports. This endpoint needs an access token.

### Scenario: The daemon answers

- **WHEN** an authenticated client calls the endpoint, and the daemon answers
- **THEN** the system answers `200` with `connected` set to true, and with the information of the daemon

### Scenario: The daemon does not answer

- **WHEN** the daemon is not reachable
- **THEN** the system answers `503 Service Unavailable` with a message that asks the operator to verify that the server runs

## The removal of the unused resources

The system SHALL give three operations that remove the unused resources of the server:

| Endpoint                               | Removes                                  |
|----------------------------------------|------------------------------------------|
| `POST /api/v1/server/prune/images`     | The images that no container uses        |
| `POST /api/v1/server/prune/volumes`    | The local volumes that no container uses |
| `POST /api/v1/server/prune/containers` | The containers that stopped              |

Each operation answers `200` with the count of the removed resources and the space of the disk that the removal gives back.

### Scenario: The removal succeeds

- **WHEN** an authenticated client calls one of the three endpoints
- **THEN** the system answers `200` with the count of the removed resources and the space that it gives back

### Scenario: The daemon is not reachable

- **WHEN** the Docker daemon does not answer during one of the three operations
- **THEN** the system answers `503 Service Unavailable` with a message that names the resource of that operation

## The removal of the orphan containers

The system SHALL remove the containers of the platform whose compose project agrees with no available service, at `POST /api/v1/server/containers/orphaned`.

The system SHALL first read every service, and it SHALL calculate the name of the compose project of each one. The system SHALL then remove by force every container of the platform whose project is not in that set.

The answer holds the count of the removed containers and their names.

### Scenario: The server holds orphan containers

- **WHEN** a container of the platform carries the name of a compose project that no available service gives
- **THEN** the system removes that container by force, and it answers `200` with the count and the names

### Scenario: The server holds no orphan container

- **WHEN** every container of the platform agrees with an available service
- **THEN** the system removes nothing, and it answers `200` with the count 0 and an empty list of names

### Scenario: The daemon is not reachable

- **WHEN** the Docker daemon does not answer
- **THEN** the system answers `503 Service Unavailable`

## The check of the latest release

The system SHALL check for the latest release of GitPaaS every six hours, and once when the backend starts, and it SHALL keep the version it finds, so a read of the version of the installation needs no call to GitHub.

The setting `UPDATE_CHECK_ENABLED` SHALL turn this check off. A check that fails raises no error to an administrator; it logs the failure alone, and it keeps the version of the last successful check.

### Scenario: The check finds a release

- **WHEN** the check reads the latest release that GitHub publishes for GitPaaS
- **THEN** the system keeps its version, so the screen of the maintenance can offer it

### Scenario: The check fails

- **WHEN** the check cannot reach GitHub, or GitHub answers with an error
- **THEN** the system keeps the version of the last successful check, and it raises no error to the administrator

## The version of the installation and the state of the update

The system SHALL answer with the version the platform runs, the latest release, and the state of the last update, at `GET /api/v1/server/update`. This endpoint needs an administrator.

### Scenario: An administrator reads the state

- **WHEN** an administrator calls the endpoint
- **THEN** the system answers `200` with the installed version, the latest version, and the state of the last update, when one exists

## The start of the update

The system SHALL start the update of the platform at `POST /api/v1/server/update`, for an administrator alone. The update runs inside a short-lived container, detached from the backend, so the update goes on through the restart that it brings to the backend.

The system SHALL refuse to start a second update while one runs. It SHALL also refuse to start the update when the installed version is unknown, when the latest version is unknown, or when the two versions already agree.

### Scenario: An administrator starts the update

- **WHEN** an administrator calls the endpoint, and the platform runs behind the latest release
- **THEN** the system opens a row for the state of the update, starts the container of the update, and answers `202` with that state

### Scenario: An update already runs

- **WHEN** an administrator calls the endpoint while an update runs
- **THEN** the system answers with an error, and it starts no second update

### Scenario: The platform already runs the latest release

- **WHEN** an administrator calls the endpoint, and the installed version already agrees with the latest version
- **THEN** the system answers with an error, and it starts no update

## The four actions of the maintenance

The tab Maintenance SHALL show four actions, each one with a name, a short description and a button. An administrator whom the platform can update SHALL also see, above these four actions, the alert of a new version (see below).

| Action                     | Description                                                         |
|----------------------------|---------------------------------------------------------------------|
| Clear unused images        | Remove the images that no container uses                            |
| Clear unused volumes       | Remove the volumes that no container uses                           |
| Clear unused containers    | Remove the containers that stopped                                  |
| Remove orphaned containers | Stop by force and remove the containers of a service that went away |

### Scenario: The user opens the screen

- **WHEN** a signed-in user opens `/server/maintenance`
- **THEN** the system shows the four actions with their descriptions

## The question before an action

The system SHALL ask the user to confirm before it runs any of the four actions.

The question carries the name of the action, and a message that says what goes away and that the action has no way back. The user can confirm or cancel.

### Scenario: The user chooses an action

- **WHEN** the user chooses the button of one action
- **THEN** the system opens the question with the name and the message of that action, and it calls no endpoint

### Scenario: The user cancels

- **WHEN** the user cancels the question
- **THEN** the system closes the question, and it calls no endpoint

## One action at a time

The system SHALL block the buttons of the four actions while an action runs. The question shows the state of the work.

### Scenario: An action runs

- **WHEN** the user confirms an action, and the call runs
- **THEN** the system blocks the four buttons until the call ends

## The report of the result

The system SHALL show a message with the result of the action.

For the three removals of the unused resources:

- The action removed nothing: "No unused &lt;resource&gt; to remove."
- The action removed something: the count and the space of the disk that it gives back, in a compact form such as "1.5 MB".

For the removal of the orphan containers:

- The action removed nothing: "No orphaned containers to remove."
- The action removed something: the count of the removed containers.

### Scenario: The action removed resources

- **WHEN** the API answers with a count above zero
- **THEN** the system shows a message of success with the count and the space that the action gives back

### Scenario: The action removed nothing

- **WHEN** the API answers with the count zero
- **THEN** the system shows a message of success that says that there was nothing to remove

### Scenario: The action fails

- **WHEN** the call fails, for example because the Docker daemon does not answer
- **THEN** the system shows a message of failure that asks the user to verify that the daemon runs

## The alert of a new version

The tab Maintenance SHALL show an alert "A new version X.Y.Z is available" when the latest release differs from the installed version, and it SHALL show no alert when the two agree.

The alert SHALL carry a button "Update GitPaaS". The system SHALL ask the user to confirm before it starts the update, with a message that names the target version, and that says the platform restarts while the deployed services keep running.

The tab SHALL hide the alert, and the button, from a user who is not an administrator.

### Scenario: A new release is available

- **WHEN** an administrator opens the tab Maintenance, and the latest release differs from the installed version
- **THEN** the system shows the alert with the version and the button "Update GitPaaS"

### Scenario: The platform already runs the latest release

- **WHEN** the latest release agrees with the installed version
- **THEN** the system shows no alert

### Scenario: The user is not an administrator

- **WHEN** a user who is not an administrator opens the tab Maintenance
- **THEN** the system shows neither the alert nor the button, whatever the two versions are

## The progress of the update

Once the user confirms the update, the system SHALL read the state of the update every two seconds, and it SHALL show the step that runs and a bar of the progress, until the update ends or the read times out.

### Scenario: The update runs

- **WHEN** the user confirms the update
- **THEN** the system reads the state of the update every two seconds, and it shows the step and the percent that the last read carries

## The end of the update

The system SHALL reload the page when the state of the update reports its end, and the installed version agrees with the target version.

The system SHALL show the last step and the reason, and it SHALL NOT reload the page, when the update fails or when the read times out.

### Scenario: The update succeeds

- **WHEN** the state of the update reports its end, and the installed version agrees with the target version
- **THEN** the system reloads the page

### Scenario: The update fails

- **WHEN** the state of the update reports a failure
- **THEN** the system shows the last step and the reason of the failure, and it does not reload the page

### Scenario: The read times out

- **WHEN** the update does not end after ten minutes
- **THEN** the system says that the update did not finish in time, and it does not reload the page

## The panel of the health

The tab Health SHALL show a panel of the health, and that tab is the tab that `/server` opens.

The panel SHALL show one line per critical dependency, with the label of the dependency and its state. The state is `up` or `down`. The panel SHALL also show one aggregate mark, so the operator reads the health of the server without reading each line.

The label replaces the raw name that the probe reports:

| Name of the probe  | Label         |
|--------------------|---------------|
| `postgres`         | PostgreSQL    |
| `docker`           | Docker daemon |
| `redis`            | Redis         |
| `proxy`            | Reverse proxy |
| `backend`          | Backend       |
| `frontend`         | Frontend      |

The panel SHALL show the raw name when a dependency carries a name that this table does not hold.

The aggregate mark says that the server is ready only when every dependency is `up`.

### Scenario: Every dependency is available

- **WHEN** the user opens `/server`, and the API reports that every dependency is `up`
- **THEN** the panel shows one line per dependency with the state `up`, and the aggregate mark says that the server is ready

### Scenario: One dependency is not available

- **WHEN** the API reports that one dependency is `down`
- **THEN** the panel shows the state of each dependency, and the aggregate mark says that the server is not ready

### Scenario: The API reports a dependency that the table does not hold

- **WHEN** the API reports a dependency whose name is not in the table of the labels
- **THEN** the panel shows the raw name of that dependency, in place of a label

## A dependency that is down is data, and not a failure of the screen

The API answers `503 Service Unavailable` when a dependency is down, and the body of that answer holds the state of each dependency.

The screen SHALL read the body of that answer and show it. The screen SHALL NOT show the panel of a failed reading in that case, because a dependency that is down is the case that the panel exists for.

### Scenario: The API answers 503 with a body

- **WHEN** the API answers `503`, and the body holds the aggregate state and the state of each dependency
- **THEN** the panel shows those states, and it shows no message of a failed reading

### Scenario: The API does not answer

- **WHEN** the call itself fails, and no body arrives
- **THEN** the panel says that it could not read the health of the server

## The information of the Docker daemon

The panel SHALL show the information that the Docker daemon reports, when the daemon answers.

When the daemon does not answer, the panel SHALL say so in place of the information. The line of the dependency of the daemon already carries the state, so the panel does not repeat it as a failure.

### Scenario: The daemon answers

- **WHEN** the API gives the information of the daemon
- **THEN** the panel shows that information

### Scenario: The daemon does not answer

- **WHEN** the API answers `503` for the state of the daemon
- **THEN** the panel says that the daemon is not reachable, in place of the information

## The panel reads one time, and the button of the refresh reads again

The tab Health SHALL read the health when it opens, and it SHALL NOT read it again on a timer. The panel SHALL carry a button "Refresh" that reads the health again, on the choice of the operator alone.

While a read runs, the panel SHALL show that the reading runs, and it SHALL disable the button "Refresh".

The operator sees the state of the moment when the tab opens, or the moment of the last choice of the button "Refresh". A panel that reads again on a timer holds a connection open for as long as the screen stays open, and this change does not add that; the operator asks for a new read instead.

### Scenario: The user opens the screen

- **WHEN** the user opens `/server`
- **THEN** the screen reads the readiness and the state of the daemon one time, and it shows that the reading runs until the two answers arrive

### Scenario: The screen stays open

- **WHEN** the screen stays open after the two answers arrived
- **THEN** the screen makes no further call, and the panel keeps the values that it read

### Scenario: The user chooses the button "Refresh"

- **WHEN** the user chooses the button "Refresh"
- **THEN** the screen reads the readiness and the state of the daemon again, and it disables the button "Refresh" until the two answers arrive

### Scenario: The user comes back to the tab

- **WHEN** the user opens another tab and comes back to the tab Health
- **THEN** the screen reads the health again one time, and it shows that the reading runs

## The parameters of the deployment system

The system SHALL keep the parameters of the deployment system that the operator sets, and it SHALL give them at `GET /api/v1/server/settings`. This endpoint needs an access token.

The answer holds one field per parameter. The first parameter is the age of an archived log row, in days.

The system SHALL hold a value by default for every parameter, and it SHALL give that value while the operator sets none. Thus an installation whose operator opened no screen still gets the behavior.

### Scenario: The operator set no parameter

- **WHEN** an authenticated client calls the endpoint, and the operator saved nothing
- **THEN** the system answers `200` with the value by default of each parameter

### Scenario: The operator set a parameter

- **WHEN** an authenticated client calls the endpoint after the operator saved a value
- **THEN** the system answers `200` with the value that the operator saved

### Scenario: The client sends no token

- **WHEN** a client calls the endpoint without an access token
- **THEN** the system answers `401 Unauthorized`

## The operator writes the parameters

The system SHALL write the parameters of the deployment system at `PUT /api/v1/server/settings`. This endpoint needs an access token.

The system SHALL refuse an age below 1 day and above 365 days. The system SHALL refuse a value that is no whole number.

A value that the operator writes SHALL apply without a restart of the server.

### Scenario: The value is inside the limits

- **WHEN** an authenticated client writes an age between 1 and 365 days
- **THEN** the system keeps that value, and it answers `200` with the parameters that it keeps

### Scenario: The value is outside the limits

- **WHEN** an authenticated client writes an age below 1 day or above 365 days
- **THEN** the system answers `400 Bad Request`, and it changes no value

### Scenario: The value is no whole number

- **WHEN** an authenticated client writes an age that is no whole number
- **THEN** the system answers `400 Bad Request`, and it changes no value

### Scenario: The next work reads the new value

- **WHEN** the operator writes a new age, and the work that uses that age runs again
- **THEN** that work uses the new value, and the server needs no restart

## The screen of the server carries tabs

The screen at `/server` SHALL show three tabs: Health, Maintenance and Settings.

The route SHALL carry the tab. The path `/server` SHALL send the browser to `/server/health`, and the path `/server/<tab>` SHALL show the tab of that name. A name that agrees with no tab SHALL show Health.

Each tab keeps its own content, and the three names stay visible at the same time.

### Scenario: The user opens the screen

- **WHEN** a signed-in user opens `/server`
- **THEN** the system sends the browser to `/server/health`, and it shows the panel of the health

### Scenario: The user chooses a tab

- **WHEN** the user chooses the name of another tab
- **THEN** the system shows the content of that tab, and it writes the name of that tab into the route

### Scenario: The user opens a tab by its address

- **WHEN** the user opens `/server/settings` directly
- **THEN** the system shows the tab Settings

### Scenario: The name agrees with no tab

- **WHEN** the user opens `/server/<name>`, and no tab carries that name
- **THEN** the system shows the tab Health

## The tab of the settings

The tab Settings SHALL show one field per parameter of the deployment system. The first field is the age of an archived log row, in days.

The field SHALL state its limits, which are 1 day and 365 days, and it SHALL state what the value does: the system removes the output of a deployment that is older than that age.

The tab SHALL read the parameters when it opens, and it SHALL write them when the user saves.

### Scenario: The user opens the tab

- **WHEN** the user opens the tab Settings
- **THEN** the system reads the parameters, and it shows the value of each field

### Scenario: The user saves a value

- **WHEN** the user writes an age inside the limits and saves
- **THEN** the system writes the parameters, and it shows a message of success

### Scenario: The user saves a value outside the limits

- **WHEN** the user writes an age outside the limits
- **THEN** the screen says that the value is not valid, and it calls no endpoint

### Scenario: The write fails

- **WHEN** the call of the write fails
- **THEN** the system shows a message of failure, and it keeps the value that the user wrote in the field
