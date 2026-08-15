# auth Specification

## Purpose

This capability authenticates the operators of the platform. It protects every endpoint of the API, it
issues the access token and the refresh token, it rotates the refresh token, and it revokes the refresh
token at logout.

## Requirements

### Requirement: Private API

The system SHALL reject every request that carries no valid access token, except for the endpoints that
the system marks as public.

The public endpoints are the login, the token refresh, the logout and the readiness probe. There is no
public sign-up, because the API has no endpoint that creates a user.

#### Scenario: A request carries no token

- **WHEN** a client calls a protected endpoint without an access token
- **THEN** the system answers `401 Unauthorized`

#### Scenario: A request carries a valid token

- **WHEN** a client calls a protected endpoint with a valid access token of an active user
- **THEN** the system runs the endpoint, and it attaches the user to the request

#### Scenario: A client calls a public endpoint

- **WHEN** a client calls the login, the refresh, the logout or the readiness probe without a token
- **THEN** the system runs the endpoint

### Requirement: Login with an email and a password

The system SHALL accept an email and a password at `POST /api/v1/auth/login`, and it SHALL answer with an
access token and a refresh token when the credentials are correct.

The system SHALL compare the password against an argon2 hash. The system SHALL answer `200 OK`.

#### Scenario: The credentials are correct

- **WHEN** an active user posts a known email and the matching password
- **THEN** the system answers `200` with an `accessToken` and a `refreshToken`

#### Scenario: The email is unknown

- **WHEN** a client posts an email that no user has
- **THEN** the system raises `INVALID_CREDENTIALS`, and it answers `401 Unauthorized`

#### Scenario: The password does not match

- **WHEN** a client posts a known email and a wrong password
- **THEN** the system raises `INVALID_CREDENTIALS`, and it answers `401 Unauthorized`

#### Scenario: The account is deactivated

- **WHEN** a client posts the correct credentials of a user whose `isActive` is false
- **THEN** the system raises `USER_INACTIVE`, and it answers `401 Unauthorized`

#### Scenario: The body is incomplete

- **WHEN** a client posts a body without an email, or with a value that is no email address
- **THEN** the system answers `400 Bad Request`

### Requirement: Rate limit of the login

The system SHALL accept a maximum of 5 login attempts in 60 seconds from one client. This limit makes a
brute-force attack slower.

#### Scenario: The client exceeds the limit

- **WHEN** a client sends a sixth login request inside the same window of 60 seconds
- **THEN** the system answers `429 Too Many Requests`, and it runs no credential check

### Requirement: Issue of the token pair

The system SHALL issue an access token with a short life and a refresh token with a longer life. Each
token carries the identifier, the email and the role of the user.

The system SHALL store the refresh token as a hash, together with its identifier (`jti`) and its expiry.
The system SHALL never store the refresh token itself.

#### Scenario: A login issues a pair

- **WHEN** the system completes a login
- **THEN** the system signs both tokens, and it writes one refresh-token record that holds the hash, the
  `jti` and the expiry

### Requirement: Check of the user on every request

The system SHALL read the subject of the access token on every protected request, and it SHALL load the
user again. A token alone gives no access.

Thus an administrator who deactivates a user removes the access of that user immediately, and not at the
expiry of the token.

#### Scenario: The user was deactivated after the issue of the token

- **WHEN** a client calls a protected endpoint with a token of a user whose `isActive` became false
- **THEN** the system raises `USER_INACTIVE`, and it answers `401 Unauthorized`

#### Scenario: The user was deleted after the issue of the token

- **WHEN** a client calls a protected endpoint with a token whose subject matches no user
- **THEN** the system raises `INVALID_CREDENTIALS`, and it answers `401 Unauthorized`

### Requirement: Refresh with rotation

The system SHALL exchange a valid refresh token for a new pair at `POST /api/v1/auth/refresh`, and it
SHALL revoke the presented token in the same operation.

A token that a client sends again after a rotation, after a revocation or after the expiry gives no new
pair. Thus a stolen token that is sent again does not operate.

#### Scenario: The refresh token is valid

- **WHEN** a client posts a refresh token that the system knows, that no operation revoked and that did
  not expire, and the owner is active
- **THEN** the system revokes the presented token, and it answers `200` with a new pair

#### Scenario: The refresh token was used before

- **WHEN** a client posts a refresh token that an earlier refresh already revoked
- **THEN** the system raises `INVALID_REFRESH_TOKEN`, and it answers `401 Unauthorized`

#### Scenario: The refresh token expired

- **WHEN** a client posts a refresh token whose expiry passed
- **THEN** the system raises `INVALID_REFRESH_TOKEN`, and it answers `401 Unauthorized`

#### Scenario: The refresh token has a wrong signature

- **WHEN** a client posts a refresh token that the system cannot verify
- **THEN** the system raises `INVALID_REFRESH_TOKEN`, and it answers `401 Unauthorized`

#### Scenario: The stored hash does not agree

- **WHEN** a client posts a refresh token whose hash differs from the stored hash of that `jti`
- **THEN** the system raises `INVALID_REFRESH_TOKEN`, and it answers `401 Unauthorized`

#### Scenario: The owner is deactivated

- **WHEN** a client posts a valid refresh token of a user whose `isActive` is false
- **THEN** the system raises `USER_INACTIVE`, and it answers `401 Unauthorized`

### Requirement: Logout

The system SHALL revoke a refresh token at `POST /api/v1/auth/logout`, and it SHALL answer `204 No Content`.

The operation is idempotent. The system SHALL answer `204` for a token that it does not know, for a token
that it cannot verify and for a token that an earlier operation revoked. Thus the endpoint gives no
information about the validity of a token.

#### Scenario: The token is valid

- **WHEN** a client posts a refresh token that the system knows and that no operation revoked
- **THEN** the system revokes the token, and it answers `204`

#### Scenario: The token is unknown or already revoked

- **WHEN** a client posts a refresh token that the system does not know, or that an earlier operation
  revoked
- **THEN** the system answers `204`, and it changes no record

### Requirement: Profile of the current user

The system SHALL answer with the profile of the authenticated user at `GET /api/v1/auth/me`.

The profile SHALL never hold the hash of the password.

#### Scenario: An authenticated client asks for the profile

- **WHEN** a client calls `GET /api/v1/auth/me` with a valid access token
- **THEN** the system answers `200` with the identifier, the email, the role, the state and the dates of
  the user, and without the field `passwordHash`

### Requirement: The role is not enforced

Each user carries the role `admin` or the role `user`.

The system SHALL restrict by the role only the write routes of the provider records, which the capability
`providers` holds. Every other endpoint stays open to each authenticated user, whatever the role.

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
