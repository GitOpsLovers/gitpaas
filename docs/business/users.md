# users

## Purpose

This capability holds the operators of the platform. It keeps the record of each user, it stores the password only as a hash, and it puts one administrative user into a development database.

## The user record

The system SHALL keep one record per user. The record holds the identifier, the email, the hash of the password, the role, the state, the date of the creation and the date of the last change.

The role is `admin` or `user`. The state `isActive` says if the user can authenticate. A new user is active if no caller gives another value.

### Scenario: The system reads a user

- **WHEN** the system loads a user by the identifier or by the email
- **THEN** the system gives the record with all these fields, or `null` if no user matches

## The password is stored only as a hash

The system SHALL hash each password with argon2id before it writes the record. The system SHALL NOT store the password itself, and it SHALL NOT give the hash to any client.

### Scenario: The system creates a user

- **WHEN** a caller creates a user with a password
- **THEN** the system writes the argon2id hash into the field `passwordHash`, and it writes no other copy of the password

## No endpoint creates a user

The system SHALL give no HTTP endpoint that creates, changes or removes a user. There is no public sign-up.

An administrator makes a user with a different tool, directly in the database.

### Scenario: A client looks for an endpoint of the users

- **WHEN** a client calls any path under `/api/v1/users`
- **THEN** the system answers `404 Not Found`, because the feature registers no controller

## The administrative user of the development mode

The system SHALL create one administrative user at the start of the application, and only if the environment variable `NODE_ENV` holds the value `development`.

The user carries the email `admin@gitpaas.dev`, the password `gitpaas`, the role `admin` and the state active. The seed runs after the server listens.

### Scenario: The database holds no administrative user

- **WHEN** the application starts in the development mode, and no user carries the email `admin@gitpaas.dev`
- **THEN** the system creates the user with the role `admin`, and it writes a message into the log

### Scenario: The administrative user is available

- **WHEN** the application starts in the development mode, and a user already carries that email
- **THEN** the system changes nothing, and it keeps the password of that user

### Scenario: The application starts in another mode

- **WHEN** the application starts, and `NODE_ENV` holds a value that differs from `development`
- **THEN** the system runs no seed

### Scenario: The seed fails

- **WHEN** the seed raises an error, for example because the database is not available
- **THEN** the system writes the error into the log, and the application continues to run
