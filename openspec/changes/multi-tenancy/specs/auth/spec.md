## MODIFIED Requirements

### Requirement: The role is not enforced

Each user carries the role `admin` or the role `user`, and the system SHALL enforce that role.

A user with the role `user` sees and manages the resources that they own, and nothing else. A user with the
role `admin` sees and manages everything, and only an administrator manages the users and the providers.

The token carries the role. A guard reads it on every endpoint that a requirement names as restricted.

#### Scenario: A user with the role `user` calls any endpoint

- **WHEN** an active user with the role `user` calls a protected endpoint that no requirement restricts
- **THEN** the system runs the endpoint, limited to the resources that the user owns

#### Scenario: A user with the role `user` writes a provider

- **WHEN** an active user with the role `user` creates, changes or removes a provider
- **THEN** the system answers `403 Forbidden`

#### Scenario: A user with the role `admin` writes a provider

- **WHEN** an active user with the role `admin` creates, changes or removes a provider
- **THEN** the system runs the endpoint

#### Scenario: A user with the role `user` manages the users

- **WHEN** an active user with the role `user` creates, changes or deactivates a user
- **THEN** the system answers `403 Forbidden`

#### Scenario: An administrator reads a resource of another user

- **WHEN** an active user with the role `admin` reads a resource that another user owns
- **THEN** the system gives that resource, because an administrator passes every limit of the ownership
