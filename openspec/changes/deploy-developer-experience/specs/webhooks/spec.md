## Purpose

This capability receives the call that a source control makes when a developer pushes a commit. It proves
that the call is genuine, and it decides whether that push starts a deployment.

## ADDED Requirements

### Requirement: The endpoint of the webhook is public and checked

The system SHALL give an endpoint that a source control calls, and that endpoint needs no access token,
because a source control holds none.

The system SHALL check the signature of every call against the secret of the service before it does anything
else. A call whose signature does not agree SHALL be refused.

#### Scenario: The signature agrees

- **WHEN** a source control calls the endpoint with a signature that agrees with the secret of the service
- **THEN** the system accepts the call

#### Scenario: The signature does not agree

- **WHEN** a caller sends a body with a signature that does not agree, or with no signature
- **THEN** the system answers `401 Unauthorized`, it starts no deployment, and it writes no record

#### Scenario: The service does not exist

- **WHEN** a caller sends a call for a service that does not exist
- **THEN** the system answers `404 Not Found`, and it starts no deployment

### Requirement: The endpoint answers quickly

The system SHALL answer the call of the source control before it decides whether the push deploys.

A source control disables a webhook that answers slowly or that fails. The decision and the deployment
therefore happen after the answer.

#### Scenario: The call is genuine

- **WHEN** the system accepts a call
- **THEN** the system answers immediately, and then it decides whether the push deploys

### Requirement: A push deploys only its own branch

The system SHALL start a deployment only when the push touches the deployment branch of the service.

A push to any other branch is a normal case. The system SHALL do nothing, and it SHALL NOT report a failure.

#### Scenario: The push touches the deployment branch

- **WHEN** a push touches the branch that the service names as its deployment branch
- **THEN** the system starts a deployment of that service, with the origin `push`

#### Scenario: The push touches another branch

- **WHEN** a push touches a branch that the service does not name
- **THEN** the system starts no deployment, and it reports no failure

#### Scenario: The service is not deployable

- **WHEN** a push touches the deployment branch of a service that holds no repository
- **THEN** the system starts no deployment

### Requirement: The secret of a webhook

The system SHALL generate one secret per service when an operator turns the webhook on, and it SHALL
register that secret with the repository.

The system SHALL encrypt the secret at rest, and no answer of the API SHALL carry it.

#### Scenario: An operator turns the webhook on

- **WHEN** an operator turns the webhook on for a service
- **THEN** the system generates a secret, it registers the webhook with the repository, and it stores the
  secret encrypted

#### Scenario: A client reads the service

- **WHEN** a client reads a service whose webhook is on
- **THEN** the answer says that the webhook is on, and it carries no secret

#### Scenario: An operator turns the webhook off

- **WHEN** an operator turns the webhook off
- **THEN** the system removes the registration from the repository, and a later call of that webhook is
  refused
