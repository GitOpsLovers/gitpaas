## ADDED Requirements

### Requirement: The origin of a deployment

The system SHALL record how each deployment started. The origin is `user`, `push` or `repeat`.

The origin answers how the run started. The user of the record answers who started it. A deployment that a
push started holds the origin `push` and no user.

#### Scenario: A user triggers a deployment

- **WHEN** an authenticated user triggers a deployment
- **THEN** the record holds the origin `user`

#### Scenario: A push triggers a deployment

- **WHEN** a push to the deployment branch starts a deployment
- **THEN** the record holds the origin `push`

#### Scenario: An operator repeats a deployment

- **WHEN** an operator deploys the commit of an earlier deployment again
- **THEN** the new record holds the origin `repeat`

### Requirement: The repeat of an earlier deployment

The system SHALL create a new deployment from the commit of an earlier one, at the request of an operator.

The system SHALL take the commit of the earlier record, and it SHALL NOT resolve the head of the branch.
Thus the run deploys exactly the code that ran before.

The system SHALL NOT change the earlier record, and it SHALL NOT remove the deployments that came after it.
The history stays a true account of what ran and when.

#### Scenario: The operator repeats a deployment that succeeded

- **WHEN** an operator repeats a deployment whose commit is known
- **THEN** the system writes a new record with that commit and the origin `repeat`, and it puts a run task
  into the queue

#### Scenario: The earlier deployment holds no commit

- **WHEN** an operator repeats a deployment whose commit is empty, because it failed before it resolved one
- **THEN** the system refuses the operation with a message that says that the deployment has no commit

#### Scenario: The history stays complete

- **WHEN** an operator repeats a deployment that is not the newest
- **THEN** the newer deployments stay in the history, unchanged

#### Scenario: The commit no longer builds

- **WHEN** the repeated run fails, because the commit is old
- **THEN** the deployment gets the status `failed` with its log, as any other run that fails

### Requirement: The strategy that builds a repository

The system SHALL decide how a repository becomes a running stack, with one of two strategies:

1. The repository carries a compose file. The system uses it, which is the behavior of today.
2. The repository carries no compose file. The system recognizes the stack of the repository, and it builds
   an image from that recognition.

The strategy that recognizes a stack SHALL state, as its first line of output, which stack it recognized and
which rule matched. Thus an operator can read why the build did what it did.

#### Scenario: The repository carries a compose file

- **WHEN** a deployment runs for a repository that carries a compose file at the path of the service
- **THEN** the system uses that file, and no service that runs today changes its behavior

#### Scenario: The repository carries no compose file

- **WHEN** a deployment runs for a repository that carries no compose file
- **THEN** the system recognizes the stack, it writes which stack it recognized, and it builds an image from
  it

#### Scenario: The system recognizes no stack

- **WHEN** the repository carries no compose file, and the system recognizes no stack
- **THEN** the deployment fails with a message that says that no strategy could build the repository

## MODIFIED Requirements

### Requirement: The tab "Deployments" shows the history

The tab `deployments` SHALL show one entry per deployment, the newest first.

Each entry holds the status, the first line of the message of the commit, the short form of the SHA, the
branch, the origin of the run, the date of the creation and the length of the run. An entry of a deployment
that failed also holds the message of the error.

The origin says `user`, `push` or `repeat`.

Each entry gives three actions: view the output, deploy that commit again, and remove the record.

While the reading runs and the list is empty, the tab says "Loading deployments…". If the reading ends and
the list is empty, the tab says "No deployments yet.".

#### Scenario: The user removes a deployment

- **WHEN** the user removes a deployment, and the API answers `204`
- **THEN** the system reads the history again, and it shows the message "Deployment deleted"

#### Scenario: The removal fails

- **WHEN** the call of the removal fails
- **THEN** the system shows the message "Could not delete deployment"

#### Scenario: The service holds no deployment

- **WHEN** the reading ends, and the service holds no deployment
- **THEN** the tab says "No deployments yet."

#### Scenario: The user repeats a deployment

- **WHEN** the user chooses the action that deploys the commit of an entry again
- **THEN** the system starts a new deployment, it reads the history again, and the new entry carries the
  origin `repeat`

#### Scenario: The entry holds no commit

- **WHEN** an entry holds no commit
- **THEN** the action that deploys it again is not available on that entry
