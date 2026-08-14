# source-control Specification

## Purpose

This capability reads the Git repositories of the operator. It lists the repositories and the branches for
the user interface, and it gives the commit and the source archive that a deployment needs. GitHub is the
one provider at this time, and the platform reaches it as a GitHub App installation.

## Requirements

### Requirement: The operations of the source control

The system SHALL give four operations behind one port:

1. List the repositories that the installation can reach.
2. List the branches of one repository.
3. Resolve a reference — a branch, a tag or a commit — into its head commit.
4. Download the source of a repository at a reference, as a gzipped tarball.

The system SHALL identify a repository by a number. The first two operations answer an HTTP request. The
last two operations serve the deployment, and they have no endpoint of their own.

#### Scenario: A caller resolves a reference

- **WHEN** a caller asks for the commit of a repository at a branch
- **THEN** the system gives the SHA of the commit and the message of the commit

### Requirement: List of the repositories

The system SHALL answer with the repositories of the installation at
`GET /api/v1/source-control/repositories`.

Each repository holds the number, the full name, the default branch and the state of the visibility.

#### Scenario: The installation can reach repositories

- **WHEN** an authenticated client calls the endpoint
- **THEN** the system answers `200` with every repository of the installation, across all the pages

#### Scenario: The installation can reach no repository

- **WHEN** an authenticated client calls the endpoint, and the installation holds no repository
- **THEN** the system answers `200` with an empty list

### Requirement: List of the branches

The system SHALL answer with the branches of one repository at
`GET /api/v1/source-control/repositories/:repositoryId/branches`.

The identifier in the path must be a whole number. Each branch holds only the name.

#### Scenario: The repository exists

- **WHEN** a client calls the endpoint with the number of a repository that the installation can reach
- **THEN** the system answers `200` with every branch of that repository, across all the pages

#### Scenario: The identifier is no number

- **WHEN** a client calls the endpoint with a value that is no whole number
- **THEN** the system answers `400 Bad Request`

### Requirement: The configuration of the provider

The system SHALL read the identifier of the application, the private key and the identifier of the
installation from the environment. The three variables are `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and
`GITHUB_APP_INSTALLATION_ID`.

If one variable is absent, the system SHALL raise `SOURCE_CONTROL_NOT_CONFIGURED`. The message SHALL name
the three variables, so the operator can correct the installation.

The system SHALL build the client one time, and it SHALL use that client again for the later calls.

#### Scenario: A variable is absent

- **WHEN** a client calls any operation of the source control, and one of the three variables is absent
- **THEN** the system raises `SOURCE_CONTROL_NOT_CONFIGURED`, and it answers `503 Service Unavailable`

### Requirement: The classification of a failure of the provider

The system SHALL translate each failure of the provider into one domain error. The system SHALL classify
the failure by the HTTP status that the provider answers:

| Condition | Domain error | HTTP answer |
|---|---|---|
| The status is 404 | `SOURCE_CONTROL_RESOURCE_NOT_FOUND` | `404 Not Found` |
| The status is 429, or the status is 403 with an exhausted quota | `SOURCE_CONTROL_RATE_LIMITED` | `503 Service Unavailable` |
| The status is 401, or the status is 403 for another reason | `SOURCE_CONTROL_AUTHENTICATION_FAILED` | `503 Service Unavailable` |
| The status is 500 or higher | `SOURCE_CONTROL_UNAVAILABLE` | `503 Service Unavailable` |
| The call carries no status, because the network failed | `SOURCE_CONTROL_UNAVAILABLE` | `503 Service Unavailable` |

The system SHALL NOT give the message of the provider to the client. Each domain error carries its own
message.

#### Scenario: The repository does not exist, or the installation cannot see it

- **WHEN** the provider answers with the status 404
- **THEN** the system raises `SOURCE_CONTROL_RESOURCE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The quota of the installation is exhausted

- **WHEN** the provider answers with the status 429, or with the status 403 and the marks of an exhausted
  quota
- **THEN** the system raises `SOURCE_CONTROL_RATE_LIMITED`, and it answers `503 Service Unavailable`

#### Scenario: The credentials are not correct

- **WHEN** the provider answers with the status 401
- **THEN** the system raises `SOURCE_CONTROL_AUTHENTICATION_FAILED`, and it answers `503 Service Unavailable`

#### Scenario: The provider has a failure of its own

- **WHEN** the provider answers with a status of 500 or higher
- **THEN** the system raises `SOURCE_CONTROL_UNAVAILABLE`, and it answers `503 Service Unavailable`

#### Scenario: The provider is not reachable

- **WHEN** the network fails, and the call carries no HTTP status
- **THEN** the system raises `SOURCE_CONTROL_UNAVAILABLE`, and it answers `503 Service Unavailable`

### Requirement: The measure of the calls to the provider

The system SHALL record the duration of each call to the provider, and it SHALL record if the call failed.

#### Scenario: A call ends

- **WHEN** a call to the provider succeeds or fails
- **THEN** the system records the duration of that call, and it marks the failure if one occurred
