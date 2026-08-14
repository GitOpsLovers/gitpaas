# web-project-detail Specification

## Purpose

This capability gives the screen of one project, at the route
`/namespaces/:namespaceId/projects/:id`. The screen shows the services of the project.

## Requirements

### Requirement: The content of the screen

The system SHALL show the trail of the navigation and the list of the services of the project.

The trail holds three parts: the namespaces, the projects of the namespace and the name of the project.
Until the name arrives from the API, the last part shows the word "Project".

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens the detail of a project
- **THEN** the system shows the trail and the list of the services of that project

### Requirement: The four states of the list of the services

The system SHALL show one of four states:

1. **The reading runs.** The screen says "Loading services…".
2. **The reading failed.** The screen shows a red panel that says "Could not load services. Is the backend
   running?".
3. **The list holds services.** The screen shows one card per service, in a grid.
4. **The list is empty.** The screen shows a panel with a dotted border that says "No services yet.", and a
   button that opens the screen of the creation.

#### Scenario: The list is empty

- **WHEN** the project holds no service
- **THEN** the screen shows the panel "No services yet." with the button "Create your first service"

### Requirement: The actions of a card of a service

Each card SHALL give three actions:

| Action | Result |
|---|---|
| View | Opens the detail of the service |
| Edit | Opens the change of the name of the service |
| Delete | Opens the question before the removal |

#### Scenario: The user chooses "View"

- **WHEN** the user chooses "View" on a card
- **THEN** the system opens the detail of that service

### Requirement: The removal of a service

The system SHALL ask the user to confirm before it removes a service.

The question carries the title "Delete service?" and a message that names the service between marks of
quotation, and that says that the action has no way back.

The message SHALL NOT say that the removal also removes the containers, the networks and the images of the
service on the server. See the capability `services`.

After a removal that succeeds, the system SHALL show a message of success, and it SHALL read the list
again.

#### Scenario: The removal succeeds

- **WHEN** the user confirms the removal, and the API answers `204`
- **THEN** the system shows the message "Service deleted", and it reads the list again

#### Scenario: The removal fails

- **WHEN** the call of the removal fails
- **THEN** the system shows the message "Could not delete service", and it keeps the list as it is
