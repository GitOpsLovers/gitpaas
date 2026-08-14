# web-service-add Specification

## Purpose

This capability gives the screen that creates a service inside a project, at the route
`/namespaces/:namespaceId/projects/:id/services/add`.

## Requirements

### Requirement: The field of the form

The system SHALL show a form with one field: the name of the service. The system SHALL take the identifiers
of the namespace and of the project from the path.

The form asks for no repository, for no branch and for no path of the compose file. A new service is
therefore not deployable. The user gives those three values later, in the tab "Provider" of the detail of
the service. See the capability `web-service-detail`.

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens the screen
- **THEN** the system shows one field for the name, and no other field

### Requirement: The trail of the navigation

The system SHALL show a trail with three parts: the projects of the namespace, the name of the project and
the words "Add service".

Until the name of the project arrives from the API, the second part shows the word "Project".

#### Scenario: The name of the project is not yet available

- **WHEN** the screen opens, and the call that reads the project still runs
- **THEN** the trail shows the word "Project" in the second part

### Requirement: The check before the call

The system SHALL remove the empty places at the two ends of the name. If the name is empty after that, the
system SHALL do nothing.

#### Scenario: The name is empty

- **WHEN** the user sends the form with an empty name
- **THEN** the system does nothing, and the user stays on the screen

### Requirement: The end of the creation

If the API accepts the name, the system SHALL show a message of success that names the new service, and it
SHALL open the detail of the project.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the
same screen.

#### Scenario: The creation succeeds

- **WHEN** the API answers with the new service
- **THEN** the system shows the message "Service created" with the name, and it opens the detail of the
  project

#### Scenario: The creation fails

- **WHEN** the API refuses the creation
- **THEN** the system shows the message "Could not create service", and the user stays on the screen
