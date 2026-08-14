# web-session Specification

## Purpose

This capability holds the session of the browser. It keeps the token pair, it protects the routes, it adds
the token to each call of the API, and it renews the token when the API refuses a call. Every screen of the
application depends on it.

The rules of the token itself belong to the backend. See the capability `auth`.

## Requirements

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
