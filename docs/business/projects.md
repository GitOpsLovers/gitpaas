# projects

## Purpose

This capability groups the services of the platform. A project belongs to one namespace, and it holds a set of services. It sits between the namespace and the service in the domain model, and every endpoint of this capability lives under the path of its namespace. It also gives the screens of the projects of one namespace: the list at the route `/namespaces/:namespaceId/projects`, the creation at `/namespaces/:namespaceId/projects/add`, the change of the name at `/namespaces/:namespaceId/projects/edit/:id` and the detail at `/namespaces/:namespaceId/projects/:id`, which shows the services of the project.

## The project record

The system SHALL keep one record per project. The record holds the identifier, the name, the description, the identifier of the namespace, the date of creation and the count of the services.

The identifier is a UUID that the database generates. The system SHALL calculate the count of the services from the services that belong to the project.

The description is optional, and it holds an empty text when a caller gives none. It carries at most 500 characters. The date of creation is the instant the database wrote the record, and the system never changes it.

### Scenario: The system gives a project

- **WHEN** a client reads a project
- **THEN** the system gives the identifier, the name, the description, the identifier of the namespace, the date of creation and the count of the services

### Scenario: The system creates or changes a project

- **WHEN** the system answers a creation or a change
- **THEN** the count of the services holds 0, because the operation does not load the services

## The name of a project is unique inside its namespace

The system SHALL refuse a project whose name another project of the same namespace already carries.

Two projects of different namespaces can carry the same name.

### Scenario: The name is already in use in that namespace

- **WHEN** a client creates or changes a project with a name that another project of the same namespace carries
- **THEN** the system raises `PROJECT_NAME_TAKEN`, and it answers `409 Conflict`

### Scenario: The name is in use in another namespace

- **WHEN** a client creates a project with a name that only a project of a different namespace carries
- **THEN** the system writes the record

## Every operation runs inside a namespace

The system SHALL put every endpoint of this capability under `/api/v1/namespaces/:namespaceId/projects`.

The system SHALL check that the project belongs to the namespace of the path, for the read of one project, for the change and for the removal. A project of a different namespace SHALL give the same answer as a project that does not exist. Thus the path gives no information about a project of another namespace.

### Scenario: The project belongs to another namespace

- **WHEN** a client reads, changes or deletes a project with the correct identifier of the project, but with the identifier of a namespace that does not hold it
- **THEN** the system raises `PROJECT_NOT_FOUND`, and it answers `404 Not Found`

### Scenario: The identifier of the namespace is no UUID

- **WHEN** a client calls any endpoint with a value that is no UUID as the identifier of the namespace
- **THEN** the system answers `400 Bad Request`

## List of the projects of a namespace

The system SHALL answer with the projects of one namespace at `GET /api/v1/namespaces/:namespaceId/projects`.

The system SHALL sort the list by the identifier, in the falling direction. Each project of the list carries its count of the services.

### Scenario: The namespace holds projects

- **WHEN** a client calls the endpoint with the identifier of a namespace that holds projects
- **THEN** the system answers `200` with the projects of that namespace only

### Scenario: The namespace holds no project

- **WHEN** a client calls the endpoint with the identifier of a namespace that holds no project
- **THEN** the system answers `200` with an empty list

## Read of one project

The system SHALL answer with one project at `GET /api/v1/namespaces/:namespaceId/projects/:id`.

### Scenario: The project exists in that namespace

- **WHEN** a client calls the endpoint with the identifiers of an available project and of its namespace
- **THEN** the system answers `200` with that project

### Scenario: The project does not exist

- **WHEN** a client calls the endpoint with a UUID that matches no project
- **THEN** the system raises `PROJECT_NOT_FOUND`, and it answers `404 Not Found`

## Creation of a project

The system SHALL create a project at `POST /api/v1/namespaces/:namespaceId/projects`.

The body holds the name and, optionally, the description. The system SHALL take the identifier of the namespace from the path.

### Scenario: The body is correct

- **WHEN** a client posts a name that no project of that namespace carries
- **THEN** the system writes the record, and it answers `201` with the new project

### Scenario: The body is not correct

- **WHEN** a client posts a body without a name, or with an empty name
- **THEN** the system answers `400 Bad Request`

## Change of a project

The system SHALL change the name and the description of a project at `PUT /api/v1/namespaces/:namespaceId/projects/:id`.

### Scenario: The project exists in that namespace

- **WHEN** a client puts a correct body to an available project of that namespace
- **THEN** the system writes the new name, and it answers `200` with the changed project

### Scenario: The project does not exist

- **WHEN** a client puts a correct body to a UUID that matches no project of that namespace
- **THEN** the system raises `PROJECT_NOT_FOUND`, and it answers `404 Not Found`

### Scenario: The body is not correct

- **WHEN** a client puts a body without a name, or with an empty name
- **THEN** the system answers `400 Bad Request`

## Removal of a project

The system SHALL remove a project at `DELETE /api/v1/namespaces/:namespaceId/projects/:id`, and it SHALL answer `204 No Content`.

The database removes the services of the project by the cascade. The system SHALL NOT count the services before the removal, so a project that holds services goes away with them. Before it removes the record, the system SHALL also remove every network of the project on the daemon. See the capability [networks](./networks.md).

### Scenario: The project exists in that namespace

- **WHEN** a client deletes an available project of that namespace
- **THEN** the system removes the networks of the project on the daemon, removes the record, the database removes the services of the project, and the system answers `204`

### Scenario: The project does not exist

- **WHEN** a client deletes a UUID that matches no project of that namespace
- **THEN** the system raises `PROJECT_NOT_FOUND`, and it answers `404 Not Found`

## The screen belongs to one namespace

The system SHALL take the identifier of the namespace from the path, and it SHALL read only the projects of that namespace.

Every link of the screen carries the same identifier of the namespace.

### Scenario: The user opens the screen

- **WHEN** a signed-in user opens the projects of a namespace
- **THEN** the system reads the projects of that namespace only

## The four states of the screen

The system SHALL show one of four states:

1. **The reading runs.** The screen says "Loading projects…".
2. **The reading failed.** The screen shows a red panel that says "Could not load projects. Is the backend running?".
3. **The list holds projects.** The screen shows one card per project, in a grid.
4. **The list is empty.** The screen shows a panel with a dotted border that says "No projects yet.", and a button that opens the screen of the creation.

### Scenario: The reading fails

- **WHEN** the call of the API fails
- **THEN** the screen shows the red panel with the question about the backend

### Scenario: The list is empty

- **WHEN** the API answers with an empty list
- **THEN** the screen shows the panel "No projects yet." with the button "Create your first project"

## The content of a card

Each card SHALL show the description of the project, truncated after two lines, and the date of creation. The card shows no description when the project holds none.

### Scenario: The project holds a description

- **WHEN** the list shows a project whose description is not empty
- **THEN** the card shows that description, cut after two lines, and the date of creation

### Scenario: The project holds no description

- **WHEN** the list shows a project whose description is empty
- **THEN** the card shows the date of creation alone, and no line for the description

## The actions of a card

Each card SHALL give three actions:

| Action | Result                                |
|--------|---------------------------------------|
| View   | Opens the detail of the project       |
| Edit   | Opens the change of the project       |
| Delete | Opens the question before the removal |

### Scenario: The user chooses "View"

- **WHEN** the user chooses "View" on a card
- **THEN** the system opens the detail of that project, inside the same namespace

## The removal of a project

The system SHALL ask the user to confirm before it removes a project.

The question carries the title "Delete project?" and a message that names the project between marks of quotation, and that says that the action has no way back.

The message SHALL NOT say that the removal also removes the services of the project. The API removes them by the cascade. See the requirement *Removal of a project*.

After a removal that succeeds, the system SHALL show a message of success, and it SHALL read the list again.

### Scenario: The removal succeeds

- **WHEN** the user confirms the removal, and the API answers `204`
- **THEN** the system shows the message "Project deleted", and it reads the list again

### Scenario: The removal fails

- **WHEN** the call of the removal fails
- **THEN** the system shows the message "Could not delete project", and it keeps the list as it is

### Scenario: The project holds services

- **WHEN** the user removes a project that holds services
- **THEN** the question warns about the project only, and the services go away with it

## The fields of the form

The system SHALL show a form with two fields: the name of the project, and its description. The system SHALL take the identifier of the namespace from the path, and the user does not give it.

The description is optional, and it takes a text area limited to 500 characters. The screen SHALL show a counter of the characters that the user typed, out of the limit.

### Scenario: The user opens the screen

- **WHEN** a signed-in user opens the screen
- **THEN** the system shows an empty field for the name, and an empty field for the description

## The check before the creation

The system SHALL remove the empty places at the two ends of the name. If the name is empty after that, the system SHALL do nothing.

### Scenario: The name is empty

- **WHEN** the user sends the form with an empty name
- **THEN** the system does nothing, and the user stays on the screen

## The end of the creation

If the API accepts the name, the system SHALL show a message of success that names the new project, and it SHALL open the list of the projects of that namespace.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the same screen.

The name of a project must be unique inside its namespace. See the requirement *The name of a project is unique inside its namespace*. The screen shows the same message of failure for that reason and for any other.

### Scenario: The creation succeeds

- **WHEN** the API answers with the new project
- **THEN** the system shows the message "Project created" with the name, and it opens the list of the projects

### Scenario: The name is already in use

- **WHEN** the API refuses the creation, because another project of the namespace carries that name
- **THEN** the system shows the message "Could not create project", and the user stays on the screen

## The load of the project

The system SHALL read the project of the path, and it SHALL put the name and the description into their fields.

### Scenario: The project arrives

- **WHEN** the API answers with the project
- **THEN** the system puts the name and the description of that project into their fields

### Scenario: The reading still runs

- **WHEN** the user opens the screen, and the call of the API still runs
- **THEN** the field stays empty until the name arrives

## The check before the change

The system SHALL remove the empty places at the two ends of the name. If the name is empty after that, the system SHALL do nothing.

### Scenario: The name is empty

- **WHEN** the user sends the form with an empty name
- **THEN** the system does nothing, and the user stays on the screen

## The end of the change

If the API accepts the change, the system SHALL show a message of success that names the project, and it SHALL open the list of the projects of that namespace.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the same screen.

### Scenario: The change succeeds

- **WHEN** the API answers with the changed project
- **THEN** the system shows the message "Project updated" with the name, and it opens the list of the projects

### Scenario: The change fails

- **WHEN** the API refuses the change, for example because another project of the namespace carries that name
- **THEN** the system shows the message "Could not update project", and the user stays on the screen

## The content of the screen

The system SHALL show the trail of the navigation and the list of the services of the project.

The trail holds three parts: the namespaces, the projects of the namespace and the name of the project. Until the name arrives from the API, the last part shows the word "Project".

### Scenario: The user opens the screen

- **WHEN** a signed-in user opens the detail of a project
- **THEN** the system shows the trail and the list of the services of that project

## The four states of the list of the services

The system SHALL show one of four states:

1. **The reading runs.** The screen says "Loading services…".
2. **The reading failed.** The screen shows a red panel that says "Could not load services. Is the backend running?".
3. **The list holds services.** The screen shows one card per service, in a grid.
4. **The list is empty.** The screen shows a panel with a dotted border that says "No services yet.", and a button that opens the screen of the creation.

### Scenario: The list is empty

- **WHEN** the project holds no service
- **THEN** the screen shows the panel "No services yet." with the button "Create your first service"

## The content of a card of a service

Each card SHALL show the description of the service, truncated after two lines, and the date of creation. The card shows no description when the service holds none. The card also shows the bullet of the live state of the service. See the requirement *The bullet of the state of a service* of the capability [services](./services.md).

### Scenario: The service holds a description

- **WHEN** the list shows a service whose description is not empty
- **THEN** the card shows that description, cut after two lines, and the date of creation

### Scenario: The service holds no description

- **WHEN** the list shows a service whose description is empty
- **THEN** the card shows the date of creation alone, and no line for the description

## The actions of a card of a service

Each card SHALL give three actions:

| Action | Result                                      |
|--------|---------------------------------------------|
| View   | Opens the detail of the service             |
| Edit   | Opens the change of the name of the service |
| Delete | Opens the question before the removal       |

### Scenario: The user chooses "View"

- **WHEN** the user chooses "View" on a card
- **THEN** the system opens the detail of that service

## The removal of a service

The system SHALL ask the user to confirm before it removes a service.

The question carries the title "Delete service?" and a message that names the service between marks of quotation, and that says that the action has no way back.

The message SHALL NOT say that the removal also removes the containers, the networks and the images of the service on the server. See the capability `services`.

After a removal that succeeds, the system SHALL show a message of success, and it SHALL read the list again.

### Scenario: The removal succeeds

- **WHEN** the user confirms the removal, and the API answers `204`
- **THEN** the system shows the message "Service deleted", and it reads the list again

### Scenario: The removal fails

- **WHEN** the call of the removal fails
- **THEN** the system shows the message "Could not delete service", and it keeps the list as it is
