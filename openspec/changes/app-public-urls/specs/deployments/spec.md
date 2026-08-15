## MODIFIED Requirements

### Requirement: The steps of the background run

The system SHALL do these steps for each run task:

1. Set the status of the deployment to `running`.
2. Get the archive of the repository at the selected commit from the source control.
3. Read the domains of the service, and build the routing that the reverse proxy reads.
4. Run the Docker executor. It extracts the archive, it builds the local services, it pulls the images of
   the registry, it stops the previous stack, and it starts the new stack with that routing.
5. Set the status to `success` or to `failed`.

The runner SHALL NOT keep the output itself. It SHALL send each line of the executor to the write port of
the logs, and it SHALL call the completion of that port with the terminal status.

#### Scenario: The executor emits a line

- **WHEN** the Docker executor emits one line of output
- **THEN** the runner sends that line to the write port of the logs

#### Scenario: The run ends

- **WHEN** the run reaches a terminal status
- **THEN** the runner calls the completion of the write port with `success` or with `failed`

#### Scenario: The run fails

- **WHEN** a step of the run raises an error
- **THEN** the runner writes one more line that holds the message of the error, and then it calls the
  completion with `failed`

#### Scenario: The service holds domains

- **WHEN** the service holds one domain or more
- **THEN** the new stack carries the routing of each domain, and the service answers on each one when the
  run ends

#### Scenario: The service holds no domain

- **WHEN** the service holds no domain
- **THEN** the run starts the stack with no routing, and the service answers on no public address

#### Scenario: The provider went away

- **WHEN** the runner cannot load the credentials of the provider of the service
- **THEN** the run fails with a message that names the provider, and the deployment gets the status `failed`
