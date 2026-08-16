## ADDED Requirements

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

## MODIFIED Requirements

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
