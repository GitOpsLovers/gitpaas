## MODIFIED Requirements

### Requirement: The six tabs of the screen

The system SHALL show seven tabs, in this order: `general`, `provider`, `domains`, `deployments`,
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

### Requirement: The tab "Domains" manages the public addresses

The tab `domains` SHALL list the domains of the service, and it SHALL give an action that claims a domain
and an action that removes one.

Each line holds the name of the domain, the state of its certificate, and the reason when that state is
`failed`.

The tab SHALL say that a domain that the operator just claimed answers after the next deployment of the
service. Without that sentence, an operator reads the delay as a defect.

#### Scenario: The service holds domains

- **WHEN** the user opens the tab, and the service holds domains
- **THEN** the tab lists each domain with the state of its certificate

#### Scenario: The service holds no domain

- **WHEN** the service holds no domain
- **THEN** the tab shows an empty state, and an action that claims the first domain

#### Scenario: The operator claims a domain

- **WHEN** the operator claims a domain that no service holds
- **THEN** the tab adds the line, and it says that the domain answers after the next deployment

#### Scenario: Another service holds the domain

- **WHEN** the operator claims a domain that another service holds
- **THEN** the tab says that the domain is already in use, and it adds no line

#### Scenario: The certificate failed

- **WHEN** the state of a domain is `failed`
- **THEN** the line shows the reason, so the operator can correct the DNS
