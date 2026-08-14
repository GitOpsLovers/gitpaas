## Purpose

This capability gives the screen that lists the providers of the source control, at the route `/providers`.
An operator registers a GitHub App here, and the services of the installation select it.

## ADDED Requirements

### Requirement: The four states of the screen

The system SHALL show one of four states:

1. **The reading runs.** The screen says "Loading providers…".
2. **The reading failed.** The screen shows a red panel that says "Could not load providers. Is the backend
   running?".
3. **The list holds providers.** The screen shows one card per provider, in a grid.
4. **The list is empty.** The screen shows a panel with a dotted border, and a button that opens the screen
   of the creation.

#### Scenario: The list is empty

- **WHEN** the API answers with an empty list
- **THEN** the screen shows the panel "No providers yet." with the button "Register your first provider"

#### Scenario: The reading fails

- **WHEN** the call of the API fails
- **THEN** the screen shows the red panel with the question about the backend

### Requirement: The content of a card

Each card SHALL show the name, a mark of the type, the identifier of the application, the fingerprint of the
key and the state of the connection.

The card SHALL NOT show the private key, because the API never gives it.

#### Scenario: The user reads a card

- **WHEN** the screen shows a provider
- **THEN** the card holds the name, the mark of the type, the identifier of the application and the
  fingerprint of the key, and it holds no private key

### Requirement: The test of the connection

Each card SHALL give an action that tests the credentials of the provider.

While the test runs, the card shows the state of the work. After the test, the card shows the result.

#### Scenario: The test succeeds

- **WHEN** the user tests a provider, and the API answers that the credentials operate
- **THEN** the card shows a state of success

#### Scenario: The test fails

- **WHEN** the API answers that the credentials do not operate
- **THEN** the card shows a state of failure

### Requirement: The removal of a provider

The system SHALL ask the user to confirm before it removes a provider.

The question carries the title "Delete provider?" and a message that names the provider between marks of
quotation, and that says that the action has no way back.

After a removal that succeeds, the system SHALL show a message of success, and it SHALL read the list
again.

#### Scenario: The removal succeeds

- **WHEN** the user confirms the removal, and the API answers `204`
- **THEN** the system shows the message "Provider deleted", and it reads the list again

#### Scenario: The provider still holds services

- **WHEN** the API refuses the removal, because a service still points at the provider
- **THEN** the system shows a message of failure that says that services still use the provider
