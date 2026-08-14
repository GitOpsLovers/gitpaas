## Why

One GitPaaS installation serves one team that trusts each other completely. Every authenticated user sees
every namespace, every project, every service and every deployment, and can change or remove any of them.
Three facts make this concrete:

1. **No resource has an owner.** A namespace, a project, a service and a deployment carry no user.
2. **The role is stored and not enforced.** Every user carries `admin` or `user`, and no guard reads it,
   except for the routes of the providers.
3. **`triggeredBy` always holds the text `system`.** No deployment records who started it, so the history
   cannot answer who deployed what.

An operator who wants to share one server with a second team has no answer today except a second
installation.

## What Changes

A user owns what they create, and the system limits every read and every write to what the user owns.

- **New:** a namespace holds an owner. The ownership goes down to the projects, the services and the
  deployments that live inside it.
- **New:** an administrator manages the users — creates one, deactivates one, and changes a role.
- **Changed:** every list and every read gives only what the user owns. A resource of another user answers
  as a resource that does not exist, and not as a refusal, so the path gives away nothing.
- **Changed:** the role becomes a rule that the system enforces everywhere, and not only on the routes of
  the providers. An administrator sees and manages everything.
- **Changed:** a deployment records the user who triggered it, and the screen shows that user.

**BREAKING** — after this change, a user sees only their own resources. An installation that runs with
several users today shows each of them less than before. The migration gives every resource that exists to
one owner, which `design.md` sets out.

## Capabilities

### Modified Capabilities

- `auth`: the role becomes a rule that the system enforces on every endpoint.
- `users`: an administrator creates, changes and deactivates a user through the API. The rule that no
  endpoint creates a user goes away.
- `namespaces`: a namespace holds an owner, and the list gives only the namespaces of the user.
- `deployments`: the record holds the user who triggered the run, in place of the fixed text `system`.
- `web-service-detail`: the list of the deployments shows the user who triggered each one.

## Impact

**The database.** One migration adds the owner to the namespaces, and it fills every row that exists. A
second migration widens `triggeredBy` from a fixed text into a reference to a user.

**The backend.** Every use case that reads a resource takes the user, and every repository limits its query
by the owner. This touches `namespaces`, `projects`, `services` and `deployments`. A guard of the role,
which the change `source-control-providers` introduces for its own routes, becomes general.

**The frontend.** A section that manages the users, which only an administrator sees. The user who triggered
a deployment appears in the history.

**The upgrade.** An installation that runs today gives every resource to one owner. The operator names that
owner, and the release notes state it clearly, because the choice cannot be undone by the platform.
