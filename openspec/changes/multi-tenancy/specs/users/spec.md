## MODIFIED Requirements

### Requirement: No endpoint creates a user

The system SHALL give endpoints that create, change and deactivate a user, and only a user with the role
`admin` may call them.

There is still no public sign-up. A user cannot make an account, and an administrator makes it for them.

#### Scenario: A client looks for an endpoint of the users

- **WHEN** an authenticated client calls a path under `/api/v1/users`
- **THEN** the system runs the endpoint, if the role of the caller allows it

#### Scenario: An administrator creates a user

- **WHEN** a user with the role `admin` creates a user with an email, a password and a role
- **THEN** the system writes the record, and it answers `201` with the profile of the new user

#### Scenario: A user without the role creates a user

- **WHEN** a user with the role `user` calls any write endpoint of the users
- **THEN** the system answers `403 Forbidden`

#### Scenario: A client without a token creates a user

- **WHEN** a client with no access token calls any endpoint of the users
- **THEN** the system answers `401 Unauthorized`, because there is no public sign-up

## ADDED Requirements

### Requirement: The management of a user

The system SHALL let an administrator change the role of a user, and deactivate a user.

A user that an administrator deactivates loses the access at the next request, because the system loads the
user again on every request. See the capability `auth`.

The system SHALL NOT let an administrator remove a user, because the resources of that user would lose their
owner. Deactivation is the operation that ends an access.

#### Scenario: An administrator deactivates a user

- **WHEN** an administrator sets the state of a user to not active
- **THEN** the user loses the access at their next request, and the resources of that user stay

#### Scenario: An administrator changes a role

- **WHEN** an administrator gives the role `admin` to a user
- **THEN** that user sees every resource of the installation at their next request

#### Scenario: An administrator deactivates themselves

- **WHEN** an administrator sets their own state to not active
- **THEN** the system refuses the operation, so an installation never loses its last administrator

### Requirement: The list of the users

The system SHALL answer with the users of the installation, and only to a user with the role `admin`.

The list SHALL never carry the hash of a password.

#### Scenario: An administrator reads the list

- **WHEN** an administrator reads the list of the users
- **THEN** the system answers `200` with the identifier, the email, the role, the state and the dates of
  each user, and with no hash of a password

#### Scenario: A user without the role reads the list

- **WHEN** a user with the role `user` reads the list of the users
- **THEN** the system answers `403 Forbidden`
