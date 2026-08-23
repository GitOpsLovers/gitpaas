# The environment of a service

## Why

A service needs a configuration that the repository does not hold. A database address, a key of an
API and a password all differ between the machine of the developer and the server, and none of them
belongs in the repository. An operator who needs one today writes it into the compose file and
commits it, which puts a secret into the history of Git.

## What must change

A service holds a set of variables. Each variable carries a name and a value, and it is marked as a
plain value or as a secret. The system encrypts a secret at rest, and it never gives that value back
to a client.

- A deployment injects the variables into the stack when it starts it.
- A tab `configuration` of the detail of a service manages those variables.
- The answer of the API gives the value of a plain variable. For a secret it gives the fact that a
  value is set, and never the value.

## The state today

The backend holds the record of the variables and the encryption at rest. The commit `94b7741` and
the commit `8e963f7` delivered them. Three parts stay open:

1. **The injection at the deployment.** The run must read the variables of the service, decrypt the
   secrets, and give the values to the executor. A secret that cannot be decrypted fails the run
   with a message that names the variable, and it starts no stack.
2. **The tab of the variables.** The detail of a service needs the tab `configuration`, between
   `provider` and `deployments`. A secret shows that it holds a value, and its field stays empty on
   a change.
3. **The documentation.** The installer must state that a lost `SECRETS_ENCRYPTION_KEY` makes every
   stored secret unreadable. The release notes must state that a compose file of a repository can
   print its own values into the log, and that the platform cannot stop it.

## Out of scope

- A variable that reaches the build. A variable reaches the containers alone.
- A store of the secrets outside the database.

## Impact

The backend feature `service-environment`, the executor of the deployments, and the detail of a
service in the frontend. No migration stays open; the table of the variables exists.
