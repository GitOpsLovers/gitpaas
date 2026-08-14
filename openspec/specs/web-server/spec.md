# web-server Specification

## Purpose

This capability gives the screen of the maintenance of the server, at the route `/server`. The operator
uses it to give back the space of the disk, and to remove the containers that no service needs.

The operations themselves belong to the backend. See the capability `server`.

## Requirements

### Requirement: The four actions of the maintenance

The system SHALL show four actions, each one with a name, a short description and a button:

| Action | Description |
|---|---|
| Clear unused images | Remove the images that no container uses |
| Clear unused volumes | Remove the volumes that no container uses |
| Clear unused containers | Remove the containers that stopped |
| Remove orphaned containers | Stop by force and remove the containers of a service that went away |

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens `/server`
- **THEN** the system shows the four actions with their descriptions

### Requirement: The question before an action

The system SHALL ask the user to confirm before it runs any of the four actions.

The question carries the name of the action, and a message that says what goes away and that the action has
no way back. The user can confirm or cancel.

#### Scenario: The user chooses an action

- **WHEN** the user chooses the button of one action
- **THEN** the system opens the question with the name and the message of that action, and it calls no
  endpoint

#### Scenario: The user cancels

- **WHEN** the user cancels the question
- **THEN** the system closes the question, and it calls no endpoint

### Requirement: One action at a time

The system SHALL block the buttons of the four actions while an action runs. The question shows the state of
the work.

#### Scenario: An action runs

- **WHEN** the user confirms an action, and the call runs
- **THEN** the system blocks the four buttons until the call ends

### Requirement: The report of the result

The system SHALL show a message with the result of the action.

For the three removals of the unused resources:

- The action removed nothing: "No unused &lt;resource&gt; to remove."
- The action removed something: the count and the space of the disk that it gives back, in a compact form
  such as "1.5 MB".

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

### Requirement: The screen shows no state of the server

The system SHALL NOT show the readiness of the server, and it SHALL NOT show the information of the Docker
daemon. The backend gives both, but this screen reads neither.

This requirement records the state of today.

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens `/server`
- **THEN** the system shows only the four actions, and it calls neither the readiness nor the state of the
  daemon
