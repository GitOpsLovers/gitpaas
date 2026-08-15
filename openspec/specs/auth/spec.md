# auth Specification

## Purpose

This capability authenticates the operators of the platform. It protects every endpoint of the API, it
issues the access token and the refresh token, it rotates the refresh token, and it revokes the refresh
token at logout. It also gives the screen where an operator signs in, the one public screen of the
application, at the route `/signin`, and it holds the session of the browser: it keeps the token pair, it
protects the routes, it adds the token to each call of the API, and it renews the token when the API
refuses a call. Every screen of the application depends on it.

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

### Requirement: The fields of the screen

The system SHALL show a form with three controls:

| Control | Kind | Obligatory |
|---|---|---|
| Email | A field of the kind `email` | Yes |
| Password | A field that hides the text | Yes |
| Keep me logged in | A box to mark | No |

The system SHALL mark the two obligatory fields with a star.

The system SHALL give a control that shows the password as plain text, and that hides it again. The control
carries a name for the reader of the screen that says which action follows.

#### Scenario: The user asks to see the password

- **WHEN** the user chooses the control of the password
- **THEN** the system shows the password as plain text, and the control now offers to hide it

### Requirement: The check before the call

The system SHALL remove the empty places at the two ends of the email before it uses the value.

If the email is empty after that, or if the password is empty, the system SHALL show a message that says
"Missing credentials", and it SHALL make no call of the API.

#### Scenario: A field is empty

- **WHEN** the user sends the form with an empty email, or with an empty password
- **THEN** the system shows the message "Missing credentials", and it calls no endpoint

### Requirement: The state of the sending

The system SHALL block a second sending while a first sending runs.

While the sending runs, the button carries the text "Signing in…", and the user cannot choose it. At other
times the button carries the text "Sign in".

#### Scenario: The user sends the form twice

- **WHEN** the user sends the form again while the first call runs
- **THEN** the system does nothing, and it makes no second call

### Requirement: The end of the sign-in

If the API accepts the credentials, the system SHALL keep the token pair and open `/dashboard`. The choice
of the storage follows the box "Keep me logged in". See the requirement *The place of the token pair*.

If the API refuses the credentials, the system SHALL show a message that says "Sign in failed", with the
text "Invalid credentials or inactive account.". The system SHALL let the user try again, and it SHALL keep
the two values in the form.

The message is the same for a wrong password and for an account that is not active, because the message of
the API does not separate the two.

#### Scenario: The credentials are correct

- **WHEN** the API accepts the credentials
- **THEN** the system keeps the token pair, and it opens `/dashboard`

#### Scenario: The credentials are not correct

- **WHEN** the API refuses the credentials
- **THEN** the system shows the message "Sign in failed", and the user can send the form again

#### Scenario: The API does not answer

- **WHEN** the call fails because the backend does not answer
- **THEN** the system shows the same message, and the user can send the form again

### Requirement: The place of the token pair

The system SHALL keep the token pair in the storage of the browser, under the keys
`gitpaas.accessToken` and `gitpaas.refreshToken`.

The system SHALL choose the storage by the answer of the user to "Keep me logged in":

- The user marks the box: the system uses `localStorage`, so the session stays after the browser closes.
- The user leaves the box empty: the system uses `sessionStorage`, so the session goes away with the tab.

At the start of the application, the system SHALL look in `localStorage` first, and then in
`sessionStorage`. Thus a page that loads again keeps the same storage.

#### Scenario: The user marks the box

- **WHEN** the user signs in with the box marked
- **THEN** the system writes the two tokens into `localStorage`, and the session stays after the browser
  closes

#### Scenario: The user leaves the box empty

- **WHEN** the user signs in with the box empty
- **THEN** the system writes the two tokens into `sessionStorage`, and the session goes away when the tab
  closes

#### Scenario: The user loads the page again

- **WHEN** the user loads the application again, and a storage holds a token pair
- **THEN** the system reads that pair, and the user stays signed in

### Requirement: The protection of the routes

The system SHALL let a user open a route of the application shell only if a token pair is available. If no
token is available, the system SHALL send the user to `/signin`.

The system SHALL let a user open `/signin` only if no token is available. If a token is available, the
system SHALL send the user to `/dashboard`.

The guard examines only the presence of the token. It examines no expiry, because the API answers that
question.

#### Scenario: A signed-out user opens a protected route

- **WHEN** a user with no token opens `/namespaces`
- **THEN** the system sends the user to `/signin`

#### Scenario: A signed-in user opens the sign-in route

- **WHEN** a user with a token opens `/signin`
- **THEN** the system sends the user to `/dashboard`

#### Scenario: A user opens an unknown route

- **WHEN** a user opens a path that no route declares
- **THEN** the system sends the user to `/dashboard`

### Requirement: The token on each call of the API

The system SHALL add the header `Authorization: Bearer <accessToken>` to each call of the API.

The system SHALL NOT add the header to a call that goes to another host, and it SHALL NOT add the header to
a call of the public endpoints of the authentication (`/auth/login`, `/auth/refresh`, `/auth/logout`).

#### Scenario: A call of a protected endpoint

- **WHEN** the application calls an endpoint of the API, and a token is available
- **THEN** the call carries the header of the authorization

#### Scenario: A call of a public endpoint of the authentication

- **WHEN** the application calls the login, the refresh or the logout
- **THEN** the call carries no header of the authorization

### Requirement: The renewal after a refusal

The system SHALL renew the token pair one time if a call of a protected endpoint receives the answer `401`.

The steps are these:

1. If no refresh token is available, the system clears the storage, and it sends the user to `/signin`.
2. The system calls the refresh of the API with the refresh token.
3. If the refresh succeeds, the system writes the new pair, and it repeats the first call with the new
   token. The user sees no interruption.
4. If the refresh fails, the system clears the storage, and it sends the user to `/signin`.

The system SHALL make one attempt only. A second `401` gives the error to the caller.

#### Scenario: The renewal succeeds

- **WHEN** a call receives the answer `401`, and the refresh gives a new pair
- **THEN** the system writes the new pair, it repeats the call, and the user sees the answer of the call

#### Scenario: The renewal fails

- **WHEN** a call receives the answer `401`, and the refresh also fails
- **THEN** the system clears the storage, and it sends the user to `/signin`

#### Scenario: No refresh token is available

- **WHEN** a call receives the answer `401`, and the storage holds no refresh token
- **THEN** the system clears the storage, and it sends the user to `/signin`

### Requirement: The end of the session

The system SHALL revoke the refresh token at the API, it SHALL clear the storage, and it SHALL send the
user to `/signin`.

The system SHALL clear the storage and send the user away even if the call of the API fails. Thus a
backend that does not answer never holds the user inside the application.

#### Scenario: The user signs out

- **WHEN** the user chooses to sign out
- **THEN** the system calls the logout of the API, it clears the two storages, and it opens `/signin`

#### Scenario: The call of the logout fails

- **WHEN** the call of the logout fails
- **THEN** the system clears the two storages, and it opens `/signin`
