## Why

Registering a provider costs the operator a long trip outside GitPaaS. The operator opens GitHub, creates a GitHub App by hand, chooses the permissions by hand, installs the App, downloads the PEM file, and copies three values into a form. Every step is a chance to grant a wrong permission, and the form gives no hint about which permissions the platform needs.

GitHub registers an App from a manifest. GitPaaS can therefore write the permissions itself, and the operator only presses a button.

## What Changes

- **New:** the screen of the creation offers two paths. One path creates a GitHub App from a manifest that GitPaaS writes. The other path registers an App that the operator already owns.
- **New:** the path of the creation asks the name and the owner of the App, and it then sends the operator to GitHub two times: one time to create the App, and one time to install it.
- **New:** the system keeps one pending registration between the two visits to GitHub, and a scheduled job removes a pending registration that the operator abandons.
- **Changed:** the form of the manual path states the permissions that the App must carry. It asks for no new value.
- **Changed:** the test of the connection reports the permissions that the App does not carry, and no longer answers with a single mark of success.

## Capabilities

### New Capabilities

<!-- None. The registration belongs to the providers capability, which already owns the record, the screens and the client of the provider. -->

### Modified Capabilities

- `providers`: the registration of a GitHub App from a manifest, the pending registration and its removal, the two paths of the screen of the creation, the permissions on the form of the manual path, and the answer of the test of the connection.

## Impact

**The backend.** The feature `providers` gains a pending registration: one entity, one repository, one transformer and three use cases — start, convert and complete. It gains one scheduled job that removes the pending registrations that passed their date. The application registers `ScheduleModule`, which it does not register today. The port of the provider client changes the answer of `verifyCredentials`, so that it carries the permissions of the App.

**The database.** One migration adds the table of the pending registrations. It holds a secret, so it uses the cipher that the provider record already uses.

**The API.** Three new endpoints under `/api/v1/providers/registrations`, all of them for an administrator only. The answer of `POST /api/v1/providers/:id/test` changes its shape. **BREAKING** for a client of that endpoint, and the frontend of this repository is the one client.

**The frontend.** The screen `/providers/add` gains the choice of the path and the card of the owner. Two new routes receive the returns of GitHub, and they carry no session of their own. The card of the provider shows a third state of the test.

**The dependencies.** None. `@nestjs/schedule` and `@octokit/rest` are already in the manifest of the backend.

**Out of scope.** The manifest declares no webhook. The change `deploy-developer-experience` registers a webhook per repository, and this change leaves that design free.
