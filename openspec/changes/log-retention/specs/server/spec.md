## ADDED Requirements

### Requirement: The parameters of the deployment system

The system SHALL keep the parameters of the deployment system that the operator sets, and it SHALL give them
at `GET /api/v1/server/settings`. This endpoint needs an access token.

The answer holds one field per parameter. The first parameter is the age of an archived log row, in days.

The system SHALL hold a value by default for every parameter, and it SHALL give that value while the operator
sets none. Thus an installation whose operator opened no screen still gets the behavior.

#### Scenario: The operator set no parameter

- **WHEN** an authenticated client calls the endpoint, and the operator saved nothing
- **THEN** the system answers `200` with the value by default of each parameter

#### Scenario: The operator set a parameter

- **WHEN** an authenticated client calls the endpoint after the operator saved a value
- **THEN** the system answers `200` with the value that the operator saved

#### Scenario: The client sends no token

- **WHEN** a client calls the endpoint without an access token
- **THEN** the system answers `401 Unauthorized`

### Requirement: The operator writes the parameters

The system SHALL write the parameters of the deployment system at `PUT /api/v1/server/settings`. This
endpoint needs an access token.

The system SHALL refuse an age below 1 day and above 365 days. The system SHALL refuse a value that is no
whole number.

A value that the operator writes SHALL apply without a restart of the server.

#### Scenario: The value is inside the limits

- **WHEN** an authenticated client writes an age between 1 and 365 days
- **THEN** the system keeps that value, and it answers `200` with the parameters that it keeps

#### Scenario: The value is outside the limits

- **WHEN** an authenticated client writes an age below 1 day or above 365 days
- **THEN** the system answers `400 Bad Request`, and it changes no value

#### Scenario: The value is no whole number

- **WHEN** an authenticated client writes an age that is no whole number
- **THEN** the system answers `400 Bad Request`, and it changes no value

#### Scenario: The next work reads the new value

- **WHEN** the operator writes a new age, and the work that uses that age runs again
- **THEN** that work uses the new value, and the server needs no restart

### Requirement: The screen of the server carries tabs

The screen at `/server` SHALL show three tabs: Health, Maintenance and Settings.

The route SHALL carry the tab. The path `/server` SHALL send the browser to `/server/health`, and the path
`/server/<tab>` SHALL show the tab of that name. A name that agrees with no tab SHALL show Health.

Each tab keeps its own content, and the three names stay visible at the same time.

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens `/server`
- **THEN** the system sends the browser to `/server/health`, and it shows the panel of the health

#### Scenario: The user chooses a tab

- **WHEN** the user chooses the name of another tab
- **THEN** the system shows the content of that tab, and it writes the name of that tab into the route

#### Scenario: The user opens a tab by its address

- **WHEN** the user opens `/server/settings` directly
- **THEN** the system shows the tab Settings

#### Scenario: The name agrees with no tab

- **WHEN** the user opens `/server/<name>`, and no tab carries that name
- **THEN** the system shows the tab Health

### Requirement: The tab of the settings

The tab Settings SHALL show one field per parameter of the deployment system. The first field is the age of
an archived log row, in days.

The field SHALL state its limits, which are 1 day and 365 days, and it SHALL state what the value does: the
system removes the output of a deployment that is older than that age.

The tab SHALL read the parameters when it opens, and it SHALL write them when the user saves.

#### Scenario: The user opens the tab

- **WHEN** the user opens the tab Settings
- **THEN** the system reads the parameters, and it shows the value of each field

#### Scenario: The user saves a value

- **WHEN** the user writes an age inside the limits and saves
- **THEN** the system writes the parameters, and it shows a message of success

#### Scenario: The user saves a value outside the limits

- **WHEN** the user writes an age outside the limits
- **THEN** the screen says that the value is not valid, and it calls no endpoint

#### Scenario: The write fails

- **WHEN** the call of the write fails
- **THEN** the system shows a message of failure, and it keeps the value that the user wrote in the field

## MODIFIED Requirements

### Requirement: The four actions of the maintenance

The tab Maintenance SHALL show four actions, each one with a name, a short description and a button:

| Action                     | Description                                                         |
|----------------------------|---------------------------------------------------------------------|
| Clear unused images        | Remove the images that no container uses                            |
| Clear unused volumes       | Remove the volumes that no container uses                           |
| Clear unused containers    | Remove the containers that stopped                                  |
| Remove orphaned containers | Stop by force and remove the containers of a service that went away |

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens `/server/maintenance`
- **THEN** the system shows the four actions with their descriptions

### Requirement: The panel of the health

The tab Health SHALL show a panel of the health, and that tab is the tab that `/server` opens.

The panel SHALL show one line per critical dependency, with the name of the dependency and its state. The state is `up` or `down`. The panel SHALL also show one aggregate mark, so the operator reads the health of the server without reading each line.

The aggregate mark says that the server is ready only when every dependency is `up`.

#### Scenario: Every dependency is available

- **WHEN** the user opens `/server`, and the API reports that every dependency is `up`
- **THEN** the panel shows one line per dependency with the state `up`, and the aggregate mark says that the server is ready

#### Scenario: One dependency is not available

- **WHEN** the API reports that one dependency is `down`
- **THEN** the panel shows the state of each dependency, and the aggregate mark says that the server is not ready

### Requirement: The panel reads one time

The tab Health SHALL read the health when it opens, and it SHALL NOT read it again on a timer.

While the two reads run, the panel SHALL show that the reading runs.

The operator sees the state of the moment when the tab opens. A panel that reads again on a timer holds a connection open for as long as the screen stays open, and this change does not add that.

#### Scenario: The user opens the screen

- **WHEN** the user opens `/server`
- **THEN** the screen reads the readiness and the state of the daemon one time, and it shows that the reading runs until the two answers arrive

#### Scenario: The screen stays open

- **WHEN** the screen stays open after the two answers arrived
- **THEN** the screen makes no further call, and the panel keeps the values that it read

#### Scenario: The user comes back to the tab

- **WHEN** the user opens another tab and comes back to the tab Health
- **THEN** the screen reads the health again one time, and it shows that the reading runs
