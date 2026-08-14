## ADDED Requirements

### Requirement: The credentials come from the record of the provider

The system SHALL read the identifier of the application, the private key and the identifier of the
installation from the record of the provider.

If the record holds credentials that the system cannot use, it SHALL raise
`SOURCE_CONTROL_NOT_CONFIGURED`. The message SHALL name the provider, so the operator can correct that
record.

#### Scenario: The credentials of the record are not complete

- **WHEN** a caller uses a provider whose record holds no usable credentials
- **THEN** the system raises `SOURCE_CONTROL_NOT_CONFIGURED` with a message that names the provider, and it
  answers `503 Service Unavailable`

#### Scenario: The environment holds no credential

- **WHEN** the application starts, and no variable of the environment names a GitHub App
- **THEN** the application starts, because no operation of the source control reads the environment

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

## MODIFIED Requirements

### Requirement: The operations of the source control

The system SHALL give five operations behind one port. Every operation takes the credentials of a provider
as its first parameter:

1. List the repositories that the installation of the provider can reach.
2. List the branches of one repository.
3. Resolve a reference — a branch, a tag or a commit — into its head commit.
4. Download the source of a repository at a reference, as a gzipped tarball.
5. Verify that the source control accepts the credentials.

The system SHALL identify a repository by a number. The first two operations answer an HTTP request under
the path of the provider. The next two serve the deployment, and they have no endpoint of their own. The
last one serves the test of a provider.

#### Scenario: A caller resolves a reference

- **WHEN** a caller asks for the commit of a repository at a branch, with the credentials of a provider
- **THEN** the system gives the SHA of the commit and the message of the commit

#### Scenario: A caller verifies the credentials

- **WHEN** a caller verifies the credentials of a provider
- **THEN** the system asks the source control if the application answers, and it reports the result

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

## REMOVED Requirements

### Requirement: The configuration of the provider

**Reason:** the credentials move from the environment into the record of the provider. The three variables
`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and `GITHUB_APP_INSTALLATION_ID` go away.

**Migration:** an operator registers the same GitHub App as a provider, with the script
`scripts/import-github-app-provider.sh` or in the screen of the providers. The two requirements *The
credentials come from the record of the provider* and *One client for each provider* replace this one.
