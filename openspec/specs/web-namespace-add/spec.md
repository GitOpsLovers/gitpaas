# web-namespace-add Specification

## Purpose

This capability gives the screen that creates a namespace, at the route `/namespaces/add`.

## Requirements

### Requirement: The field of the form

The system SHALL show a form with one field: the name of the namespace. The form also gives a control that
goes back to the list without a change.

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens `/namespaces/add`
- **THEN** the system shows an empty field for the name

### Requirement: The check before the call

The system SHALL remove the empty places at the two ends of the name.

If the name is empty after that, the system SHALL do nothing. It sends no call, and it shows no message.

#### Scenario: The name is empty

- **WHEN** the user sends the form with an empty name, or with only empty places
- **THEN** the system does nothing, and the user stays on the screen

### Requirement: The end of the creation

If the API accepts the name, the system SHALL show a message of success that names the new namespace, and
it SHALL open the list at `/namespaces`.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the
same screen, with the name that the user gave.

The button carries the state of the sending, so the user cannot send the form twice.

#### Scenario: The creation succeeds

- **WHEN** the API answers with the new namespace
- **THEN** the system shows the message "Namespace created" with the name, and it opens `/namespaces`

#### Scenario: The creation fails

- **WHEN** the API refuses the creation, for example because the name is already in use
- **THEN** the system shows the message "Could not create namespace", and the user stays on the screen with
  the name in the field
