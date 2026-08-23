## MODIFIED Requirements

### Requirement: The six tabs of the screen

The system SHALL show seven tabs, in this order: `general`, `provider`, `configuration`, `deployments`,
`containers`, `network` and `logs`.

The path holds the tab. A path that names no tab opens `general`. A path that names an unknown tab also
shows `general`.

When the user chooses a tab, the system SHALL open the path of that tab. Thus the address of the browser
always names the tab that the screen shows.

#### Scenario: The path names no tab

- **WHEN** the user opens the service without a tab in the path
- **THEN** the system opens the path of the tab `general`

#### Scenario: The path names an unknown tab

- **WHEN** the path holds a word that no tab carries
- **THEN** the system shows the tab `general`

#### Scenario: The user chooses a tab

- **WHEN** the user chooses a tab
- **THEN** the system opens the path of that tab, and the screen shows it

## ADDED Requirements

### Requirement: The tab "Configuration" manages the variables

The tab `configuration` SHALL list the variables of the service, and it SHALL give the actions that set, change
and remove one.

Each line holds the name, the mark that says if the value is a secret, and the value. For a secret the tab
SHALL show that a value is set, and it SHALL NOT show the value.

The tab SHALL state that a change takes effect at the next deployment, and that a variable reaches the
containers and not the build of an image. Both sentences prevent a reading of a delay or of a limit as a
defect.

#### Scenario: The service holds variables

- **WHEN** the user opens the tab, and the service holds variables
- **THEN** the tab lists each one with its name, and it shows the value of a plain variable

#### Scenario: A variable is a secret

- **WHEN** the tab shows a variable that is a secret
- **THEN** the line says that a value is set, and it shows no value

#### Scenario: The operator changes a secret and leaves the value empty

- **WHEN** the operator changes a secret, and leaves the field of the value empty
- **THEN** the system keeps the stored value

#### Scenario: The service holds no variable

- **WHEN** the service holds no variable
- **THEN** the tab shows an empty state, and an action that sets the first variable

#### Scenario: The name breaks the rule

- **WHEN** the operator sets a name that a shell cannot read
- **THEN** the tab says which rule the name breaks, and it sets no variable
