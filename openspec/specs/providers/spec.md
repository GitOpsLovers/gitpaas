# providers Specification

## Purpose

This capability keeps the providers of the operator, and it reads the Git repositories through them. A provider holds the credentials of one GitHub App. The capability lists the repositories and the branches for the user interface, and it gives the commit and the source archive that a deployment needs. GitHub is the one kind of provider at this time. It also gives the screens of the providers: the list at the route `/providers`, the registration at `/providers/add` and the change at `/providers/edit/:id`. A provider is a GitHub App that the services of the installation use to reach their repositories.

## Requirements

### Requirement: The provider record

The system SHALL keep one record per provider. A provider is a GitHub App that an operator registers, whose private key the system encrypts at rest, and which a service selects to reach its repository.

The record holds the identifier, the name, the type, the identifier of the application, the identifier of the installation, the encrypted private key, the date of the creation and the date of the last change.

The identifier is a UUID that the database generates. The type holds `github_app`, which is the one value of today. The system SHALL manage the records under the path `/api/v1/providers`.

#### Scenario: The system gives a provider

- **WHEN** a client reads a provider
- **THEN** the system gives the identifier, the name, the type, the identifier of the application, the identifier of the installation and the fingerprint of the key

### Requirement: The name of a provider is unique

The system SHALL refuse a provider whose name another provider already carries.

#### Scenario: The name is already in use

- **WHEN** a client creates or changes a provider with a name that another provider carries
- **THEN** the system raises `PROVIDER_NAME_TAKEN`, and it answers `409 Conflict`

### Requirement: The private key is encrypted at rest

The system SHALL encrypt the private key with AES-256-GCM before it writes the record. The key of the encryption comes from the environment variable `PROVIDERS_ENCRYPTION_KEY`, which holds 32 random bytes in the hexadecimal form.

The system SHALL NOT write the private key in clear text, in the database or in the log.

#### Scenario: The system writes a provider

- **WHEN** a client creates a provider with a private key
- **THEN** the system writes the encrypted form of that key, and no clear copy of it

#### Scenario: The variable of the encryption is absent

- **WHEN** the application starts, and `PROVIDERS_ENCRYPTION_KEY` is absent
- **THEN** the validation of the environment fails, and the application does not start

### Requirement: The API never gives a private key

The system SHALL NOT put the private key into the body of any answer.

Instead of the key, the read model carries a fingerprint: the first eight characters of the SHA-256 of the PEM. The fingerprint lets the operator recognize a key, and it gives no way back to the key.

#### Scenario: A client reads a provider

- **WHEN** a client reads one provider, or the list of the providers
- **THEN** no body of the answer holds the private key, in any form

### Requirement: A change with an empty key keeps the stored key

The system SHALL keep the stored private key when the body of the change holds no key, or holds an empty key.

Thus an operator changes the name of a provider without the PEM at hand.

#### Scenario: The body holds no key

- **WHEN** a client changes a provider, and the body holds no private key
- **THEN** the system writes the other fields, and it keeps the stored key

#### Scenario: The body holds a new key

- **WHEN** a client changes a provider, and the body holds a new private key
- **THEN** the system encrypts the new key, and it replaces the stored key

### Requirement: A provider that services use cannot be removed

The system SHALL refuse the removal of a provider while a service still points at it.

The database enforces the same rule with `ON DELETE RESTRICT`. This copies the rule that a namespace applies to its projects.

#### Scenario: The provider holds services

- **WHEN** a client removes a provider, and one service or more points at it
- **THEN** the system raises `PROVIDER_IN_USE`, it answers `409 Conflict`, and it removes no record

#### Scenario: The provider holds no service

- **WHEN** a client removes a provider that no service uses
- **THEN** the system removes the record, and it answers `204 No Content`

### Requirement: The test of the credentials

The system SHALL give an operation that tests the credentials of a provider, at `POST /api/v1/providers/:id/test`.

The system SHALL ask GitHub if the application answers, it SHALL read the permissions of that application, and it SHALL report one of three outcomes. The operation changes no record.

| Outcome        | Meaning                                                                      |
|----------------|------------------------------------------------------------------------------|
| `ok`           | GitHub accepts the credentials, and the App carries every needed permission. |
| `unauthorized` | GitHub refuses the credentials.                                              |
| `incomplete`   | GitHub accepts the credentials, and one needed permission is missing.        |

The answer SHALL carry the outcome and the names of the missing permissions. The list of the missing permissions is empty for the outcome `ok` and for the outcome `unauthorized`.

The answer SHALL NOT carry a single mark of success, because a provider whose App lacks a permission answers GitHub and still fails at a deployment.

#### Scenario: The credentials operate

- **WHEN** a client tests a provider whose credentials GitHub accepts, and whose App carries `contents: read` and `metadata: read`
- **THEN** the system answers with the outcome `ok` and an empty list of missing permissions

#### Scenario: GitHub refuses the credentials

- **WHEN** GitHub refuses the credentials of the provider
- **THEN** the system answers with the outcome `unauthorized`, and it changes no record

#### Scenario: A permission is missing

- **WHEN** GitHub accepts the credentials, and the App carries no level for `contents`
- **THEN** the system answers with the outcome `incomplete` and the list that names `contents`

### Requirement: Only an administrator writes a provider

The system SHALL let a user with the role `admin` create, change and remove a provider. The system SHALL refuse those three operations to a user with the role `user`.

The read of a provider needs no role, because the form of a service must offer the list to each operator.

#### Scenario: An administrator creates a provider

- **WHEN** a user with the role `admin` creates a provider
- **THEN** the system writes the record

#### Scenario: A user without the role creates a provider

- **WHEN** a user with the role `user` creates, changes or removes a provider
- **THEN** the system answers `403 Forbidden`, and it changes no record

#### Scenario: A user without the role reads the providers

- **WHEN** a user with the role `user` reads the list of the providers
- **THEN** the system answers `200` with the list

### Requirement: The credentials come from the record of the provider

The system SHALL read the identifier of the application, the private key and the identifier of the installation from the record of the provider.

If the record holds credentials that the system cannot use, it SHALL raise `PROVIDER_NOT_CONFIGURED`. The message SHALL name the provider, so the operator can correct that record.

#### Scenario: The credentials of the record are not complete

- **WHEN** a caller uses a provider whose record holds no usable credentials
- **THEN** the system raises `PROVIDER_NOT_CONFIGURED` with a message that names the provider, and it answers `503 Service Unavailable`

#### Scenario: The environment holds no credential

- **WHEN** the application starts, and no variable of the environment names a GitHub App
- **THEN** the application starts, because no operation of the provider client reads the environment

### Requirement: One client for each provider

The system SHALL keep one client for each provider, in a map that the identifier of the provider keys. The system SHALL build a client only when the map holds none for that provider.

#### Scenario: Two providers in one process

- **WHEN** two callers use two different providers
- **THEN** the system builds one client for each provider, and the two clients authenticate as two different applications

#### Scenario: One provider in two calls

- **WHEN** two callers use the same provider
- **THEN** the system builds the client one time, and the second call uses the same client

### Requirement: The operations of the provider client

The system SHALL give five operations behind one port. Every operation takes the credentials of a provider as its first parameter:

1. List the repositories that the installation of the provider can reach.
2. List the branches of one repository.
3. Resolve a reference — a branch, a tag or a commit — into its head commit.
4. Download the source of a repository at a reference, as a gzipped tarball.
5. Verify that GitHub accepts the credentials, and read the permissions of the application.

The system SHALL identify a repository by a number. The first two operations answer an HTTP request under the path of the provider. The next two serve the deployment, and they have no endpoint of their own. The last one serves the test of a provider.

The fifth operation SHALL answer whether GitHub accepts the credentials, and the permissions that the application carries. It reports no missing permission of its own: the caller compares the permissions against the needs of the platform.

The port SHALL also give one operation that converts the temporary code of a manifest into the configuration of a new application. That operation takes no credentials of a provider, because the application does not exist yet when it runs. It answers with the identifier of the application, its short name and its private key.

#### Scenario: A caller resolves a reference

- **WHEN** a caller asks for the commit of a repository at a branch, with the credentials of a provider
- **THEN** the system gives the SHA of the commit and the message of the commit

#### Scenario: A caller verifies the credentials

- **WHEN** a caller verifies the credentials of a provider
- **THEN** the system asks GitHub if the application answers, and it gives the answer together with the permissions of the application

#### Scenario: A caller converts a code

- **WHEN** a caller converts the temporary code of a manifest
- **THEN** the system gives the identifier of the application, its short name and its private key

### Requirement: List of the repositories

The system SHALL answer with the repositories of one provider at `GET /api/v1/providers/:providerId/repositories`.

Each repository holds the number, the full name, the default branch and the state of the visibility.

#### Scenario: The installation can reach repositories

- **WHEN** an authenticated client calls the endpoint with the identifier of an available provider
- **THEN** the system answers `200` with every repository of that provider, across all the pages

#### Scenario: The installation can reach no repository

- **WHEN** an authenticated client calls the endpoint, and the installation of the provider holds no repository
- **THEN** the system answers `200` with an empty list

#### Scenario: The provider does not exist

- **WHEN** a client calls the endpoint with a UUID that matches no provider
- **THEN** the system raises `PROVIDER_NOT_FOUND`, and it answers `404 Not Found`

### Requirement: List of the branches

The system SHALL answer with the branches of one repository at `GET /api/v1/providers/:providerId/repositories/:repositoryId/branches`.

The identifier of the provider must be a UUID, and the identifier of the repository must be a whole number. Each branch holds only the name.

#### Scenario: The repository exists

- **WHEN** a client calls the endpoint with an available provider and the number of a repository that it can reach
- **THEN** the system answers `200` with every branch of that repository, across all the pages

#### Scenario: The identifier is no number

- **WHEN** a client calls the endpoint with a value that is no whole number as the repository
- **THEN** the system answers `400 Bad Request`

### Requirement: The classification of a failure of the provider

The system SHALL translate each failure of the provider into one domain error. The system SHALL classify the failure by the HTTP status that the provider answers:

| Condition                                                       | Domain error                     | HTTP answer               |
|-----------------------------------------------------------------|----------------------------------|---------------------------|
| The status is 404                                               | `PROVIDER_RESOURCE_NOT_FOUND`    | `404 Not Found`           |
| The status is 429, or the status is 403 with an exhausted quota | `PROVIDER_RATE_LIMITED`          | `503 Service Unavailable` |
| The status is 401, or the status is 403 for another reason      | `PROVIDER_AUTHENTICATION_FAILED` | `503 Service Unavailable` |
| The status is 500 or higher                                     | `PROVIDER_UNAVAILABLE`           | `503 Service Unavailable` |
| The call carries no status, because the network failed          | `PROVIDER_UNAVAILABLE`           | `503 Service Unavailable` |

The system SHALL NOT give the message of the provider to the client. Each domain error carries its own message.

#### Scenario: The repository does not exist, or the installation cannot see it

- **WHEN** the provider answers with the status 404
- **THEN** the system raises `PROVIDER_RESOURCE_NOT_FOUND`, and it answers `404 Not Found`

#### Scenario: The quota of the installation is exhausted

- **WHEN** the provider answers with the status 429, or with the status 403 and the marks of an exhausted quota
- **THEN** the system raises `PROVIDER_RATE_LIMITED`, and it answers `503 Service Unavailable`

#### Scenario: The credentials are not correct

- **WHEN** the provider answers with the status 401
- **THEN** the system raises `PROVIDER_AUTHENTICATION_FAILED`, and it answers `503 Service Unavailable`

#### Scenario: The provider has a failure of its own

- **WHEN** the provider answers with a status of 500 or higher
- **THEN** the system raises `PROVIDER_UNAVAILABLE`, and it answers `503 Service Unavailable`

#### Scenario: The provider is not reachable

- **WHEN** the network fails, and the call carries no HTTP status
- **THEN** the system raises `PROVIDER_UNAVAILABLE`, and it answers `503 Service Unavailable`

### Requirement: The measure of the calls to the provider

The system SHALL record the duration of each call to the provider, and it SHALL record if the call failed.

#### Scenario: A call ends

- **WHEN** a call to the provider succeeds or fails
- **THEN** the system records the duration of that call, and it marks the failure if one occurred

### Requirement: The four states of the screen

The system SHALL show one of four states:

1. **The reading runs.** The screen says "Loading providers…".
2. **The reading failed.** The screen shows a red panel that says "Could not load providers. Is the backend running?".
3. **The list holds providers.** The screen shows one card per provider, in a grid.
4. **The list is empty.** The screen shows a panel with a dotted border, and a button that opens the screen of the creation.

#### Scenario: The list is empty

- **WHEN** the API answers with an empty list
- **THEN** the screen shows the panel "No providers yet." with the button "Register your first provider"

#### Scenario: The reading fails

- **WHEN** the call of the API fails
- **THEN** the screen shows the red panel with the question about the backend

### Requirement: The content of a card

Each card SHALL show the name, a mark of the type, the identifier of the application, the fingerprint of the key and the state of the connection.

The card SHALL NOT show the private key, because the API never gives it.

#### Scenario: The user reads a card

- **WHEN** the screen shows a provider
- **THEN** the card holds the name, the mark of the type, the identifier of the application and the fingerprint of the key, and it holds no private key

### Requirement: The test of the connection

Each card SHALL give an action that tests the credentials of the provider.

While the test runs, the card shows the state of the work. After the test, the card shows one of three results: the success, the failure of the credentials, or the App that lacks a permission.

For the third result, the card SHALL name each missing permission, so that the operator can grant it on GitHub.

#### Scenario: The test succeeds

- **WHEN** the user tests a provider, and the API answers with the outcome `ok`
- **THEN** the card shows a state of success

#### Scenario: The test fails

- **WHEN** the API answers with the outcome `unauthorized`
- **THEN** the card shows a state of failure

#### Scenario: A permission is missing

- **WHEN** the API answers with the outcome `incomplete` and a list of missing permissions
- **THEN** the card shows a state of warning, and it names each missing permission

### Requirement: The removal of a provider

The system SHALL ask the user to confirm before it removes a provider.

The question carries the title "Delete provider?" and a message that names the provider between marks of quotation, and that says that the action has no way back.

After a removal that succeeds, the system SHALL show a message of success, and it SHALL read the list again.

#### Scenario: The removal succeeds

- **WHEN** the user confirms the removal, and the API answers `204`
- **THEN** the system shows the message "Provider deleted", and it reads the list again

#### Scenario: The provider still holds services

- **WHEN** the API refuses the removal, because a service still points at the provider
- **THEN** the system shows a message of failure that says that services still use the provider

### Requirement: The fields of the form

The system SHALL show the form of the manual registration only after the user chooses the path of the App of the operator.

Above the fields, the form SHALL state the permissions that the App must carry:

| Permission | Level |
|------------|-------|
| `contents` | Read  |
| `metadata` | Read  |

The form SHALL show four controls:

| Control                            | Kind                                  | Obligatory |
|------------------------------------|---------------------------------------|------------|
| The name                           | A field of text                       | Yes        |
| The identifier of the application  | A field of text                       | Yes        |
| The identifier of the installation | A field of text                       | Yes        |
| The private key                    | A field of several lines, for the PEM | Yes        |

The form SHALL ask for no permission. The user grants a permission on GitHub, and the form only states which ones the platform needs.

The type of the provider is `github_app`, and the form does not ask for it, because it is the one kind of today.

#### Scenario: The user opens the screen

- **WHEN** a signed-in user opens `/providers/add`, and the user chooses the path of the App of the operator
- **THEN** the system shows the statement of the two permissions and the four empty controls

### Requirement: The check before the call

The system SHALL remove the empty places at the two ends of each field of text.

If one obligatory field is empty after that, the system SHALL do nothing. It sends no call.

#### Scenario: A field is empty

- **WHEN** the user sends the form, and one of the four fields is empty
- **THEN** the system does nothing, and the user stays on the screen

### Requirement: The end of the registration

If the API accepts the provider, the system SHALL show a message of success that names it, and it SHALL open the list at `/providers`.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the same screen. The form SHALL keep the values that the user gave, including the PEM.

#### Scenario: The registration succeeds

- **WHEN** the API answers with the new provider
- **THEN** the system shows the message "Provider created" with the name, and it opens `/providers`

#### Scenario: The name is already in use

- **WHEN** the API refuses the creation, because another provider carries that name
- **THEN** the system shows a message of failure, and the user stays on the screen with the values in the form

#### Scenario: The user has no role of administrator

- **WHEN** the API answers `403 Forbidden`, because the user carries the role `user`
- **THEN** the system shows a message that says that the action needs an administrator

### Requirement: The load of the provider

The system SHALL read the provider of the path, and it SHALL put the name, the identifier of the application and the identifier of the installation into the form.

The field of the private key SHALL stay empty, because the API never gives the key.

#### Scenario: The provider arrives

- **WHEN** the API answers with the provider
- **THEN** the system fills the three fields of text, and it leaves the field of the key empty

### Requirement: An empty key keeps the stored key

The help text of the field of the key SHALL state that an empty field keeps the stored key.

If the user leaves the field empty, the system SHALL send no key, and the API keeps the stored one. If the user gives a key, the system SHALL send it, and the API replaces the stored one.

#### Scenario: The user leaves the key empty

- **WHEN** the user sends the form with an empty field of the key
- **THEN** the system sends the other fields only, and the stored key stays

#### Scenario: The user gives a new key

- **WHEN** the user writes a new PEM into the field of the key
- **THEN** the system sends the new key, and the API replaces the stored one

### Requirement: The end of the change

If the API accepts the change, the system SHALL show a message of success that names the provider, and it SHALL open the list at `/providers`.

If the API refuses, the system SHALL show a message of failure, and it SHALL let the user try again on the same screen.

#### Scenario: The change succeeds

- **WHEN** the API answers with the changed provider
- **THEN** the system shows the message "Provider updated" with the name, and it opens `/providers`

#### Scenario: The change fails

- **WHEN** the API refuses the change
- **THEN** the system shows a message of failure, and the user stays on the screen

### Requirement: The tab "Provider" configures the source

The tab `provider` SHALL give a form with four controls, in this order:

| Control                      | Kind                                                          |
|------------------------------|---------------------------------------------------------------|
| The provider                 | A list of the registered providers                            |
| The repository               | A list of the repositories that the chosen provider can reach |
| The branch                   | A list of the branches of the chosen repository               |
| The path of the compose file | A field of text                                               |

The system SHALL show `docker-compose.yml` as the path if the service holds no path.

The system SHALL keep the control of the repository blocked until the user chooses a provider, because a repository has no meaning without an account.

When the user changes the provider, the system SHALL clear the repository and the branch. A repository identifier is global at GitHub, and the access to it is not. Thus a pair that stays behind would name a repository that the new provider cannot reach.

When the user changes the repository, the system SHALL clear the branch, because a branch of the old repository does not exist in the new one.

If no provider exists, the system SHALL show an empty state with a link to `/providers/add`, in place of the form.

The system SHALL send the name of the service together with the four values, because the API asks for the name in every change.

#### Scenario: The user chooses a provider

- **WHEN** the user chooses a provider
- **THEN** the system reads the repositories of that provider, it opens the control of the repository, and it clears the repository and the branch of the form

#### Scenario: The user chooses a repository

- **WHEN** the user chooses a repository
- **THEN** the system reads the branches of that repository, and it clears the branch of the form

#### Scenario: No provider exists

- **WHEN** the installation holds no provider
- **THEN** the tab shows an empty state with a link to `/providers/add`, and it shows no form

#### Scenario: The change succeeds

- **WHEN** the API accepts the four values
- **THEN** the system writes the answer into the screen, and it shows the message "Provider settings saved"

#### Scenario: The change fails

- **WHEN** the API refuses the change
- **THEN** the system shows the message "Could not save provider settings", and the form keeps the values

### Requirement: The permissions that a provider needs

The system SHALL need exactly two permissions of a GitHub App:

| Permission | Level |
|------------|-------|
| `contents` | Read  |
| `metadata` | Read  |

The system SHALL treat a level above the named one as enough, because GitHub orders the levels `read`, `write` and `admin`. An App that carries `contents: write` therefore satisfies the need of `contents: read`.

#### Scenario: The App carries a higher level

- **WHEN** the system checks an App that carries `contents: write`
- **THEN** the system counts the permission `contents` as present

#### Scenario: The App carries no level

- **WHEN** the system checks an App whose answer names no level for `contents`
- **THEN** the system counts the permission `contents` as missing

### Requirement: The two paths of the registration

The system SHALL offer two paths at `/providers/add`, and the user SHALL choose one before any field appears:

1. **The App of GitPaaS.** The system creates a GitHub App from a manifest that it writes itself.
2. **The App of the operator.** The system registers a GitHub App that the operator already owns.

The second path is the path of today. The first path is new.

#### Scenario: The user reaches the screen of the creation

- **WHEN** a signed-in user opens `/providers/add`
- **THEN** the screen shows the two paths, and it shows no field of either path

#### Scenario: The user chooses the path of the operator

- **WHEN** the user chooses the path of the App of the operator
- **THEN** the screen shows the form of the manual registration

### Requirement: The start of a registration

The system SHALL start a registration at `POST /api/v1/providers/registrations`.

The body carries the name of the provider and the owner of the App. The owner is `personal` or `organization`. An owner `organization` carries the login of that organization, and an owner `personal` carries none.

The system SHALL refuse a name that another provider already carries, before it writes anything.

The system SHALL answer with the state of the registration, the manifest and the address of GitHub that the browser must reach. The address depends on the owner:

| Owner          | Address                                                      |
|----------------|--------------------------------------------------------------|
| `personal`     | `https://github.com/settings/apps/new`                       |
| `organization` | `https://github.com/organizations/{login}/settings/apps/new` |

The system SHALL NOT check that the operator administers the named organization. GitHub refuses the registration itself when the operator holds no right on it.

#### Scenario: The operator starts a registration

- **WHEN** an administrator starts a registration with a free name
- **THEN** the system writes a pending registration, and it answers with the state, the manifest and the address of GitHub

#### Scenario: The name is already in use

- **WHEN** an administrator starts a registration with a name that another provider carries
- **THEN** the system raises `PROVIDER_NAME_TAKEN`, it answers `409 Conflict`, and it writes no pending registration

#### Scenario: The owner is an organization

- **WHEN** the body names the owner `organization` with the login `acme`
- **THEN** the address of the answer is `https://github.com/organizations/acme/settings/apps/new`

#### Scenario: The login of the organization is absent

- **WHEN** the body names the owner `organization`, and it carries no login
- **THEN** the system answers `400 Bad Request`, and it writes no pending registration

### Requirement: The manifest that the system writes

The system SHALL write the manifest itself, and the user SHALL change no field of it.

The manifest carries the two permissions of the provider, the name that the operator gave, the address of the return after the creation and the address of the return after the installation. It declares the App as not public.

The manifest SHALL carry no webhook and no event, because a push does not reach the platform through this App.

#### Scenario: The system builds the manifest

- **WHEN** the system answers the start of a registration
- **THEN** the manifest names `contents: read` and `metadata: read`, and it names no webhook and no event

### Requirement: The pending registration

The system SHALL keep one record for each registration that runs. The record holds the state, the owner, the name, the step, the identifier of the application, the short name of the application, the encrypted private key and the date of the end of its life.

The state is a value of 32 random bytes that no other record carries. It names the registration in every later call, and it is the one thing that the returns of GitHub carry back.

The step holds one of two values:

| Step                     | Meaning                                                            |
|--------------------------|--------------------------------------------------------------------|
| `awaiting_creation`      | The operator did not create the App yet. The record holds no key.  |
| `awaiting_installation`  | The App exists. The record holds the identifier and the key.       |

The system SHALL encrypt the private key of a pending registration with the same means as the key of a provider. The system SHALL NOT put that key into the body of any answer.

The life of a record is twelve hours from its creation.

#### Scenario: A client reads a registration

- **WHEN** any answer of the API names a pending registration
- **THEN** the body carries no private key, in any form

### Requirement: The conversion of the code

The system SHALL convert the temporary code of GitHub at `POST /api/v1/providers/registrations/:state/conversion`. The body carries the code.

The system SHALL ask GitHub for the configuration of the new App, and it SHALL write the identifier of the application, the short name and the encrypted private key into the pending registration. The step then holds `awaiting_installation`.

The system SHALL answer with the short name of the App, so that the browser can reach the screen of the installation.

The system SHALL keep the name that the operator gave. If the operator renamed the App on the screen of GitHub, the name of the provider and the name of the App differ, and the system SHALL accept that.

GitHub accepts a code one time only, and it refuses a code that is older than one hour.

#### Scenario: The conversion succeeds

- **WHEN** an administrator sends a code for a pending registration at the step `awaiting_creation`
- **THEN** the system writes the identifier, the short name and the encrypted key, it moves the step to `awaiting_installation`, and it answers with the short name

#### Scenario: The state names no registration

- **WHEN** a client sends a code with a state that no pending registration carries
- **THEN** the system answers `404 Not Found`, and it changes no record

#### Scenario: GitHub refuses the code

- **WHEN** GitHub refuses the code, because it is used or because it is too old
- **THEN** the system answers `400 Bad Request`, and it changes no record

#### Scenario: The registration already passed the conversion

- **WHEN** a client sends a code for a pending registration at the step `awaiting_installation`
- **THEN** the system answers `409 Conflict`, and it changes no record

### Requirement: The end of a registration

The system SHALL end a registration at `POST /api/v1/providers/registrations/:state/completion`. The body carries the identifier of the installation.

The system SHALL write one provider from the pending registration and that identifier, and it SHALL then remove the pending registration. The two acts belong to one transaction: either the provider exists and the pending registration is gone, or neither happened.

The system SHALL answer with the new provider, in the shape that every other read of a provider carries.

#### Scenario: The registration ends

- **WHEN** an administrator ends a registration at the step `awaiting_installation`
- **THEN** the system writes the provider, it removes the pending registration, and it answers `201` with the provider

#### Scenario: The registration did not pass the conversion

- **WHEN** a client ends a registration at the step `awaiting_creation`
- **THEN** the system answers `409 Conflict`, it writes no provider, and it keeps the pending registration

#### Scenario: The name fell to another provider

- **WHEN** another provider took the name between the start and the end of the registration
- **THEN** the system raises `PROVIDER_NAME_TAKEN`, it answers `409 Conflict`, and it writes no provider

### Requirement: The removal of the abandoned registrations

The system SHALL remove each pending registration that passed the date of the end of its life. A scheduled job runs that removal every hour.

The job SHALL remove records only. It SHALL NOT call GitHub, and it SHALL NOT remove the GitHub App. The App belongs to the operator, and the operator removes it.

#### Scenario: A registration passed its date

- **WHEN** the job runs, and a pending registration passed the date of the end of its life
- **THEN** the system removes that record, and it calls GitHub no time

#### Scenario: A registration is still in its life

- **WHEN** the job runs, and a pending registration did not pass its date
- **THEN** the system keeps that record

### Requirement: Only an administrator registers an App

The system SHALL let a user with the role `admin` start, convert and end a registration. The system SHALL refuse those three operations to a user with the role `user`.

#### Scenario: A user without the role starts a registration

- **WHEN** a user with the role `user` starts, converts or ends a registration
- **THEN** the system answers `403 Forbidden`, and it changes no record

### Requirement: The returns of GitHub reach the frontend

The system SHALL name two screens of the frontend as the addresses of the return, and it SHALL name no endpoint of the API.

GitHub sends the browser to those addresses with a navigation of the top level, which carries no token of access. A screen of the frontend holds the token of the user, and it calls the API with that token. Thus every endpoint of the registration stays behind the guard of the roles, and the platform opens no public endpoint.

The first screen receives the code and the state after the creation of the App. The second screen receives the identifier of the installation and the state after the installation.

#### Scenario: GitHub returns after the creation

- **WHEN** GitHub sends the browser back with a code and a state
- **THEN** a screen of the frontend reads the two values, and it calls the conversion with the token of the user

#### Scenario: GitHub returns after the installation

- **WHEN** GitHub sends the browser back with an identifier of an installation and a state
- **THEN** a screen of the frontend reads the two values, it calls the end of the registration, and it opens the list at `/providers`

#### Scenario: The user is not signed in

- **WHEN** GitHub sends the browser back, and the user holds no session
- **THEN** the screen sends the user to the sign-in, and it keeps the address of the return

### Requirement: The screens of the registration report a failure

If a call of the registration fails, the system SHALL show a message of failure that names the step that failed, and it SHALL give the way back to `/providers`.

The system SHALL state that the GitHub App may exist although the registration failed, and that GitPaaS cannot remove it.

#### Scenario: The conversion fails

- **WHEN** the API refuses the conversion
- **THEN** the screen shows a message of failure, it states that the App may exist on GitHub, and it gives a link to `/providers`
