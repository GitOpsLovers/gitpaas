# web-namespace-edit Specification

## Purpose

This capability gives the screen that changes the name of a namespace, at the route
`/namespaces/edit/:id`.

## Requirements

### Requirement: The load of the namespace

The system SHALL read the namespace of the path, and it SHALL put the name into the field.

The system SHALL take the identifier one time, when the screen opens.

#### Scenario: The namespace arrives

- **WHEN** the API answers with the namespace
- **THEN** the system puts the name of that namespace into the field

#### Scenario: The reading still runs

- **WHEN** the user opens the screen, and the call of the API still runs
- **THEN** the field stays empty until the name arrives

### Requirement: The check before the call

The system SHALL remove the empty places at the two ends of the name. If the name is empty after that, the
system SHALL do nothing.

#### Scenario: The name is empty

- **WHEN** the user sends the form with an empty name
- **THEN** the system does nothing, and the user stays on the screen

### Requirement: The end of the change

If the API accepts the change, the system SHALL show a message of success that names the namespace, and it
SHALL open the list at `/namespaces`.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the
same screen.

#### Scenario: The change succeeds

- **WHEN** the API answers with the changed namespace
- **THEN** the system shows the message "Namespace updated" with the name, and it opens `/namespaces`

#### Scenario: The change fails

- **WHEN** the API refuses the change
- **THEN** the system shows the message "Could not update namespace", and the user stays on the screen
