## ADDED Requirements

### Requirement: An archived row has a life

The system SHALL remove an archived row of a log when that row passes an age that the operator sets.

The age is measured from the creation of the row. A variable of the environment carries it, and that
variable holds a value by default, so an installation that sets nothing still removes its old rows.

The system SHALL NOT remove the record of the deployment. The history of what ran stays complete, and only
the output goes away.

#### Scenario: A row passes the age

- **WHEN** an archived row of a log is older than the age
- **THEN** the system removes that row, and it keeps the record of its deployment

#### Scenario: A row is inside the age

- **WHEN** an archived row is not older than the age
- **THEN** the system keeps it

#### Scenario: The operator sets no age

- **WHEN** the installation sets no value for the age
- **THEN** the system uses the value by default, and it removes the rows that pass it

### Requirement: The removal runs on a schedule and in batches

The system SHALL run the removal on a schedule, and it SHALL remove a bounded number of rows in one
statement.

The system SHALL run again until it removes nothing more. Thus the first run of an installation that grew
for a long time does not lock the table.

#### Scenario: Many rows passed the age

- **WHEN** the task runs, and more rows passed the age than one batch holds
- **THEN** the system removes one batch, and it runs again until no row passes the age

#### Scenario: No row passed the age

- **WHEN** the task runs, and no row passed the age
- **THEN** the system removes nothing, and it writes no failure

#### Scenario: The removal fails

- **WHEN** the removal raises an error, for example because the database is not available
- **THEN** the system writes the failure into the log of the application, and the next run tries again

## MODIFIED Requirements

### Requirement: The durable list of the output

The system SHALL answer with the archived entries of a deployment at
`GET /api/v1/logs?deploymentId=<uuid>`.

The system SHALL give the entries as a flat list, in the correct order. The parameter `deploymentId` is
obligatory, and it must be a UUID.

This endpoint gives no history while a deployment runs, because the system writes the archive one time, at
the end of the run. To see the output of a deployment that runs, the client uses the stream.

The answer SHALL separate three cases, so a client can say why a list is empty: the output is available, the
run has not ended yet, or the output went away because of its age.

#### Scenario: The deployment ended

- **WHEN** a client calls the endpoint for a deployment whose run ended inside the age
- **THEN** the system answers `200` with every archived entry, oldest first

#### Scenario: The deployment still runs

- **WHEN** a client calls the endpoint for a deployment that still runs
- **THEN** the system answers `200` with an empty list, and it says that the run has not ended yet

#### Scenario: The parameter is absent or is no UUID

- **WHEN** a client calls the endpoint without `deploymentId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

#### Scenario: The output went away

- **WHEN** a client calls the endpoint for a deployment whose run ended before the age
- **THEN** the system answers `200` with an empty list, and it says that the output went away because of its
  age
