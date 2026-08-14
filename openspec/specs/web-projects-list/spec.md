# web-projects-list Specification

## Purpose

This capability gives the screen that lists the projects of one namespace, at the route
`/namespaces/:namespaceId/projects`.

## Requirements

### Requirement: The screen belongs to one namespace

The system SHALL take the identifier of the namespace from the path, and it SHALL read only the projects of
that namespace.

Every link of the screen carries the same identifier of the namespace.

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens the projects of a namespace
- **THEN** the system reads the projects of that namespace only

### Requirement: The four states of the screen

The system SHALL show one of four states:

1. **The reading runs.** The screen says "Loading projects…".
2. **The reading failed.** The screen shows a red panel that says "Could not load projects. Is the backend
   running?".
3. **The list holds projects.** The screen shows one card per project, in a grid.
4. **The list is empty.** The screen shows a panel with a dotted border that says "No projects yet.", and a
   button that opens the screen of the creation.

#### Scenario: The reading fails

- **WHEN** the call of the API fails
- **THEN** the screen shows the red panel with the question about the backend

#### Scenario: The list is empty

- **WHEN** the API answers with an empty list
- **THEN** the screen shows the panel "No projects yet." with the button "Create your first project"

### Requirement: The actions of a card

Each card SHALL give three actions:

| Action | Result |
|---|---|
| View | Opens the detail of the project |
| Edit | Opens the change of the project |
| Delete | Opens the question before the removal |

#### Scenario: The user chooses "View"

- **WHEN** the user chooses "View" on a card
- **THEN** the system opens the detail of that project, inside the same namespace

### Requirement: The removal of a project

The system SHALL ask the user to confirm before it removes a project.

The question carries the title "Delete project?" and a message that names the project between marks of
quotation, and that says that the action has no way back.

The message SHALL NOT say that the removal also removes the services of the project. The API removes them
by the cascade. See the capability `projects`.

After a removal that succeeds, the system SHALL show a message of success, and it SHALL read the list
again.

#### Scenario: The removal succeeds

- **WHEN** the user confirms the removal, and the API answers `204`
- **THEN** the system shows the message "Project deleted", and it reads the list again

#### Scenario: The removal fails

- **WHEN** the call of the removal fails
- **THEN** the system shows the message "Could not delete project", and it keeps the list as it is

#### Scenario: The project holds services

- **WHEN** the user removes a project that holds services
- **THEN** the question warns about the project only, and the services go away with it
