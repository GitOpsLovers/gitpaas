# providers Specification

## Purpose

This capability keeps the providers of the operator, and it reads the Git repositories through them. A
provider holds the credentials of one GitHub App. The capability lists the repositories and the branches for
the user interface, and it gives the commit and the source archive that a deployment needs. GitHub is the
one kind of provider at this time.

## Requirements

### Requirement: The provider record

The system SHALL keep one record per provider. A provider is a GitHub App that an operator registers, whose
private key the system encrypts at rest, and which a service selects to reach its repository.

The record holds the identifier, the name, the type, the identifier of the application, the identifier of
the installation, the encrypted private key, the date of the creation and the date of the last change.

The identifier is a UUID that the database generates. The type holds `github_app`, which is the one value
of today. The system SHALL manage the records under the path `/api/v1/providers`.

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

The system SHALL ask GitHub if the application answers, and it SHALL report the result. The operation
changes no record.

#### Scenario: The credentials operate

- **WHEN** a client tests a provider whose credentials GitHub accepts
- **THEN** the system answers that the test succeeded

#### Scenario: GitHub refuses the credentials

- **WHEN** GitHub refuses the credentials of the provider
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

### Requirement: The credentials come from the record of the provider

The system SHALL read the identifier of the application, the private key and the identifier of the
installation from the record of the provider.

If the record holds credentials that the system cannot use, it SHALL raise
`PROVIDER_NOT_CONFIGURED`. The message SHALL name the provider, so the operator can correct that
record.

#### Scenario: The credentials of the record are not complete

- **WHEN** a caller uses a provider whose record holds no usable credentials
- **THEN** the system raises `PROVIDER_NOT_CONFIGURED` with a message that names the provider, and it
  answers `503 Service Unavailable`

#### Scenario: The environment holds no credential

- **WHEN** the application starts, and no variable of the environment names a GitHub App
- **THEN** the application starts, because no operation of the provider client reads the environment

### Requirement: One client for each provider

The system SHALL keep one client for each provider, in a map that the identifier of the provider keys. The
system SHALL build a client only when the map holds none for that provider.

#### Scenario: Two providers in one process

- **WHEN** two callers use two different providers
- **THEN** the system builds one client for each provider, and the two clients authenticate as two
  different applications

#### Scenario: One provider in two calls

- **WHEN** two callers use the same provider
- **THEN** the system builds the client one time, and the second call uses the same client

### Requirement: The operations of the provider client

The system SHALL give five operations behind one port. Every operation takes the credentials of a provider
as its first parameter:

1. List the repositories that the installation of the provider can reach.
2. List the branches of one repository.
3. Resolve a reference — a branch, a tag or a commit — into its head commit.
4. Download the source of a repository at a reference, as a gzipped tarball.
5. Verify that GitHub accepts the credentials.

The system SHALL identify a repository by a number. The first two operations answer an HTTP request under
the path of the provider. The next two serve the deployment, and they have no endpoint of their own. The
last one serves the test of a provider.

#### Scenario: A caller resolves a reference

- **WHEN** a caller asks for the commit of a repository at a branch, with the credentials of a provider
- **THEN** the system gives the SHA of the commit and the message of the commit

#### Scenario: A caller verifies the credentials

- **WHEN** a caller verifies the credentials of a provider
- **THEN** the system asks GitHub if the application answers, and it reports the result

### Requirement: List of the repositories

The system SHALL answer with the repositories of one provider at
`GET /api/v1/providers/:providerId/repositories`.

Each repository holds the number, the full name, the default branch and the state of the visibility.

#### Scenario: The installation can reach repositories

- **WHEN** an authenticated client calls the endpoint with the identifier of an available provider
- **THEN** the system answers `200` with every repository of that provider, across all the pages

#### Scenario: The installation can reach no repository

- **WHEN** an authenticated client calls the endpoint, and the installation of the provider holds no
  repository
- **THEN** the system answers `200` with an empty list

#### Scenario: The provider does not exist

- **WHEN** a client calls the endpoint with a UUID that matches no provider
- **THEN** the system raises `PROVIDER_NOT_FOUND`, and it answers `404 Not Found`

### Requirement: List of the branches

The system SHALL answer with the branches of one repository at
`GET /api/v1/providers/:providerId/repositories/:repositoryId/branches`.

The identifier of the provider must be a UUID, and the identifier of the repository must be a whole number.
Each branch holds only the name.

#### Scenario: The repository exists

- **WHEN** a client calls the endpoint with an available provider and the number of a repository that it
  can reach
- **THEN** the system answers `200` with every branch of that repository, across all the pages

#### Scenario: The identifier is no number

- **WHEN** a client calls the endpoint with a value that is no whole number as the repository
- **THEN** the system answers `400 Bad Request`

### Requirement: The classification of a failure of the provider

The system SHALL translate each failure of the provider into one domain error. The system SHALL classify
the failure by the HTTP status that the provider answers:

| Condition | Domain error | HTTP answer |
|---|---|---|
| The status is 404 | `PROVIDER_RESOURCE_NOT_FOUND` | `404 Not Found` |
| The status is 429, or the status is 403 with an exhausted quota | `PROVIDER_RATE_LIMITED` | `503 Service Unavailable` |
| The status is 401, or the status is 403 for another reason | `PROVIDER_AUTHENTICATION_FAILED` | `503 Service Unavailable` |
| The status is 500 or higher | `PROVIDER_UNAVAILABLE` | `503 Service Unavailable` |
| The call carries no status, because the network failed | `PROVIDER_UNAVAILABLE` | `503 Service Unavailable` |

The system SHALL NOT give the message of the provider to the client. Each domain error carries its own
message.

#### Scenario: The repository does not exist, or the installation cannot see it

- **WHEN** the provider answers with the status 404
- **THEN** the system raises `PROVIDER_RESOURCE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The quota of the installation is exhausted

- **WHEN** the provider answers with the status 429, or with the status 403 and the marks of an exhausted
  quota
- **THEN** the system raises `PROVIDER_RATE_LIMITED`, and it answers `503 Service Unavailable`

#### Scenario: The credentials are not correct

- **WHEN** the provider answers with the status 401
- **THEN** the system raises `PROVIDER_AUTHENTICATION_FAILED`, and it answers `503 Service Unavailable`

#### Scenario: The provider has a failure of its own

- **WHEN** the provider answers with a status of 500 or higher
- **THEN** the system raises `PROVIDER_UNAVAILABLE`, and it answers `503 Service Unavailable`

#### Scenario: The provider is not reachable

- **WHEN** the network fails, and the call carries no HTTP status
- **THEN** the system raises `PROVIDER_UNAVAILABLE`, and it answers `503 Service Unavailable`

### Requirement: The measure of the calls to the provider

The system SHALL record the duration of each call to the provider, and it SHALL record if the call failed.

#### Scenario: A call ends

- **WHEN** a call to the provider succeeds or fails
- **THEN** the system records the duration of that call, and it marks the failure if one occurred
