## MODIFIED Requirements

### Requirement: The service record

The system SHALL keep one record per service. The record holds the identifier, the name, the identifier of
the project, the identifier of the repository, the deployment branch and the path of the compose file.

The identifier is a UUID that the database generates.

**The three fields of the deployment are always present.** The column of each one refuses an empty value and
carries the default of an empty text. Thus an answer of the API always holds the three fields, and a new
service holds an empty text in each one. They are never absent, and they are never without a value.

The shared contract SHALL declare the three fields as obligatory texts. The description of the frontend that
makes them optional is wrong, and it goes away with this change.

#### Scenario: The system gives a service

- **WHEN** a client reads a service
- **THEN** the system gives the identifier, the name, the identifier of the project, the identifier of the
  repository, the deployment branch and the path of the compose file

#### Scenario: The service is new

- **WHEN** a client reads a service that a caller created and never changed
- **THEN** the three fields of the deployment hold an empty text, and no field is absent
