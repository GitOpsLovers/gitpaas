# profile

## Purpose

This capability lets a user read and change the own account: the display name, the email address and the password, and it turns a second factor with an authenticator app on and off. Every route acts on the user of the token alone, so no client reaches the account of another user through it.

## Read of the account

The system SHALL answer with the account of the user of the token at `GET /api/v1/profile`.

The answer carries the identifier, the email, the display name, the role, the state of the second factor, and the dates, in the same shape as the profile of `GET /api/v1/auth/me`. It never carries the hash of the password, and it never carries the secret of the second factor.

### Scenario: An authenticated user reads the account

- **WHEN** a client calls `GET /api/v1/profile` with a valid access token
- **THEN** the system answers `200` with the account of that user

## Change of the display name

The system SHALL change the display name of the account at `PATCH /api/v1/profile/name`, and it SHALL accept `null` to clear it.

A display name holds at most 80 characters, and it holds at least one character when it is not `null`.

### Scenario: The user sets a display name

- **WHEN** a client patches `/profile/name` with a display name of one to 80 characters
- **THEN** the system writes it, and it answers `200` with the updated account

### Scenario: The user clears the display name

- **WHEN** a client patches `/profile/name` with `null`
- **THEN** the system clears the display name, and the account falls back to the initials of the email address

## Change of the email address

The system SHALL change the email address of the account at `PATCH /api/v1/profile/email`, and it SHALL refuse an address that another user already holds.

Because the token carries the email, a change of the address makes the tokens that the account already holds stale. The system SHALL issue a fresh pair of tokens in the same answer, so the caller keeps a session.

### Scenario: The address is free

- **WHEN** a client patches `/profile/email` with an address that no other user holds
- **THEN** the system writes the address, and it answers `200` with a fresh pair of tokens

### Scenario: The address is taken

- **WHEN** a client patches `/profile/email` with an address that another user holds
- **THEN** the system answers `409 Conflict`, and it changes nothing

## Change of the password

The system SHALL change the password of the account at `PATCH /api/v1/profile/password`, and it SHALL first verify the current password.

A new password holds at least 8 characters. Because a stolen refresh token is a common way to keep a session after a compromise, the system SHALL revoke every refresh token of the account, and it SHALL issue a fresh pair in the same answer, so the caller alone keeps a session.

### Scenario: The current password matches

- **WHEN** a client patches `/profile/password` with the current password and a new password of 8 characters or more
- **THEN** the system writes the new hash, it revokes every refresh token of the account, and it answers `200` with a fresh pair of tokens

### Scenario: The current password does not match

- **WHEN** a client patches `/profile/password` with a wrong current password
- **THEN** the system answers `401 Unauthorized`, and it changes nothing

## The second factor with an authenticator app

The system SHALL let a user protect the account with a second factor: a code of six digits that an authenticator app produces from a shared secret. See the capability `auth` for the two steps of the login that the second factor adds.

The system SHALL keep the secret sealed at rest, and it SHALL never give the sealed value, or the open value, to a client once the second factor is on.

### Scenario: The account holds a second factor

- **WHEN** the account carries a date under `totpEnabledAt`
- **THEN** every answer that names the account shows `totpEnabled: true`, and the login of that account takes two steps

## Setup of the second factor

The system SHALL draw a fresh secret and seal it at `POST /api/v1/profile/2fa/setup`, and it SHALL answer with the secret in text, the address `otpauth://` and the image of its QR code, ready for an authenticator app to scan.

The setup alone SHALL NOT turn the second factor on. The system SHALL turn it on only when the confirmation of the setup follows with a matching code.

### Scenario: The user starts a setup

- **WHEN** a client posts `/profile/2fa/setup`
- **THEN** the system seals a fresh secret against the account, and it answers `200` with the secret, the address and the image of the QR code

## Confirmation of the setup

The system SHALL turn the second factor on at `POST /api/v1/profile/2fa/enable`, when the body carries a code of six digits that matches the secret that the setup drew.

### Scenario: The code matches

- **WHEN** a client posts `/profile/2fa/enable` with the code that the authenticator app shows for the sealed secret
- **THEN** the system writes the date of the confirmation, and it answers `200` with the updated account

### Scenario: The code does not match

- **WHEN** a client posts `/profile/2fa/enable` with a code that does not match the secret
- **THEN** the system answers `401 Unauthorized`, and the second factor stays off

### Scenario: No setup ran first

- **WHEN** a client posts `/profile/2fa/enable`, and no setup drew a secret for the account
- **THEN** the system answers `409 Conflict`

### Scenario: The second factor is already on

- **WHEN** a client posts `/profile/2fa/setup` or `/profile/2fa/enable`, and the account already holds a second factor
- **THEN** the system answers `409 Conflict`, and it changes nothing

## Turn of the second factor off

The system SHALL turn the second factor off for the user of the token at `DELETE /api/v1/profile/2fa`.

The system SHALL also let an administrator turn the second factor off for another user, at `DELETE /api/v1/users/:id/2fa`, so an administrator can restore the access of a user who lost the device of the authenticator app. Only the role `admin` reaches that route.

### Scenario: A user turns the own second factor off

- **WHEN** a client deletes `/profile/2fa`
- **THEN** the system clears the secret and the date of the confirmation, and it answers `200` with the updated account

### Scenario: An administrator restores the access of another user

- **WHEN** an administrator deletes `/users/:id/2fa`
- **THEN** the system clears the secret and the date of the confirmation of that user, and it answers `204 No Content`

### Scenario: A user without the role admin calls the route of another user

- **WHEN** a user with the role `user` deletes `/users/:id/2fa`
- **THEN** the system answers `403 Forbidden`

## The page of the profile

The system SHALL give a screen at `/profile`, inside the shell, where a signed-in user reads and changes the own account.

The screen SHALL show the avatar, the display name, the email address, the role and the date of creation of the account, and it SHALL show the three forms of the name, the email address and the password, and the panel of the second factor. The avatar shows the initials of the display name, or, when the account carries none, the initials of the email address; it shows no uploaded image.

Each form and the panel of the second factor carry their own state of loading and their own message of error, so a failure of one never blocks the others.

### Scenario: A user opens the page of the profile

- **WHEN** a signed-in user opens `/profile`
- **THEN** the system shows the account with the avatar, the display name, the email address, the role and the date of creation, and the three forms, and the panel of the second factor

### Scenario: A change of the email address or of the password succeeds

- **WHEN** the API answers a change of the email address or of the password with a fresh pair of tokens
- **THEN** the system keeps that pair in place of the pair the session held, so the browser stays signed in with the new credentials

See the capability `frontend-shell` for the way the header shows this account.
