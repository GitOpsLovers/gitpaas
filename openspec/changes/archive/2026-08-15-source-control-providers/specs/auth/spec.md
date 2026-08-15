## MODIFIED Requirements

### Requirement: The role is not enforced

Each user carries the role `admin` or the role `user`.

The system SHALL restrict by the role only the write routes of the provider records, which the capability
`source-control` holds. Every other endpoint stays open to each authenticated user, whatever the role.

The token carries the role. A guard reads it for those routes, and a later change can extend that guard to
other routes.

#### Scenario: A user with the role `user` calls any endpoint

- **WHEN** an active user with the role `user` calls a protected endpoint that is no write route of the
  providers
- **THEN** the system runs the endpoint, and it applies no restriction of the role

#### Scenario: A user with the role `user` writes a provider

- **WHEN** an active user with the role `user` creates, changes or removes a provider
- **THEN** the system answers `403 Forbidden`

#### Scenario: A user with the role `admin` writes a provider

- **WHEN** an active user with the role `admin` creates, changes or removes a provider
- **THEN** the system runs the endpoint
