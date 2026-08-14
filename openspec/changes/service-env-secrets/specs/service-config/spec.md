## Purpose

This capability holds the configuration of a service: the environment variables that its containers read,
and the secrets among them, which the system encrypts at rest and never gives back to a client.

## ADDED Requirements

### Requirement: The variable record

The system SHALL keep one record per variable of a service. The record holds the identifier, the identifier
of the service, the name, the value and the mark that says if the value is a secret.

The value of a secret is encrypted at rest. The value of a plain variable is not.

#### Scenario: The system gives a plain variable

- **WHEN** a client reads a variable that is no secret
- **THEN** the system gives the name and the value

#### Scenario: The system gives a secret

- **WHEN** a client reads a variable that is a secret
- **THEN** the system gives the name, and a mark that says that a value is set, and it gives no value

### Requirement: The name of a variable

The system SHALL accept only a name that a shell can read: capital letters, numbers and the low line, and
it does not start with a number.

The name is unique inside one service. Two services can hold the same name.

#### Scenario: The name is correct

- **WHEN** an operator sets a variable whose name follows the rule
- **THEN** the system writes the record

#### Scenario: The name breaks the rule

- **WHEN** an operator sets a name that holds another character, or that starts with a number
- **THEN** the system answers `400 Bad Request`

#### Scenario: The name is already in use in that service

- **WHEN** an operator sets a name that the same service already holds
- **THEN** the system raises `VARIABLE_NAME_TAKEN`, and it answers `409 Conflict`

### Requirement: A secret is encrypted at rest

The system SHALL encrypt the value of a secret before it writes the record, with the same helper and the
same key of the environment that the other secrets of the server use.

The system SHALL NOT write the value of a secret in clear text, in the database or in the log.

#### Scenario: An operator sets a secret

- **WHEN** an operator sets a variable and marks it as a secret
- **THEN** the system writes the encrypted form of the value, and no clear copy of it

#### Scenario: The key of the encryption is absent

- **WHEN** the application starts, and the variable of the environment that holds the key is absent
- **THEN** the validation of the environment fails, and the application does not start

### Requirement: A change with an empty value keeps the stored secret

The system SHALL keep the stored value when a change of a secret carries no value, or carries an empty
value.

Thus an operator renames a secret, or changes another variable, without the value at hand.

#### Scenario: The change carries no value

- **WHEN** an operator changes a secret, and the body carries no value
- **THEN** the system writes the other fields, and it keeps the stored value

#### Scenario: The change carries a new value

- **WHEN** an operator changes a secret, and the body carries a new value
- **THEN** the system encrypts the new value, and it replaces the stored one

### Requirement: The variables reach the containers when the stack starts

The system SHALL give the variables of a service to the compose run that starts its stack.

The variables reach the containers, and they do not reach the build of an image. A value that only a build
needs is outside this capability.

#### Scenario: The service holds variables

- **WHEN** a deployment of the service starts its stack
- **THEN** every variable of the service, plain or secret, is in the environment of the containers

#### Scenario: The service holds no variable

- **WHEN** the service holds no variable
- **THEN** the stack starts with the values of its compose file only

#### Scenario: A value that the build needs

- **WHEN** an operator sets a variable that only the build of an image reads
- **THEN** the build does not receive it, and the screen states that a variable reaches the containers and
  not the build

### Requirement: The removal of a variable

The system SHALL remove a variable at the request of the operator. The change takes effect at the next
deployment of the service.

#### Scenario: The operator removes a variable

- **WHEN** an operator removes a variable of a service
- **THEN** the system removes the record, and the next deployment starts the stack without that value

#### Scenario: The service goes away

- **WHEN** an operator removes a service that holds variables
- **THEN** the system removes the variables of that service
