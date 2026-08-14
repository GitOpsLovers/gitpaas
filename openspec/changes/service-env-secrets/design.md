## Context

See proposal.md — Why.

The executor of the deployments extracts the archive of the repository and runs the compose stack on the
local daemon. The compose file of the repository is the one source of the configuration today.

The change `source-control-providers` introduces a helper of the encryption under
`core/infrastructure/crypto/`, with its key in `PROVIDERS_ENCRYPTION_KEY`. This change needs the same
operation for a different kind of secret.

## Goals / Non-Goals

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

## Decisions

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

## Risks / Trade-offs

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

**The change touches the same tab requirement as `app-public-urls`.** The two changes both add a tab to the
detail of a service. → Whichever lands second re-syncs its delta against the main specification that the
first one wrote. `openspec validate` refuses a modified requirement that drops a scenario, so the conflict
appears as an error and not as a silent loss.

## Migration Plan

1. The migration adds the table. It is empty, so no service changes its behavior.
2. An operator sets the values of a service, and the next deployment carries them.
3. A rollback removes the injection. The containers start with the values of the compose file only, as they
   do today, and the records stay in the database with no effect.
