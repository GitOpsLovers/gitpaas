## Why

A service has no configuration. There is no model, no screen and no path of injection for an environment
variable or for a secret. The only values that reach a container are the ones that the compose file of the
repository writes itself.

Real applications need this. A database address, a key of an API and a password all differ between the
machine of the developer and the server, and none of them belongs in the repository. Today an operator who
needs one must write it into the compose file and commit it, which puts a secret into the history of Git.

## What Changes

A service holds a set of variables. Each variable carries a name and a value, and it is marked as a plain
value or as a secret. The system encrypts a secret at rest and never gives it back to a client.

- **New:** the variables of a service, with the difference between a plain value and a secret.
- **New:** a tab `environment` of the detail of a service manages those variables.
- **Changed:** a deployment injects the variables into the stack when it starts it.
- **Changed:** the answer of the API gives the value of a plain variable, and it gives no value for a
  secret. It gives only the fact that a value is set.

## Capabilities

### New Capabilities

- `service-config`: the variables of a service, the encryption of a secret at rest, and the rule that no
  answer of the API carries the value of a secret.

### Modified Capabilities

- `deployments`: the run injects the variables of the service into the stack that it starts.
- `services`: the tab "Environment" manages the variables of the service.

## Impact

**The backend.** A new feature `service-config`. It uses the helper of the encryption that the change
`source-control-providers` adds under `core/infrastructure/crypto/`, and the same environment variable that
holds its key. If that change has not landed, this one creates the helper instead.

**The database.** One migration adds the table of the variables, with the foreign key to the service and the
removal in cascade.

**The executor.** The step that starts the stack receives the variables and gives them to the compose run.

**The frontend.** The tab "Environment" in the detail of a service, where a secret shows that it is set and
never its value.

**The security.** A secret enters the database encrypted, and it leaves the server only inside a container
of the operator. No answer of the API carries it, and no line of the log prints it.
