## Purpose

This capability gives the screen that registers a provider, at the route `/providers/add`. A provider is a
GitHub App that the services of the installation use to reach their repositories.

## ADDED Requirements

### Requirement: The fields of the form

The system SHALL show a form with four controls:

| Control | Kind | Obligatory |
|---|---|---|
| The name | A field of text | Yes |
| The identifier of the application | A field of text | Yes |
| The identifier of the installation | A field of text | Yes |
| The private key | A field of several lines, for the PEM | Yes |

The type of the provider is `github_app`, and the form does not ask for it, because it is the one kind of
today.

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens `/providers/add`
- **THEN** the system shows the four empty controls

### Requirement: The check before the call

The system SHALL remove the empty places at the two ends of each field of text.

If one obligatory field is empty after that, the system SHALL do nothing. It sends no call.

#### Scenario: A field is empty

- **WHEN** the user sends the form, and one of the four fields is empty
- **THEN** the system does nothing, and the user stays on the screen

### Requirement: The end of the registration

If the API accepts the provider, the system SHALL show a message of success that names it, and it SHALL open
the list at `/providers`.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the
same screen. The form SHALL keep the values that the user gave, including the PEM.

#### Scenario: The registration succeeds

- **WHEN** the API answers with the new provider
- **THEN** the system shows the message "Provider created" with the name, and it opens `/providers`

#### Scenario: The name is already in use

- **WHEN** the API refuses the creation, because another provider carries that name
- **THEN** the system shows a message of failure, and the user stays on the screen with the values in the
  form

#### Scenario: The user has no role of administrator

- **WHEN** the API answers `403 Forbidden`, because the user carries the role `user`
- **THEN** the system shows a message that says that the action needs an administrator
