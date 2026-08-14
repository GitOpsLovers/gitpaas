## MODIFIED Requirements

### Requirement: The steps of the background run

The system SHALL do these steps for each run task:

1. Set the status of the deployment to `running`.
2. Get the archive of the repository at the selected commit from the source control.
3. Read the variables of the service, and decrypt the secrets among them.
4. Run the Docker executor. It extracts the archive, it builds the local services, it pulls the images of
   the registry, it stops the previous stack, and it starts the new stack with those variables in the
   environment of the containers.
5. Set the status to `success` or to `failed`.

The runner SHALL NOT keep the output itself. It SHALL send each line of the executor to the write port of
the logs, and it SHALL call the completion of that port with the terminal status.

The runner SHALL NOT write the value of a secret into the log.

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

#### Scenario: The service holds variables

- **WHEN** the service holds one variable or more
- **THEN** the containers of the new stack read those values in their environment

#### Scenario: A secret cannot be decrypted

- **WHEN** the system cannot decrypt a secret of the service, because the key of the encryption changed
- **THEN** the run fails with a message that names the variable, and it starts no stack with a value that is
  missing
