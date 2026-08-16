## Context

See proposal.md — Why.

The trigger of a deployment already takes only the identifier of a service, and it calculates every other
value: it reads the service, checks that it is deployable, and resolves the head commit of its branch. A
push therefore needs no new path of the deployment. It needs a caller.

Every endpoint of the platform is private today, except the login, the refresh, the logout and the readiness
probe. The endpoint of the webhook is the first one that a caller outside the installation reaches.

## Goals / Non-Goals

**Goals:**

- A push to the deployment branch of a service deploys that service, with no action of a person.
- A repository with no Dockerfile and no compose file can be deployed.
- An operator returns to a commit that worked, in one action.

**Non-Goals:**

- A deployment for each branch, and a preview environment. One service deploys one branch.
- A deployment from an image of a registry, with no repository. The roadmap names it, and it is a separate
  change.
- A source control other than the one that the platform supports. The change `source-control-providers`
  prepares a second kind of provider, and this change adds none.
- A rollback that returns the data of a database. The change returns the code, and nothing else.

## Decisions

**1. The webhook carries a secret per service, and the platform checks the signature of every call.**

The endpoint is public, so anyone can call it. A secret per service, which the platform generates and
registers with the repository, lets the platform prove that a call came from the source control. A call with
a signature that does not agree is refused and not recorded.

**Alternative that the change does not take:** a check of the address of the caller. The lists of the
addresses of a source control change, and a check of an address proves nothing about the content of a call.

**2. The endpoint answers quickly, and it decides afterwards.**

The source control disables a webhook that answers slowly or fails. The endpoint therefore checks the
signature, answers, and then decides if the push deploys. A push to another branch is a normal case and not
a failure.

**3. A push deploys only when it touches the deployment branch of the service.**

The service names one branch. A push to any other branch is recorded and does nothing.

**4. A repeat of a deployment creates a new record.**

The action takes the commit of the earlier record and starts a new deployment with it. It does not change
the earlier record, and it does not remove the deployments that came after. Thus the history stays a true
account of what ran and when.

**Alternative that the change does not take:** a return that hides the deployments after the chosen one. The
history then no longer says what the server ran, which is the value that the history has.

**5. The recognition of a stack sits behind a port.**

`BuildStrategy` decides how a repository becomes an image. The strategy of today is the compose file that
the repository carries. The new strategy recognizes the stack. A repository that carries a compose file
keeps the strategy of today, so no service that runs now changes its behavior.

The tool that recognizes a stack is not chosen. The port keeps that decision reversible, and a task carries
it.

**6. The origin of a deployment is a field, and not a guess.**

The record says `user`, `push` or `repeat`. This field says how a run started, and not who started it. A
field that names the user would answer a different question, and this change does not add one.

## Risks / Trade-offs

**A public endpoint is a surface for an attacker.** → The signature is checked before anything else. A call
that fails the check is refused, and it writes no record and no log entry that a caller controls.

**A secret of a webhook is a secret.** → It is encrypted at rest, with the helper that the other changes
use, and no answer of the API carries it.

**A push that deploys a commit that does not build.** An automatic deployment fails as loudly as a manual
one, and nobody is watching. → The deployment that fails leaves the previous stack running, which is the
behavior of the executor today. A notification is a separate change, and `tasks.md` records that gap.

**The recognition of a stack guesses.** A wrong guess builds an image that does not run, and the operator
cannot see why. → The strategy states in the log which stack it recognized and which rule matched, as its
first line of output.

**A repeat of an old commit may not build.** The commit is old, and its dependencies moved. → The failure
reads as any other failure of a build, with its log. The change promises the trigger, and not the result.

## Migration Plan

1. The migration adds the origin to the deployments, and it fills every row that exists with `user`, which
   is what they were.
2. The second migration adds the secret of the webhook, empty.
3. An operator turns the webhook on per service. The platform generates the secret and registers it.
4. A rollback removes the endpoint. The webhooks that the repositories hold then call an address that
   answers `404`, and the source control disables them after a number of failures. The task list carries an
   item that removes the registrations before the rollback.
