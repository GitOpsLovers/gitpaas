# web-project-edit Specification

## Purpose

This capability gives the screen that changes the name of a project, at the route
`/namespaces/:namespaceId/projects/edit/:id`.

## Requirements

### Requirement: The load of the project

The system SHALL read the project of the path, and it SHALL put the name into the field.

#### Scenario: The project arrives

- **WHEN** the API answers with the project
- **THEN** the system puts the name of that project into the field

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

If the API accepts the change, the system SHALL show a message of success that names the project, and it
SHALL open the list of the projects of that namespace.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the
same screen.

#### Scenario: The change succeeds

- **WHEN** the API answers with the changed project
- **THEN** the system shows the message "Project updated" with the name, and it opens the list of the
  projects

#### Scenario: The change fails

- **WHEN** the API refuses the change, for example because another project of the namespace carries that
  name
- **THEN** the system shows the message "Could not update project", and the user stays on the screen
