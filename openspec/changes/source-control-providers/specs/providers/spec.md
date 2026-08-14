## Purpose

This capability holds the named credentials of the source control. A provider is a GitHub App that an
operator registers, whose private key the system encrypts at rest, and which a service selects to reach its
repository.

## ADDED Requirements

### Requirement: The provider record

The system SHALL keep one record per provider. The record holds the identifier, the name, the type, the
identifier of the application, the identifier of the installation, the encrypted private key, the date of
the creation and the date of the last change.

The identifier is a UUID that the database generates. The type holds `github_app`, which is the one value
of today.

#### Scenario: The system gives a provider

- **WHEN** a client reads a provider
- **THEN** the system gives the identifier, the name, the type, the identifier of the application, the
  identifier of the installation and the fingerprint of the key

### Requirement: The name of a provider is unique

The system SHALL refuse a provider whose name another provider already carries.

#### Scenario: The name is already in use

- **WHEN** a client creates or changes a provider with a name that another provider carries
- **THEN** the system raises `PROVIDER_NAME_TAKEN`, and it answers `409 Conflict`

### Requirement: The private key is encrypted at rest

The system SHALL encrypt the private key with AES-256-GCM before it writes the record. The key of the
encryption comes from the environment variable `PROVIDERS_ENCRYPTION_KEY`, which holds 32 random bytes in
the hexadecimal form.

The system SHALL NOT write the private key in clear text, in the database or in the log.

#### Scenario: The system writes a provider

- **WHEN** a client creates a provider with a private key
- **THEN** the system writes the encrypted form of that key, and no clear copy of it

#### Scenario: The variable of the encryption is absent

- **WHEN** the application starts, and `PROVIDERS_ENCRYPTION_KEY` is absent
- **THEN** the validation of the environment fails, and the application does not start

### Requirement: The API never gives a private key

The system SHALL NOT put the private key into the body of any answer.

Instead of the key, the read model carries a fingerprint: the first eight characters of the SHA-256 of the
PEM. The fingerprint lets the operator recognize a key, and it gives no way back to the key.

#### Scenario: A client reads a provider

- **WHEN** a client reads one provider, or the list of the providers
- **THEN** no body of the answer holds the private key, in any form

### Requirement: A change with an empty key keeps the stored key

The system SHALL keep the stored private key when the body of the change holds no key, or holds an empty
key.

Thus an operator changes the name of a provider without the PEM at hand.

#### Scenario: The body holds no key

- **WHEN** a client changes a provider, and the body holds no private key
- **THEN** the system writes the other fields, and it keeps the stored key

#### Scenario: The body holds a new key

- **WHEN** a client changes a provider, and the body holds a new private key
- **THEN** the system encrypts the new key, and it replaces the stored key

### Requirement: A provider that services use cannot be removed

The system SHALL refuse the removal of a provider while a service still points at it.

The database enforces the same rule with `ON DELETE RESTRICT`. This copies the rule that a namespace applies
to its projects.

#### Scenario: The provider holds services

- **WHEN** a client removes a provider, and one service or more points at it
- **THEN** the system raises `PROVIDER_IN_USE`, it answers `409 Conflict`, and it removes no record

#### Scenario: The provider holds no service

- **WHEN** a client removes a provider that no service uses
- **THEN** the system removes the record, and it answers `204 No Content`

### Requirement: The test of the credentials

The system SHALL give an operation that tests the credentials of a provider, at
`POST /api/v1/providers/:id/test`.

The system SHALL ask the source control if the application answers, and it SHALL report the result. The
operation changes no record.

#### Scenario: The credentials operate

- **WHEN** a client tests a provider whose credentials the source control accepts
- **THEN** the system answers that the test succeeded

#### Scenario: The source control refuses the credentials

- **WHEN** the source control refuses the credentials of the provider
- **THEN** the system answers that the test failed, and it changes no record

### Requirement: Only an administrator writes a provider

The system SHALL let a user with the role `admin` create, change and remove a provider. The system SHALL
refuse those three operations to a user with the role `user`.

The read of a provider needs no role, because the form of a service must offer the list to each operator.

#### Scenario: An administrator creates a provider

- **WHEN** a user with the role `admin` creates a provider
- **THEN** the system writes the record

#### Scenario: A user without the role creates a provider

- **WHEN** a user with the role `user` creates, changes or removes a provider
- **THEN** the system answers `403 Forbidden`, and it changes no record

#### Scenario: A user without the role reads the providers

- **WHEN** a user with the role `user` reads the list of the providers
- **THEN** the system answers `200` with the list
