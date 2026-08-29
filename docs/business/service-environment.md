# service-environment

## Purpose

A service needs configuration that its repository must not hold: a database address, a key of an API, a password. This capability keeps a set of named variables per service, each one plain or secret, and it gives them to the containers of the stack at each deployment. GitPaaS encrypts a secret at rest, and it never gives its value back to a client. The tab "Environment" of the detail of a service, at `/namespaces/:namespaceId/projects/:id/services/:serviceId/environment`, manages that set.

## The variable of a service

The system SHALL keep a set of variables per service, at `/api/v1/services/:serviceId/variables`. Each variable holds an identifier, the identifier of its service, a name, whether it is a secret, and a value.

The name SHALL hold capital letters, digits and the low line, and it SHALL NOT start with a digit. The name SHALL NOT pass 255 characters.

### Scenario: The system gives a variable

- **WHEN** a client reads a variable
- **THEN** the system gives the identifier, the identifier of the service, the name, whether it is a secret, the value and whether a value is set

### Scenario: The name breaks the rule

- **WHEN** a client sets or changes a variable with a name that holds a lower-case letter, a leading digit, or a character outside capital letters, digits and the low line
- **THEN** the system answers `400 Bad Request` with a message that states the rule of the name

## The name of a variable is unique within its service

The system SHALL refuse a variable whose name another variable of the same service already carries.

### Scenario: The name is already in use

- **WHEN** a client sets a variable with a name that another variable of the same service carries, or changes a variable into that name
- **THEN** the system raises `VARIABLE_NAME_TAKEN`, and it answers `409 Conflict`

## A secret is encrypted at rest, and it never leaves the server

The system SHALL encrypt the value of a variable marked `secret` before it writes the record, with the same means as the private key of a provider (see *The private key is encrypted at rest* of the capability `providers`).

The system SHALL NOT put the value of a secret into the body of any answer. The read model carries `null` for its value, and a `valueSet` flag that states whether a value exists.

### Scenario: The system writes a secret

- **WHEN** a client sets a variable marked `secret` with a value
- **THEN** the system writes the encrypted form of that value, and no clear copy of it

### Scenario: A client reads a secret

- **WHEN** a client reads a variable marked `secret`
- **THEN** the answer carries `null` for the value, and `valueSet` states whether the service holds one

## A change with an empty value keeps a stored secret

The system SHALL keep the stored value of a secret when the body of the change gives no value, or gives an empty value. A plain variable takes the given value, empty or not, because its value never hides from the client.

### Scenario: The change of a secret gives no value

- **WHEN** a client changes a variable marked `secret`, and the body holds no value or an empty value
- **THEN** the system writes the other fields, and it keeps the stored value

### Scenario: The change of a secret gives a new value

- **WHEN** a client changes a variable marked `secret` with a new value
- **THEN** the system encrypts the new value, and it replaces the stored value

## Removal of a variable

The system SHALL remove a variable at `DELETE /api/v1/services/:serviceId/variables/:id`, and it SHALL answer `204 No Content`.

### Scenario: The variable exists

- **WHEN** a client removes a variable of the named service
- **THEN** the system removes the record, and it answers `204`

### Scenario: The variable does not exist

- **WHEN** a client removes a variable that the named service does not hold
- **THEN** the system raises `VARIABLE_NOT_FOUND`, and it answers `404 Not Found`

## A variable reaches the containers, and never the build

The system SHALL give the plain value and the decrypted value of every variable of a service to the containers of its stack, at the start of a deployment. It SHALL give no variable to the build of an image.

A change of a variable SHALL take effect at the next deployment. It SHALL NOT reach a container that already runs.

### Scenario: A deployment starts

- **WHEN** a deployment of a service starts, and the service holds one plain variable and one secret
- **THEN** every container of the stack receives the plain value and the decrypted secret in its environment

## A secret that cannot be decrypted stops the deployment

The system SHALL fail a deployment, with a message that names the variable and never its value, when a secret of the service cannot be decrypted. It SHALL start no stack.

### Scenario: The key of the encryption changed

- **WHEN** a deployment starts, and a secret of the service seals under a key that the running key of the encryption does not open
- **THEN** the system marks the deployment `failed` with a message that names the variable, and it starts no container

## The tab "Environment" lists the variables, and hides the form

The tab `environment` SHALL list every variable of the service. It SHALL hide the form that sets or changes a variable until the user asks for it.

Each row SHALL show the name, and, for a plain variable, its value. For a secret, the row SHALL show only whether a value is set, and never the value.

The tab SHALL state that a variable reaches the containers of the stack and never the build of an image, and that a change takes effect only at the next deployment.

### Scenario: The tab lists the variables

- **WHEN** the user opens the tab `environment` of a service that holds variables
- **THEN** the system shows one row per variable, with the value of a plain variable and the presence of the value of a secret, and no form

## The button "Add Variable" opens an empty form

The card SHALL show a button "Add Variable" in its header. The system SHALL show an empty form when the user activates it, so the user sets a new variable.

### Scenario: The user opens the form to add a variable

- **WHEN** the user activates the button "Add Variable"
- **THEN** the system shows an empty form

## The form changes a variable without showing a stored secret

When the user chooses a stored variable to change, the system SHALL show the form, and it SHALL load its name into it. It SHALL leave the field of the value empty when the variable is a secret. The hint under the field SHALL state that an empty value keeps the stored one.

### Scenario: The user changes a secret

- **WHEN** the user chooses a secret to change
- **THEN** the system shows the form, it fills the name, it leaves the field of the value empty, and it shows the hint that an empty value keeps the stored one

## The button "Cancel" hides the form

The form SHALL show a button "Cancel". The system SHALL hide the form, and it SHALL drop the message of the error, when the user activates it.

### Scenario: The user cancels the form

- **WHEN** the user activates the button "Cancel"
- **THEN** the system hides the form, and it drops the message of the error

## A save that succeeds hides the form

The system SHALL hide the form after it sets or changes a variable.

### Scenario: The save succeeds

- **WHEN** the user submits the form, and the API accepts the variable
- **THEN** the system hides the form

## The tab shows the rule a name breaks

When the API refuses a variable, the system SHALL show the message of the API under the form, and it SHALL keep the form open, so the user reads the rule the name breaks and corrects it.

### Scenario: The API refuses the name

- **WHEN** the user submits a name that breaks the rule of a name, or a name that another variable of the service already carries
- **THEN** the system shows the message of the API under the form, it keeps the form open, and the user stays on the tab

## The removal of a variable asks for a confirmation

The system SHALL ask the user to confirm before it removes a variable. The confirmation SHALL name the variable, and it SHALL state that the variable stops reaching the containers at the next deployment.

### Scenario: The user removes a variable

- **WHEN** the user confirms the removal of a variable
- **THEN** the system removes it, and it shows a message of success that names it
