# services

## Purpose

This capability holds the deployable units of the platform. A service belongs to one project, and it points to a Git repository, to a deployment branch and to a compose file. This capability gives the operations that read, create, change and remove a service, and it removes the resources of the server when a service goes away. It also gives the screens of the services of one project: the creation at the route `/namespaces/:namespaceId/projects/:id/services/add`, the change of the name at `/namespaces/:namespaceId/projects/:id/services/edit/:serviceId` and the detail at `/namespaces/:namespaceId/projects/:id/services/:serviceId/:tab`, which is the screen where the operator configures the source of the service, starts a deployment, and reads the output of a run.

## The service record

The system SHALL keep one record per service. The record holds the identifier, the name, the description, the identifier of the project, the identifier of the provider, the identifier of the repository, the deployment branch, the path of the compose file and the date of creation.

The identifier is a UUID that the database generates. The database refuses the removal of a provider that a service still names. A service with no provider is not deployable.

The description is optional, and it holds an empty text when a caller gives none. It carries at most 500 characters. The date of creation is the instant the database wrote the record, and the system never changes it.

**The three fields of the deployment are always present.** The column of each one refuses an empty value and carries the default of an empty text. Thus an answer of the API always holds the three fields, and a new service holds an empty text in each one, because a caller gives them after the creation. They are never absent, and they are never without a value.

The shared contract SHALL declare the three fields as obligatory texts.

### Scenario: The system gives a service

- **WHEN** a client reads a service
- **THEN** the system gives the identifier, the name, the description, the identifier of the project, the identifier of the provider, the identifier of the repository, the deployment branch, the path of the compose file and the date of creation

### Scenario: The service is new

- **WHEN** a client reads a service that a caller created and never changed
- **THEN** the three fields of the deployment hold an empty text, and no field is absent

## The provider of a service is present, and it may hold no value

A service reaches its repository through a provider, and a service may have none. The column of the identifier of the provider accepts no value.

**The field is always present in an answer, and it holds `null` when the service has no provider.** It is never absent. JSON carries a value that is empty and a key that is absent in two different ways, and a consumer cannot treat the two as one.

The shared contract SHALL declare the identifier of the provider as a nullable text, and it SHALL NOT declare it as an optional text.

This rule is applicable to every field of an answer whose column accepts no value.

### Scenario: The service reaches a provider

- **WHEN** a client reads a service that holds a provider
- **THEN** the answer holds the identifier of that provider as a text

### Scenario: The service reaches no provider

- **WHEN** a client reads a service that holds no provider
- **THEN** the answer holds the field of the identifier of the provider, and its value is `null`

### Scenario: A contract declares a nullable field as optional

- **WHEN** a change declares a field of an answer with the optional form, and the column of that field accepts no value
- **THEN** the review refuses that change, because the answer sends the key with `null` and never removes it

## The bullet of the state of a service

Each card of a service SHALL show a bullet that reports the live state of its containers, in the upper-right corner of the card. The bullet takes one of four colors:

| State     | Color  | Meaning              |
|-----------|--------|-----------------------|
| `ok`      | Green  | Running               |
| `warning` | Yellow | Unstable              |
| `error`   | Red    | Stopped               |
| `unknown` | Gray   | Never deployed        |

The system SHALL read the containers of the service to compute the state. A container `running` gives `ok`; a container `paused` or `restarting` gives `warning`; a container `exited` or `dead` gives `error`. When the service holds several containers, the state of the card is the worst of them, in the order `ok`, `unknown`, `warning`, `error`.

When the service holds no container, the system SHALL read the deployments of the service instead. A service with no deployment gives `unknown`, and a service with a deployment but no container gives `error`.

### Scenario: The service runs

- **WHEN** every container of the service holds the state `running`
- **THEN** the bullet of the card shows green

### Scenario: One container of the service is unstable

- **WHEN** the worst container of the service holds the state `paused` or `restarting`
- **THEN** the bullet of the card shows yellow

### Scenario: The service stopped

- **WHEN** the worst container of the service holds the state `exited` or `dead`
- **THEN** the bullet of the card shows red

### Scenario: The service was never deployed

- **WHEN** the service holds no container, and no deployment
- **THEN** the bullet of the card shows gray

### Scenario: The service holds a deployment but no container

- **WHEN** the service holds no container, and at least one deployment
- **THEN** the bullet of the card shows red

## List of the services of a project

The system SHALL answer with the services of one project at `GET /api/v1/services?projectId=<uuid>`.

The parameter `projectId` is obligatory, and it must be a UUID. The system SHALL sort the list by the identifier, in the falling direction.

### Scenario: The project holds services

- **WHEN** a client calls the endpoint with the identifier of a project that holds services
- **THEN** the system answers `200` with the services of that project only

### Scenario: The project holds no service

- **WHEN** a client calls the endpoint with the identifier of a project that holds no service
- **THEN** the system answers `200` with an empty list

### Scenario: The parameter is absent or is no UUID

- **WHEN** a client calls the endpoint without `projectId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

## Read of one service

The system SHALL answer with one service at `GET /api/v1/services/:id`.

### Scenario: The service exists

- **WHEN** a client calls `GET /api/v1/services/:id` with the identifier of an available service
- **THEN** the system answers `200` with that service

### Scenario: The service does not exist

- **WHEN** a client calls `GET /api/v1/services/:id` with a UUID that matches no service
- **THEN** the system answers `404 Not Found`

### Scenario: The identifier is no UUID

- **WHEN** a client calls `GET /api/v1/services/:id` with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

## Creation of a service

The system SHALL create a service at `POST /api/v1/services`.

The body holds the name and the identifier of the project. It can also hold the description and the identifier of the provider. The system SHALL set the identifier of the repository, the deployment branch and the path of the compose file to an empty text. Thus a new service is not deployable, and a caller makes it deployable with a later change.

### Scenario: The body is correct

- **WHEN** a client posts a name, the identifier of an available project and the identifier of an available provider
- **THEN** the system writes the record, and it answers `201` with the new service

### Scenario: The body holds no provider

- **WHEN** a client posts a name and the identifier of an available project, and no identifier of a provider
- **THEN** the system writes the record with an empty identifier of a provider, and it answers `201` with the new service

### Scenario: The project does not exist

- **WHEN** a client posts a name and a UUID that matches no project
- **THEN** the database refuses the foreign key, the system raises `PROJECT_NOT_FOUND`, and it answers `404 Not Found`

### Scenario: The provider does not exist

- **WHEN** a client posts a UUID that matches no provider
- **THEN** the database refuses the foreign key, the system raises `PROVIDER_NOT_FOUND`, and it answers `404 Not Found`

### Scenario: The body is not correct

- **WHEN** a client posts a body without a name, with an empty name, without a `projectId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

## Change of a service

The system SHALL change a service at `PUT /api/v1/services/:id`.

The body holds the name, which is obligatory. The body can also hold the description, the identifier of the provider, the identifier of the repository, the deployment branch and the path of the compose file. The system SHALL change only the fields that the body holds.

A caller makes a service deployable with this operation, because it gives the provider, the identifier of the repository and the deployment branch.

### Scenario: The service exists

- **WHEN** a client puts a correct body to the identifier of an available service
- **THEN** the system writes the given fields, and it answers `200` with the changed service

### Scenario: The body holds only the name

- **WHEN** a client puts a body that holds only the name
- **THEN** the system changes the name, and it keeps the identifier of the provider, the identifier of the repository, the deployment branch and the path of the compose file

### Scenario: The service does not exist

- **WHEN** a client puts a correct body to a UUID that matches no service
- **THEN** the system answers `404 Not Found`

### Scenario: The body is not correct

- **WHEN** a client puts a body without a name, or with an empty name
- **THEN** the system answers `400 Bad Request`

## Removal of a service

The system SHALL remove a service at `DELETE /api/v1/services/:id`, and it SHALL answer `204 No Content`.

The system SHALL read the deployments of the service before the removal of the record, because the database removes those rows by the cascade.

After the removal of the record, the system SHALL clean the server in this order:

1. Remove the containers of the service.
2. Remove the networks of the service.
3. Remove the images that the system built for the service.
4. Remove the log entries of each deployment of the service.

The system SHALL keep the shared images that it pulled from a registry, because another service can use them.

### Scenario: The service exists

- **WHEN** a client deletes an available service
- **THEN** the system removes the record, it removes the containers, the networks and the built images of the service, it removes the log entries of each deployment, and it answers `204`

### Scenario: The service does not exist

- **WHEN** a client deletes a UUID that matches no service
- **THEN** the system answers `404 Not Found`, and it cleans nothing on the server

### Scenario: The service holds no deployment

- **WHEN** a client deletes an available service that holds no deployment
- **THEN** the system removes the record, it cleans the resources of the server, and it answers `204`

## The fields of the form

The system SHALL show a form with two fields: the name of the service, and its description. The system SHALL take the identifiers of the namespace and of the project from the path.

The description is optional, and it takes a text area limited to 500 characters. The screen SHALL show a counter of the characters that the user typed, out of the limit.

The form asks for no repository, for no branch and for no path of the compose file. A new service is therefore not deployable. The user gives those three values later, in the tab "Provider" of the detail of the service. See the requirement *The tab "Provider" configures the source* of the capability `providers`.

### Scenario: The user opens the screen

- **WHEN** a signed-in user opens the screen
- **THEN** the system shows an empty field for the name, and an empty field for the description

## The trail of the navigation

The system SHALL show a trail with three parts: the projects of the namespace, the name of the project and the words "Add service".

Until the name of the project arrives from the API, the second part shows the word "Project".

### Scenario: The name of the project is not yet available

- **WHEN** the screen opens, and the call that reads the project still runs
- **THEN** the trail shows the word "Project" in the second part

## The check before the creation

The system SHALL remove the empty places at the two ends of the name. If the name is empty after that, the system SHALL do nothing.

### Scenario: The name is empty

- **WHEN** the user sends the form with an empty name
- **THEN** the system does nothing, and the user stays on the screen

## The end of the creation

If the API accepts the name, the system SHALL show a message of success that names the new service, and it SHALL open the detail of the project.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the same screen.

### Scenario: The creation succeeds

- **WHEN** the API answers with the new service
- **THEN** the system shows the message "Service created" with the name, and it opens the detail of the project

### Scenario: The creation fails

- **WHEN** the API refuses the creation
- **THEN** the system shows the message "Could not create service", and the user stays on the screen

## The screen changes only the name and the description

The system SHALL show a form with two fields: the name of the service, and its description.

The screen changes no other value. The user gives the repository, the branch and the path of the compose file in the tab "Provider" of the detail of the service. See the requirement *The tab "Provider" configures the source* of the capability `providers`.

### Scenario: The user opens the screen

- **WHEN** a signed-in user opens the screen
- **THEN** the system shows a field for the name and a field for the description, and no other field

## The load of the service

The system SHALL read the service of the path, and it SHALL put the name and the description into their fields.

### Scenario: The service arrives

- **WHEN** the API answers with the service
- **THEN** the system puts the name and the description of that service into their fields

### Scenario: The reading still runs

- **WHEN** the user opens the screen, and the call of the API still runs
- **THEN** the field stays empty until the name arrives

## The check before the change

The system SHALL remove the empty places at the two ends of the name. If the name is empty after that, the system SHALL do nothing.

### Scenario: The name is empty

- **WHEN** the user sends the form with an empty name
- **THEN** the system does nothing, and the user stays on the screen

## The end of the change

If the API accepts the change, the system SHALL show a message of success that names the service, and it SHALL open the detail of the project.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the same screen.

### Scenario: The change succeeds

- **WHEN** the API answers with the changed service
- **THEN** the system shows the message "Service updated" with the name, and it opens the detail of the project

### Scenario: The change fails

- **WHEN** the API refuses the change
- **THEN** the system shows the message "Could not update service", and the user stays on the screen

## The eight tabs of the screen

The system SHALL show eight tabs, in this order: `general`, `provider`, `environment`, `domains`, `deployments`, `containers`, `network` and `logs`.

The tab `environment` manages the variables the service gives to its containers. See the capability `service-environment`. The tab `domains` manages the public address of the service, and its certificate. See the capability `domains`.

The path holds the tab. A path that names no tab opens `general`. A path that names an unknown tab also shows `general`.

When the user chooses a tab, the system SHALL open the path of that tab. Thus the address of the browser always names the tab that the screen shows.

### Scenario: The path names no tab

- **WHEN** the user opens the service without a tab in the path
- **THEN** the system opens the path of the tab `general`

### Scenario: The path names an unknown tab

- **WHEN** the path holds a word that no tab carries
- **THEN** the system shows the tab `general`

### Scenario: The user chooses a tab

- **WHEN** the user chooses a tab
- **THEN** the system opens the path of that tab, and the screen shows it

## The tab "General" starts a deployment

The tab `general` SHALL give one action: start a deployment of the service.

When the user starts a deployment, the system SHALL open the tab `deployments` immediately, before the answer of the API arrives. Thus the user sees the history while the new deployment starts.

The system SHALL block the action while the call runs.

### Scenario: The deployment starts

- **WHEN** the user starts a deployment, and the API accepts it
- **THEN** the system opens the tab `deployments`, it reads the history again, and it shows the message "Deployment started"

### Scenario: The deployment cannot start

- **WHEN** the API refuses the deployment, for example because the service is not deployable
- **THEN** the system shows the message "Could not start deployment", and the screen stays on the tab `deployments`
