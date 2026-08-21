## MODIFIED Requirements

### Requirement: The service record

The system SHALL keep one record per service. The record holds the identifier, the name, the identifier of
the project, the identifier of the provider, the identifier of the repository, the deployment branch and the
path of the compose file.

The identifier is a UUID that the database generates.

**The three fields of the deployment are always present.** The column of each one refuses an empty value and
carries the default of an empty text. Thus an answer of the API always holds the three fields, and a new
service holds an empty text in each one. They are never absent, and they are never without a value.

The shared contract SHALL declare the three fields as obligatory texts. The description of the frontend that
makes them optional is wrong, and it goes away with this change.

#### Scenario: The system gives a service

- **WHEN** a client reads a service
- **THEN** the system gives the identifier, the name, the identifier of the project, the identifier of the
  provider, the identifier of the repository, the deployment branch and the path of the compose file

#### Scenario: The service is new

- **WHEN** a client reads a service that a caller created and never changed
- **THEN** the three fields of the deployment hold an empty text, and no field is absent

## ADDED Requirements

### Requirement: The provider of a service is present, and it may hold no value

A service reaches its repository through a provider, and a service may have none. The column of the
identifier of the provider accepts no value.

**The field is always present in an answer, and it holds `null` when the service has no provider.** It is
never absent. JSON carries a value that is empty and a key that is absent in two different ways, and a
consumer cannot treat the two as one.

The shared contract SHALL declare the identifier of the provider as a nullable text, and it SHALL NOT
declare it as an optional text. The description of the frontend, which makes the field optional and never
mentions `null`, is wrong in two ways at one time: the wrong type, and the wrong kind of absence.

This rule is applicable to every field of an answer whose column accepts no value.

#### Scenario: The service reaches a provider

- **WHEN** a client reads a service that holds a provider
- **THEN** the answer holds the identifier of that provider as a text

#### Scenario: The service reaches no provider

- **WHEN** a client reads a service that holds no provider
- **THEN** the answer holds the field of the identifier of the provider, and its value is `null`

#### Scenario: A contract declares a nullable field as optional

- **WHEN** a change declares a field of an answer with the optional form, and the column of that field
  accepts no value
- **THEN** the review refuses that change, because the answer sends the key with `null` and never removes it
