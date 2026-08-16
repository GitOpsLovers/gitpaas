# namespaces Specification

## Purpose

This capability groups the projects of the platform. A namespace is the widest scope of the domain model, and it holds a set of projects. This capability gives the operations that read, create, change and remove a namespace. It also gives the screens of the namespaces: the list at the route `/namespaces`, the creation at `/namespaces/add` and the change of the name at `/namespaces/edit/:id`. The list is the entry into the tree of the domain: a namespace holds the projects, and a project holds the services.

## Requirements

### Requirement: The namespace record

The system SHALL keep one record per namespace. The record holds the identifier and the name.

The identifier is a UUID that the database generates. The name is unique across all the namespaces.

#### Scenario: The system gives a namespace

- **WHEN** a client reads a namespace
- **THEN** the system gives the identifier and the name

#### Scenario: The name is already in use

- **WHEN** a client creates a namespace with a name that another namespace already carries
- **THEN** the system refuses the operation, and it writes no second record with that name

### Requirement: List of the namespaces

The system SHALL answer with every namespace at `GET /api/v1/namespaces`.

The system SHALL sort the list by the identifier, in the falling direction.

#### Scenario: The database holds namespaces

- **WHEN** an authenticated client calls `GET /api/v1/namespaces`
- **THEN** the system answers `200` with the list of the namespaces

#### Scenario: The database holds no namespace

- **WHEN** an authenticated client calls `GET /api/v1/namespaces`, and no namespace exists
- **THEN** the system answers `200` with an empty list

### Requirement: Read of one namespace

The system SHALL answer with one namespace at `GET /api/v1/namespaces/:id`.

The identifier in the path must be a UUID.

#### Scenario: The namespace exists

- **WHEN** a client calls `GET /api/v1/namespaces/:id` with the identifier of an available namespace
- **THEN** the system answers `200` with that namespace

#### Scenario: The namespace does not exist

- **WHEN** a client calls `GET /api/v1/namespaces/:id` with a UUID that matches no namespace
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The identifier is no UUID

- **WHEN** a client calls `GET /api/v1/namespaces/:id` with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

### Requirement: Creation of a namespace

The system SHALL create a namespace at `POST /api/v1/namespaces`.

The body holds only the name. The name must be a text, and it must not be empty. The system SHALL refuse a body that holds an unknown field.

#### Scenario: The body is correct

- **WHEN** a client posts a body with a name that no namespace carries
- **THEN** the system writes the record, and it answers `201` with the new namespace

#### Scenario: The name is absent or empty

- **WHEN** a client posts a body without a name, or with an empty name
- **THEN** the system answers `400 Bad Request`

#### Scenario: The body holds an unknown field

- **WHEN** a client posts a body that holds a field which the data transfer object does not declare
- **THEN** the system answers `400 Bad Request`

### Requirement: Change of a namespace

The system SHALL change the name of a namespace at `PUT /api/v1/namespaces/:id`.

#### Scenario: The namespace exists

- **WHEN** a client puts a correct body to the identifier of an available namespace
- **THEN** the system writes the new name, and it answers `200` with the changed namespace

#### Scenario: The namespace does not exist

- **WHEN** a client puts a correct body to a UUID that matches no namespace
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The body is not correct

- **WHEN** a client puts a body without a name, or with an empty name
- **THEN** the system answers `400 Bad Request`

### Requirement: Removal of a namespace

The system SHALL remove a namespace at `DELETE /api/v1/namespaces/:id`, and it SHALL answer `204 No Content`.

The system SHALL count the projects of the namespace before the removal. If the namespace still holds one project or more, the system SHALL refuse the removal. Thus no project loses its namespace.

#### Scenario: The namespace is empty

- **WHEN** a client deletes an available namespace that holds no project
- **THEN** the system removes the record, and it answers `204`

#### Scenario: The namespace still holds projects

- **WHEN** a client deletes an available namespace that holds one project or more
- **THEN** the system raises `NAMESPACE_NOT_EMPTY`, it answers `409 Conflict`, and it removes no record

#### Scenario: The namespace does not exist

- **WHEN** a client deletes a UUID that matches no namespace
- **THEN** the system raises `NAMESPACE_NOT_FOUND`, and it answers `404 Not Found`

### Requirement: The four states of the screen

The system SHALL show one of four states:

1. **The reading runs.** The screen says "Loading namespaces…".
2. **The reading failed.** The screen shows a red panel that says "Could not load namespaces. Is the backend running?".
3. **The list holds namespaces.** The screen shows one card per namespace, in a grid.
4. **The list is empty.** The screen shows a panel with a dotted border that says "No namespaces yet.", and a button that opens the screen of the creation.

#### Scenario: The reading runs

- **WHEN** the user opens the screen, and the call of the API still runs
- **THEN** the screen says "Loading namespaces…"

#### Scenario: The reading fails

- **WHEN** the call of the API fails
- **THEN** the screen shows the red panel with the question about the backend

#### Scenario: The list is empty

- **WHEN** the API answers with an empty list
- **THEN** the screen shows the panel "No namespaces yet." with the button "Create your first namespace"

### Requirement: The actions of a card

Each card SHALL give three actions:

| Action | Result                                                             |
|--------|--------------------------------------------------------------------|
| View   | Opens the projects of the namespace, at `/namespaces/:id/projects` |
| Edit   | Opens the change of the namespace, at `/namespaces/edit/:id`       |
| Delete | Opens the question before the removal                              |

#### Scenario: The user chooses "View"

- **WHEN** the user chooses "View" on a card
- **THEN** the system opens the projects of that namespace

#### Scenario: The user chooses "Edit"

- **WHEN** the user chooses "Edit" on a card
- **THEN** the system opens the screen of the change for that namespace

### Requirement: The removal of a namespace

The system SHALL ask the user to confirm before it removes a namespace.

The question carries the title "Delete namespace?" and a message that names the namespace between marks of quotation, and that says that the action has no way back.

After a removal that succeeds, the system SHALL show a message of success, and it SHALL read the list again. After a removal that fails, the system SHALL show a message of failure, and it SHALL keep the list as it is.

#### Scenario: The removal succeeds

- **WHEN** the user confirms the removal, and the API answers `204`
- **THEN** the system shows the message "Namespace deleted", and it reads the list again

#### Scenario: The namespace still holds projects

- **WHEN** the user confirms the removal, and the API refuses because the namespace still holds projects
- **THEN** the system shows the message "Could not delete namespace" with the text "Something went wrong. Please try again."

#### Scenario: The user cancels

- **WHEN** the user cancels the question
- **THEN** the system closes the question, and it calls no endpoint

### Requirement: The message of the failure does not name the reason

The system SHALL show one message for every failure of the removal. The message does not say if the namespace still holds projects, or if the backend does not answer.

The API separates the two — it answers `409` for a namespace that is not empty, and it names the count of the projects. The screen does not read that answer. See the requirement *Removal of a namespace*.

This requirement records the state of today. A later change must show the true reason.

#### Scenario: Two different failures

- **WHEN** the removal fails because the namespace holds projects, or because the backend does not answer
- **THEN** the system shows the same message in the two cases

### Requirement: The field of the form

The system SHALL show a form with one field: the name of the namespace. The form also gives a control that goes back to the list without a change.

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens `/namespaces/add`
- **THEN** the system shows an empty field for the name

### Requirement: The check before the creation

The system SHALL remove the empty places at the two ends of the name.

If the name is empty after that, the system SHALL do nothing. It sends no call, and it shows no message.

#### Scenario: The name is empty

- **WHEN** the user sends the form with an empty name, or with only empty places
- **THEN** the system does nothing, and the user stays on the screen

### Requirement: The end of the creation

If the API accepts the name, the system SHALL show a message of success that names the new namespace, and it SHALL open the list at `/namespaces`.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the same screen, with the name that the user gave.

The button carries the state of the sending, so the user cannot send the form twice.

#### Scenario: The creation succeeds

- **WHEN** the API answers with the new namespace
- **THEN** the system shows the message "Namespace created" with the name, and it opens `/namespaces`

#### Scenario: The creation fails

- **WHEN** the API refuses the creation, for example because the name is already in use
- **THEN** the system shows the message "Could not create namespace", and the user stays on the screen with the name in the field

### Requirement: The load of the namespace

The system SHALL read the namespace of the path, and it SHALL put the name into the field.

The system SHALL take the identifier one time, when the screen opens.

#### Scenario: The namespace arrives

- **WHEN** the API answers with the namespace
- **THEN** the system puts the name of that namespace into the field

#### Scenario: The reading still runs

- **WHEN** the user opens the screen, and the call of the API still runs
- **THEN** the field stays empty until the name arrives

### Requirement: The check before the change

The system SHALL remove the empty places at the two ends of the name. If the name is empty after that, the system SHALL do nothing.

#### Scenario: The name is empty

- **WHEN** the user sends the form with an empty name
- **THEN** the system does nothing, and the user stays on the screen

### Requirement: The end of the change

If the API accepts the change, the system SHALL show a message of success that names the namespace, and it SHALL open the list at `/namespaces`.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the same screen.

#### Scenario: The change succeeds

- **WHEN** the API answers with the changed namespace
- **THEN** the system shows the message "Namespace updated" with the name, and it opens `/namespaces`

#### Scenario: The change fails

- **WHEN** the API refuses the change
- **THEN** the system shows the message "Could not update namespace", and the user stays on the screen
