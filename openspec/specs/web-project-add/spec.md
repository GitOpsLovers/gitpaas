# web-project-add Specification

## Purpose

This capability gives the screen that creates a project inside a namespace, at the route
`/namespaces/:namespaceId/projects/add`.

## Requirements

### Requirement: The field of the form

The system SHALL show a form with one field: the name of the project. The system SHALL take the identifier
of the namespace from the path, and the user does not give it.

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens the screen
- **THEN** the system shows an empty field for the name

### Requirement: The check before the call

The system SHALL remove the empty places at the two ends of the name. If the name is empty after that, the
system SHALL do nothing.

#### Scenario: The name is empty

- **WHEN** the user sends the form with an empty name
- **THEN** the system does nothing, and the user stays on the screen

### Requirement: The end of the creation

If the API accepts the name, the system SHALL show a message of success that names the new project, and it
SHALL open the list of the projects of that namespace.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the
same screen.

The name of a project must be unique inside its namespace. See the capability `projects`. The screen shows
the same message of failure for that reason and for any other.

#### Scenario: The creation succeeds

- **WHEN** the API answers with the new project
- **THEN** the system shows the message "Project created" with the name, and it opens the list of the
  projects

#### Scenario: The name is already in use

- **WHEN** the API refuses the creation, because another project of the namespace carries that name
- **THEN** the system shows the message "Could not create project", and the user stays on the screen
