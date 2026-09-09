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

The final Compose file of a service, when its origin is `deployment`, masks the value of every variable in the same way, plain or secret, so the file that a client reads never carries the value that a container receives. See the requirement *The final Compose text of a deployment* of the capability [deployments](./deployments.md). When the origin of the file is `repository`, the file arrives from the provider with no such mask, because no deployment has yet sent that text to a container.

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

## The recipe interpolates a reference to a variable of the service

The system SHALL substitute every reference to a variable of the service, held anywhere in the text of the compose recipe, with the plain value or the decrypted value of that variable, before it builds the images of the stack. Thus a `build.arg` of the recipe reads a variable of the service, though the build itself receives no variable in its environment (see *A variable reaches the containers, and never the build*, above). The variables of the section "Environments" of the service are the one source; a file `.env` of the repository of the service takes no part.

A reference takes one of four forms: `${VAR}`, `$VAR`, `${VAR:-default}` and `${VAR-default}`. The form `${VAR:-default}` gives the default when the service holds no such variable, and also when it holds one with an empty value. The form `${VAR-default}` gives the default when the service holds no such variable alone. `$$` is not a reference; it gives one literal `$`.

A reference to a variable that the service does not hold, and that carries no default, gives an empty text. The system logs no error for it, and it stops no deployment.

### Scenario: A build argument reads a variable of the service

- **WHEN** the compose recipe of a service holds a `build.arg` with a reference to a variable of the service
- **THEN** the system substitutes that reference with the value of the variable before it builds the image

### Scenario: A variable is not set

- **WHEN** the compose recipe holds a reference to a variable that the service does not hold, and the reference carries no default
- **THEN** the system substitutes it with an empty text, and it does not stop the deployment

### Scenario: The escape of the dollar sign

- **WHEN** the compose recipe holds `$$`
- **THEN** the system substitutes it with one literal `$`

## A secret that cannot be decrypted stops the deployment

The system SHALL fail a deployment, with a message that names the variable and never its value, when a secret of the service cannot be decrypted. It SHALL start no stack.

### Scenario: The key of the encryption changed

- **WHEN** a deployment starts, and a secret of the service seals under a key that the running key of the encryption does not open
- **THEN** the system marks the deployment `failed` with a message that names the variable, and it starts no container

## The compose file declares the variables the service already gives to its containers

The system SHALL read the key `environment` of every service of the compose recipe of a service, and it SHALL cache the name and the literal value of every name it declares, together with the moment of that read. A value that holds a reference `${...}` gives an empty value in the cache, because this read resolves no reference.

The system SHALL refresh that cache when the user writes the path of the compose file in the tab "Provider" of the service (see the requirement *The tab "Provider" configures the source* of the capability [providers](./providers.md)). A failure of the download or of the parse of the compose file SHALL leave the cache untouched, and it SHALL NOT fail that write.

The system SHALL also refresh the cache on demand, at `POST /api/v1/services/:id/compose-environment/refresh`.

### Scenario: The user writes the path of the compose file

- **WHEN** the user saves the tab "Provider" with a new path of the compose file
- **THEN** the system reads that file, and it caches the name and the value of every name its key `environment` declares

### Scenario: The read of the compose file fails

- **WHEN** the download or the parse of the compose file fails, at the write of the tab "Provider" or at the refresh on demand
- **THEN** the system keeps the former cache, and it does not fail the write

### Scenario: The user refreshes the cache on demand

- **WHEN** a client calls the refresh on demand
- **THEN** the system reads the compose file again, and it caches the name and the value of every name it declares

## The list of the tab "Environment" unions the stored variables with the names of the cache

The system SHALL show, beside every stored variable, one row for a name that the cache holds and no stored variable carries. Such a row holds no identifier, because the user never saved it. A name of both sides gives one row alone, which keeps the value of the stored variable.

Each row SHALL carry an origin, `user` or `compose`, and, when the cache declares its name, the moment of the last refresh.

### Scenario: The cache declares a name with no stored variable

- **WHEN** the list of the variables of a service reads a name that the compose file declares and no stored variable carries
- **THEN** the system gives a row of that name, with no identifier, and the origin `compose`

### Scenario: A name is on both sides

- **WHEN** a stored variable carries a name that the cache also declares
- **THEN** the system gives one row alone, which keeps the value of the stored variable, and the origin `compose`

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

## The badge "Compose" marks a row the compose file declares

The tab SHALL show a badge "Compose" beside the name of every row whose origin is `compose`.

### Scenario: The row comes from the compose file

- **WHEN** a row of the list carries the origin `compose`
- **THEN** the tab shows the badge "Compose" beside its name

## A row of the compose file that the user never saved shows its value prefilled

The tab SHALL show the value the cache gives to a row the user never saved. The system SHALL let the user open the form of that row, prefilled with its name and its value, so the user saves it as a stored variable.

### Scenario: The user saves a row of the compose file

- **WHEN** the user opens the form of a row of the compose file that the user never saved, and submits it with no change
- **THEN** the system creates a stored variable with the name and the value of that row

## The removal or the rename of a row of the compose file asks for a confirmation that names its origin

When the user removes a row whose origin is `compose`, the confirmation SHALL state, together with the rule of *The removal of a variable asks for a confirmation* above, that the compose file declares that name, and that the row returns to the list, with no value, at the next refresh.

When the user changes the name of a row whose origin is `compose`, the system SHALL ask for a confirmation before it applies the new name. The confirmation SHALL state that the compose file declares the former name, and that, under the new name, the value no longer reaches the containers.

### Scenario: The user removes a row of the compose file

- **WHEN** the user confirms the removal of a stored variable whose origin is `compose`
- **THEN** the system removes it, and the confirmation named the compose file and the return of the row at the next refresh

### Scenario: The user renames a row of the compose file

- **WHEN** the user changes the name of a row whose origin is `compose`, and submits the form
- **THEN** the system asks for a confirmation that names the former name and the new name, before it applies the change

## The button "Refresh from compose" reads the compose file again

The card SHALL show a button "Refresh from compose" in its header. The system SHALL read the compose file of the service again when the user activates it, and it SHALL reload the list of the tab with the result.

### Scenario: The user refreshes the tab

- **WHEN** the user activates the button "Refresh from compose"
- **THEN** the system reads the compose file again, and it reloads the list of the tab with the names and the values it declares
