# web-service-edit Specification

## Purpose

This capability gives the screen that changes the name of a service, at the route
`/namespaces/:namespaceId/projects/:id/services/edit/:serviceId`.

## Requirements

### Requirement: The screen changes only the name

The system SHALL show a form with one field: the name of the service.

The screen changes no other value. The user gives the repository, the branch and the path of the compose
file in the tab "Provider" of the detail of the service. See the capability `web-service-detail`.

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens the screen
- **THEN** the system shows one field for the name, and no other field

### Requirement: The load of the service

The system SHALL read the service of the path, and it SHALL put the name into the field.

#### Scenario: The service arrives

- **WHEN** the API answers with the service
- **THEN** the system puts the name of that service into the field

#### Scenario: The reading still runs

- **WHEN** the user opens the screen, and the call of the API still runs
- **THEN** the field stays empty until the name arrives

### Requirement: The check before the call

The system SHALL remove the empty places at the two ends of the name. If the name is empty after that, the
system SHALL do nothing.

#### Scenario: The name is empty

- **WHEN** the user sends the form with an empty name
- **THEN** the system does nothing, and the user stays on the screen

### Requirement: The end of the change

If the API accepts the change, the system SHALL show a message of success that names the service, and it
SHALL open the detail of the project.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the
same screen.

#### Scenario: The change succeeds

- **WHEN** the API answers with the changed service
- **THEN** the system shows the message "Service updated" with the name, and it opens the detail of the
  project

#### Scenario: The change fails

- **WHEN** the API refuses the change
- **THEN** the system shows the message "Could not update service", and the user stays on the screen
