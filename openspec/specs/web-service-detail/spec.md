# web-service-detail Specification

## Purpose

This capability gives the screen of one service, at the route
`/namespaces/:namespaceId/projects/:id/services/:serviceId/:tab`. It is the screen where the operator
configures the source of the service, starts a deployment, and reads the output of a run.

## Requirements

### Requirement: The six tabs of the screen

The system SHALL show six tabs, in this order: `general`, `provider`, `deployments`, `containers`,
`network` and `logs`.

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

### Requirement: The tab "General" starts a deployment

The tab `general` SHALL give one action: start a deployment of the service.

When the user starts a deployment, the system SHALL open the tab `deployments` immediately, before the
answer of the API arrives. Thus the user sees the history while the new deployment starts.

The system SHALL block the action while the call runs.

#### Scenario: The deployment starts

- **WHEN** the user starts a deployment, and the API accepts it
- **THEN** the system opens the tab `deployments`, it reads the history again, and it shows the message
  "Deployment started"

#### Scenario: The deployment cannot start

- **WHEN** the API refuses the deployment, for example because the service is not deployable
- **THEN** the system shows the message "Could not start deployment", and the screen stays on the tab
  `deployments`

### Requirement: The tab "Provider" configures the source

The tab `provider` SHALL give a form with four controls, in this order:

| Control | Kind |
|---|---|
| The provider | A list of the registered providers |
| The repository | A list of the repositories that the chosen provider can reach |
| The branch | A list of the branches of the chosen repository |
| The path of the compose file | A field of text |

The system SHALL show `docker-compose.yml` as the path if the service holds no path.

The system SHALL keep the control of the repository blocked until the user chooses a provider, because a
repository has no meaning without an account.

When the user changes the provider, the system SHALL clear the repository and the branch. A repository
identifier is global at GitHub, and the access to it is not. Thus a pair that stays behind would name a
repository that the new provider cannot reach.

When the user changes the repository, the system SHALL clear the branch, because a branch of the old
repository does not exist in the new one.

If no provider exists, the system SHALL show an empty state with a link to `/providers/add`, in place
of the form.

The system SHALL send the name of the service together with the four values, because the API asks for the
name in every change.

#### Scenario: The user chooses a provider

- **WHEN** the user chooses a provider
- **THEN** the system reads the repositories of that provider, it opens the control of the repository, and
  it clears the repository and the branch of the form

#### Scenario: The user chooses a repository

- **WHEN** the user chooses a repository
- **THEN** the system reads the branches of that repository, and it clears the branch of the form

#### Scenario: No provider exists

- **WHEN** the installation holds no provider
- **THEN** the tab shows an empty state with a link to `/providers/add`, and it shows no form

#### Scenario: The change succeeds

- **WHEN** the API accepts the four values
- **THEN** the system writes the answer into the screen, and it shows the message "Provider settings saved"

#### Scenario: The change fails

- **WHEN** the API refuses the change
- **THEN** the system shows the message "Could not save provider settings", and the form keeps the values

### Requirement: The tab "Deployments" shows the history

The tab `deployments` SHALL show one entry per deployment, the newest first.

Each entry holds the status, the first line of the message of the commit, the short form of the SHA, the
branch, the date of the creation and the length of the run. An entry of a deployment that failed also holds
the message of the error.

Each entry gives two actions: view the output, and remove the record.

While the reading runs and the list is empty, the tab says "Loading deployments…". If the reading ends and
the list is empty, the tab says "No deployments yet.".

#### Scenario: The user removes a deployment

- **WHEN** the user removes a deployment, and the API answers `204`
- **THEN** the system reads the history again, and it shows the message "Deployment deleted"

#### Scenario: The removal fails

- **WHEN** the call of the removal fails
- **THEN** the system shows the message "Could not delete deployment"

#### Scenario: The service holds no deployment

- **WHEN** the reading ends, and the service holds no deployment
- **THEN** the tab says "No deployments yet."

### Requirement: The window of the output of a deployment

When the user views a deployment, the system SHALL open a window that streams the output of that
deployment.

The window SHALL open the stream only while it is open and a deployment is chosen. It SHALL close the
stream when the user closes the window.

The window holds a mark of the status. The mark says `running` until the terminal event arrives, and then
it says `success` or `failed`.

The window SHALL keep the view at the last line as the output arrives. The window gives an action that
copies the full output.

#### Scenario: The user opens the output

- **WHEN** the user views a deployment
- **THEN** the system opens the window, it clears the old lines, and it streams the output from the first
  line

#### Scenario: The terminal event arrives

- **WHEN** the stream sends the terminal event
- **THEN** the mark of the status shows `success` or `failed`, and the stream ends

#### Scenario: The user closes the window

- **WHEN** the user closes the window
- **THEN** the system ends the stream

#### Scenario: The copy fails

- **WHEN** the browser refuses the access to the clipboard
- **THEN** the system shows no message of failure, and the window continues to work

### Requirement: The tabs "Containers" and "Network"

The tab `containers` SHALL show the containers of the service. The tab `network` SHALL show the networks of
the service.

Each tab shows its own state of the reading.

#### Scenario: The user opens the tab of the containers

- **WHEN** the user opens the tab `containers`
- **THEN** the system shows the containers of the service, or the state of the reading

### Requirement: The tab "Logs" holds no true output

The tab `logs` SHALL show a fixed set of eight lines of an example. It reads no data of the API.

The output of a run lives in the window of the tab `deployments`. This tab is the rest of a first design of
the theme.

This requirement records the state of today. A later change must replace it.

#### Scenario: The user opens the tab of the logs

- **WHEN** the user opens the tab `logs`
- **THEN** the system shows the same eight lines of the example for every service, and it calls no endpoint
