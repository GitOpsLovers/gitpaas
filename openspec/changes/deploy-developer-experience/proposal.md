## Why

Deploying with GitPaaS takes more steps than it should, in three places:

1. **Every deployment is manual.** A developer pushes a commit, and then opens the browser and presses a
   button. Every comparable platform deploys on the push.
2. **The repository must carry a Dockerfile or a compose file.** A project that carries neither cannot be
   deployed at all, although its stack is easy to recognize.
3. **There is no way back.** The history of the deployments is complete, and no action deploys a previous
   commit again. After a rollout that fails, the only path back is to revert in Git and push.

## What Changes

- **New:** a push to the deployment branch of a service starts a deployment. The source control calls the
  platform, and the platform checks that the call is genuine.
- **New:** a repository that carries no Dockerfile and no compose file is built by a rule that recognizes
  its stack.
- **New:** an action deploys a previous commit again, from the history of the service.
- **Changed:** a deployment records how it started — a user, a push, or a repeat of an earlier one.

## Capabilities

### New Capabilities

- `webhooks`: the call that the source control makes on a push, the check that the call is genuine, and the
  rule that decides if that push deploys.

### Modified Capabilities

- `deployments`: a deployment records its origin, and an operation deploys a previous commit again.
- `web-service-detail`: the history gives an action that deploys an entry again, and each entry shows its
  origin.

## Impact

**The backend.** A new feature `webhooks`, with a public endpoint that the source control calls. The port of
the source control gains the operations that register a webhook on a repository and remove it. The executor
gains the step that recognizes the stack of a repository that carries no compose file.

**The database.** One migration adds the origin to the deployments. A second holds the secret of the webhook
of each service, encrypted with the helper that the other changes use.

**The frontend.** The history gains the action and the mark of the origin. The tab of the provider gains the
state of the webhook.

**A public endpoint.** The endpoint of the webhook needs no access token, because the source control has
none. It carries its own check instead, which `design.md` sets out. This is the first endpoint of the
platform that a caller outside the installation reaches, and it needs the care that goes with that.

**A dependency.** The recognition of a stack needs a tool that does it. The change does not choose one; a
task carries that decision, and the port keeps it replaceable.
