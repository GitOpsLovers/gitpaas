# Plan — the environment of a service

The feature is stated in [TODO.md](./TODO.md). This file holds the decisions and the phases.
The backend record and the encryption already landed, so the phases below start at the injection.

## The context

See [TODO.md](./TODO.md) — Why.

The executor of the deployments extracts the archive of the repository and runs the compose stack on the
local daemon. The compose file of the repository is the one source of the configuration today.

The change `source-control-providers` introduces a helper of the encryption under
`core/infrastructure/crypto/`, with its key in `PROVIDERS_ENCRYPTION_KEY`. This change needs the same
operation for a different kind of secret.

## The goals

**Goals:**

- An operator sets a value in the browser, and the next deployment carries it into the containers.
- A secret never leaves the server, except inside a container that the operator owns.
- A variable that is not a secret stays readable, so the operator can check what a service runs with.

**Non-Goals:**

- A variable that several services share. Each variable belongs to one service. A group of shared values is
  a later change.
- A version of the values, and a way back to an earlier set. The record holds the value of today.
- A file that a service mounts. This change carries a name and a value, and not a file.
- A value that differs per environment, because a service belongs to one project on one server.

## The decisions

**1. One table, and a mark that says if a value is a secret.**

A plain value and a secret differ in two ways only: the value of a secret is encrypted at rest, and no
answer carries it. Two tables would repeat the name, the service and the order for no gain.

**Alternative that the change does not take:** two tables, one for the variables and one for the secrets. It
reads cleanly, and it makes every read join two tables and every screen merge two lists.

**2. The encryption uses the helper and the key of the providers.**

One key of the encryption for the server is easier to keep than two, and the risk is the same: whoever holds
the key reads both. The variable therefore loses its name of the providers. It becomes
`SECRETS_ENCRYPTION_KEY`, and the change of the providers keeps reading it.

**If the change `source-control-providers` has not landed**, this change creates the helper. The two changes
must not create it two times, and the second to land uses the one that exists.

**3. The API gives the value of a plain variable, and never the value of a secret.**

The answer carries a field that says that a secret holds a value. Thus the screen shows that the value is
set, and it shows a field that is empty. A change that leaves that field empty keeps the stored value, which
is the rule that the providers already use for their private key.

**4. The injection happens at the start of the stack, and not at the build.**

A value that the build needs would enter the image, and an image can be read. The variables reach the
containers at the moment when the stack starts. A value that a build needs is out of scope, and `tasks.md`
records that limit so that it surfaces in the screen instead of failing quietly.

**5. A name follows the rule of an environment variable.**

Capital letters, numbers and the low line, and it does not start with a number. The system refuses another
name, because a shell cannot read it.

## The risks

**A secret in a line of the log.** The executor prints the output of the compose run, and a compose file
that prints its own environment would put a secret into the archive of the logs. → The system cannot stop a
repository from printing its own values. The release notes state the limit. The system itself never prints a
value.

**A lost key of the encryption.** Every stored secret becomes unreadable. → The same risk that the providers
carry, and the same answer: the operator sets the values again. The summary of the installer states it one
time, for the two kinds of secret.

**A value that only the build needs.** An operator sets it, the build does not see it, and the failure reads
as a defect of the platform. → The tab says that a value reaches the containers when the stack starts, and
not the build.

**The feature touches the same tab rule as the feature `domains`.** The two features both add a tab to the
detail of a service. → Whichever lands second reads `docs/business/services.md` before it writes, and it
adds its tab beside the tab that the first one wrote, instead of replacing the rule.

## The migration

1. The migration adds the table. It is empty, so no service changes its behavior.
2. An operator sets the values of a service, and the next deployment carries them.
3. A rollback removes the injection. The containers start with the values of the compose file only, as they
   do today, and the records stay in the database with no effect.

## The rules that this feature adds

This section states the behavior that the feature must carry when it lands. `tester` derives
one test from one scenario. In the last phase, `documenter` moves each rule below into the page
of `docs/business/` that owns its capability.

## The capability `service-environment`

### Purpose

This capability holds the environment of a service: the variables that its containers read,
and the secrets among them, which the system encrypts at rest and never gives back to a client.

### The variable record

The system SHALL keep one record per variable of a service. The record holds the identifier, the identifier
of the service, the name, the value and the mark that says if the value is a secret.

The value of a secret is encrypted at rest. The value of a plain variable is not.

#### Scenario: The system gives a plain variable

- **WHEN** a client reads a variable that is no secret
- **THEN** the system gives the name and the value

#### Scenario: The system gives a secret

- **WHEN** a client reads a variable that is a secret
- **THEN** the system gives the name, and a mark that says that a value is set, and it gives no value

### The name of a variable

The system SHALL accept only a name that a shell can read: capital letters, numbers and the low line, and
it does not start with a number.

The name is unique inside one service. Two services can hold the same name.

#### Scenario: The name is correct

- **WHEN** an operator sets a variable whose name follows the rule
- **THEN** the system writes the record

#### Scenario: The name breaks the rule

- **WHEN** an operator sets a name that holds another character, or that starts with a number
- **THEN** the system answers `400 Bad Request`

#### Scenario: The name is already in use in that service

- **WHEN** an operator sets a name that the same service already holds
- **THEN** the system raises `VARIABLE_NAME_TAKEN`, and it answers `409 Conflict`

### A secret is encrypted at rest

The system SHALL encrypt the value of a secret before it writes the record, with the same helper and the
same key of the environment that the other secrets of the server use.

The system SHALL NOT write the value of a secret in clear text, in the database or in the log.

#### Scenario: An operator sets a secret

- **WHEN** an operator sets a variable and marks it as a secret
- **THEN** the system writes the encrypted form of the value, and no clear copy of it

#### Scenario: The key of the encryption is absent

- **WHEN** the application starts, and the variable of the environment that holds the key is absent
- **THEN** the validation of the environment fails, and the application does not start

### A change with an empty value keeps the stored secret

The system SHALL keep the stored value when a change of a secret carries no value, or carries an empty
value.

Thus an operator renames a secret, or changes another variable, without the value at hand.

#### Scenario: The change carries no value

- **WHEN** an operator changes a secret, and the body carries no value
- **THEN** the system writes the other fields, and it keeps the stored value

#### Scenario: The change carries a new value

- **WHEN** an operator changes a secret, and the body carries a new value
- **THEN** the system encrypts the new value, and it replaces the stored one

### The variables reach the containers when the stack starts

The system SHALL give the variables of a service to the compose run that starts its stack.

The variables reach the containers, and they do not reach the build of an image. A value that only a build
needs is outside this capability.

#### Scenario: The service holds variables

- **WHEN** a deployment of the service starts its stack
- **THEN** every variable of the service, plain or secret, is in the environment of the containers

#### Scenario: The service holds no variable

- **WHEN** the service holds no variable
- **THEN** the stack starts with the values of its compose file only

#### Scenario: A value that the build needs

- **WHEN** an operator sets a variable that only the build of an image reads
- **THEN** the build does not receive it, and the screen states that a variable reaches the containers and
  not the build

### The removal of a variable

The system SHALL remove a variable at the request of the operator. The change takes effect at the next
deployment of the service.

#### Scenario: The operator removes a variable

- **WHEN** an operator removes a variable of a service
- **THEN** the system removes the record, and the next deployment starts the stack without that value

#### Scenario: The service goes away

- **WHEN** an operator removes a service that holds variables
- **THEN** the system removes the variables of that service

## The capability `deployments`

### The steps of the background run

The system SHALL do these steps for each run task:

1. Set the status of the deployment to `running`.
2. Get the archive of the repository at the selected commit from the source control.
3. Read the variables of the service, and decrypt the secrets among them.
4. Run the Docker executor. It extracts the archive, it builds the local services, it pulls the images of
   the registry, it stops the previous stack, and it starts the new stack with those variables in the
   environment of the containers.
5. Set the status to `success` or to `failed`.

The runner SHALL NOT keep the output itself. It SHALL send each line of the executor to the write port of
the logs, and it SHALL call the completion of that port with the terminal status.

The runner SHALL NOT write the value of a secret into the log.

#### Scenario: The executor emits a line

- **WHEN** the Docker executor emits one line of output
- **THEN** the runner sends that line to the write port of the logs

#### Scenario: The run ends

- **WHEN** the run reaches a terminal status
- **THEN** the runner calls the completion of the write port with `success` or with `failed`

#### Scenario: The run fails

- **WHEN** a step of the run raises an error
- **THEN** the runner writes one more line that holds the message of the error, and then it calls the
  completion with `failed`

#### Scenario: The service holds variables

- **WHEN** the service holds one variable or more
- **THEN** the containers of the new stack read those values in their environment

#### Scenario: A secret cannot be decrypted

- **WHEN** the system cannot decrypt a secret of the service, because the key of the encryption changed
- **THEN** the run fails with a message that names the variable, and it starts no stack with a value that is
  missing

#### Scenario: The provider went away

- **WHEN** the runner cannot load the credentials of the provider of the service
- **THEN** the run fails with a message that names the provider, and the deployment gets the status `failed`

## The capability `providers`

### The private key is encrypted at rest

The system SHALL encrypt the private key with AES-256-GCM before it writes the record. The key of the encryption comes from the environment variable `SECRETS_ENCRYPTION_KEY`, which holds 32 random bytes in the hexadecimal form. That variable serves every secret of the server, and not the providers alone.

The system SHALL NOT write the private key in clear text, in the database or in the log.

#### Scenario: The system writes a provider

- **WHEN** a client creates a provider with a private key
- **THEN** the system writes the encrypted form of that key, and no clear copy of it

#### Scenario: The variable of the encryption is absent

- **WHEN** the application starts, and `SECRETS_ENCRYPTION_KEY` is absent
- **THEN** the validation of the environment fails, and the application does not start

## The capability `services`

### The six tabs of the screen

The system SHALL show seven tabs, in this order: `general`, `provider`, `configuration`, `deployments`,
`containers`, `network` and `logs`.

The path holds the tab. A path that names no tab opens `general`. A path that names an unknown tab also
shows `general`.

When the user chooses a tab, the system SHALL open the path of that tab. Thus the address of the browser
always names the tab that the screen shows.

#### Scenario: The path names no tab

- **WHEN** the user opens the service without a tab in the path
- **THEN** the system opens the path of the tab `general`

#### Scenario: The path names an unknown tab

- **WHEN** the path holds a word that no tab carries
- **THEN** the system shows the tab `general`

#### Scenario: The user chooses a tab

- **WHEN** the user chooses a tab
- **THEN** the system opens the path of that tab, and the screen shows it

### The tab "Configuration" manages the variables

The tab `configuration` SHALL list the variables of the service, and it SHALL give the actions that set, change
and remove one.

Each line holds the name, the mark that says if the value is a secret, and the value. For a secret the tab
SHALL show that a value is set, and it SHALL NOT show the value.

The tab SHALL state that a change takes effect at the next deployment, and that a variable reaches the
containers and not the build of an image. Both sentences prevent a reading of a delay or of a limit as a
defect.

#### Scenario: The service holds variables

- **WHEN** the user opens the tab, and the service holds variables
- **THEN** the tab lists each one with its name, and it shows the value of a plain variable

#### Scenario: A variable is a secret

- **WHEN** the tab shows a variable that is a secret
- **THEN** the line says that a value is set, and it shows no value

#### Scenario: The operator changes a secret and leaves the value empty

- **WHEN** the operator changes a secret, and leaves the field of the value empty
- **THEN** the system keeps the stored value

#### Scenario: The service holds no variable

- **WHEN** the service holds no variable
- **THEN** the tab shows an empty state, and an action that sets the first variable

#### Scenario: The name breaks the rule

- **WHEN** the operator sets a name that a shell cannot read
- **THEN** the tab says which rule the name breaks, and it sets no variable

## The phases

### Phase 1 — The injection at the deployment

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/

- [ ] 1.1 Read the variables of the service in the run of the deployment, and decrypt the secrets among them.
- [ ] 1.2 Give the values to the executor, so the compose run puts them into the environment of the containers.
- [ ] 1.3 Fail the run with a message that names the variable when a secret cannot be decrypted, and start no stack with a value that is missing.
- [ ] 1.4 Verify that no value of a secret reaches the write port of the logs.
- [ ] 1.5 Update the specs of the run for a service with variables, for one without them, and for a secret that cannot be decrypted.

### Phase 2 — The tab of the variables

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/services/, apps/frontend/src/app/pages/services/

- [ ] 2.1 Create the model and the repository of the API of the variables in the frontend.
- [ ] 2.2 Add the tab `configuration`, with the label "Configuration", to the detail of a service, between `provider` and `deployments`.
- [ ] 2.3 List each variable with its name, and show the value of a plain variable only.
- [ ] 2.4 Show that a secret holds a value, and keep its field empty on a change.
- [ ] 2.5 Give the actions that set, change and remove a variable.
- [ ] 2.6 State that a change takes effect at the next deployment, and that a variable reaches the containers and not the build.
- [ ] 2.7 Show which rule a name breaks, when the API refuses it.
- [ ] 2.8 Create the specs of the tab, one per rule that this plan adds to the behavior of a service.

### Phase 3 — The documentation and the release

**Agent:** documenter
**Paths:** docs/architecture/backend/, docs/business/, docs/architecture/infrastructure/, scripts/install.sh
**This is the last phase.**

- [ ] 3.1 State in the summary of the installer that a lost `SECRETS_ENCRYPTION_KEY` makes every stored secret unreadable.
- [ ] 3.2 State in the release notes that a compose file of a repository can print its own values into the log, and that the platform cannot stop it.
- [ ] 3.3 Add the mechanism of the variables of a service to `docs/architecture/backend/key-flows.md`.
- [ ] 3.4 Rename `PROVIDERS_ENCRYPTION_KEY` to `SECRETS_ENCRYPTION_KEY` in `docs/architecture/backend/key-flows.md`, in `docs/architecture/infrastructure/conventions.md` and in `docs/architecture/infrastructure/installation.md`.
- [ ] 3.5 Write `docs/business/service-environment.md` with the rules of a variable, and add its line to `docs/business.md`.
- [ ] 3.6 Add the tab of the configuration to the rules of `docs/business/services.md`.
- [ ] 3.7 Delete `docs/roadmap/service-environment/`, and remove its line from `docs/roadmap.md`.
