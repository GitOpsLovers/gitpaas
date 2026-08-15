## Purpose

This capability gives the screen that changes a provider, at the route `/providers/edit/:id`. The operator
corrects the name, the identifiers and the private key of a registered GitHub App here.

## ADDED Requirements

### Requirement: The load of the provider

The system SHALL read the provider of the path, and it SHALL put the name, the identifier of the application
and the identifier of the installation into the form.

The field of the private key SHALL stay empty, because the API never gives the key.

#### Scenario: The provider arrives

- **WHEN** the API answers with the provider
- **THEN** the system fills the three fields of text, and it leaves the field of the key empty

### Requirement: An empty key keeps the stored key

The help text of the field of the key SHALL state that an empty field keeps the stored key.

If the user leaves the field empty, the system SHALL send no key, and the API keeps the stored one. If the
user gives a key, the system SHALL send it, and the API replaces the stored one.

#### Scenario: The user leaves the key empty

- **WHEN** the user sends the form with an empty field of the key
- **THEN** the system sends the other fields only, and the stored key stays

#### Scenario: The user gives a new key

- **WHEN** the user writes a new PEM into the field of the key
- **THEN** the system sends the new key, and the API replaces the stored one

### Requirement: The end of the change

If the API accepts the change, the system SHALL show a message of success that names the provider, and it
SHALL open the list at `/providers`.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the
same screen.

#### Scenario: The change succeeds

- **WHEN** the API answers with the changed provider
- **THEN** the system shows the message "Provider updated" with the name, and it opens `/providers`

#### Scenario: The change fails

- **WHEN** the API refuses the change
- **THEN** the system shows a message of failure, and the user stays on the screen
