## 1. Phase 1 — The origin of a deployment

Agent: implementer
Paths: apps/backend/src/features/deployments/, iac/production/migrations/

- [ ] 1.1 Add the origin to the domain model of a deployment and to its entity, with the values `user`, `push` and `repeat`.
- [ ] 1.2 Write the origin `user` in the use case that a person triggers.
- [ ] 1.3 Create the migration that adds the column, and fill every row that exists with `user`.
- [ ] 1.4 Update the specs of the trigger for the origin.

## 2. Phase 2 — The webhook

Agent: implementer
Paths: apps/backend/src/features/webhooks/, apps/backend/src/features/services/, iac/production/migrations/

- [ ] 2.1 Create the feature `apps/backend/src/features/webhooks/`, with the division that the other features use.
- [ ] 2.2 Add the secret of the webhook to the service, encrypted at rest with the helper of `core/infrastructure/crypto/`.
- [ ] 2.3 Create the migration that adds the secret, empty.
- [ ] 2.4 Add to the port of the source control the operations that register a webhook on a repository and remove it.
- [ ] 2.5 Implement those two operations in the adapter of the source control.
- [ ] 2.6 Create the public endpoint that the source control calls, marked with the decorator of a public route.
- [ ] 2.7 Check the signature of the call against the secret of the service, before anything else, and refuse a call that does not agree with `401`.
- [ ] 2.8 Answer the call before the decision, so the source control does not disable the webhook.
- [ ] 2.9 Start a deployment with the origin `push` only when the push touches the deployment branch of the service.
- [ ] 2.10 Do nothing and report no failure for a push to another branch.
- [ ] 2.11 Create the use cases that turn the webhook on and off, which generate the secret and register or remove the webhook.
- [ ] 2.12 Give no secret in any answer of the API.
- [ ] 2.13 Create the specs of the check of the signature, of the decision of the branch, and of the endpoint.

## 3. Phase 3 — The repeat of a deployment

Agent: implementer
Paths: apps/backend/src/features/deployments/

- [ ] 3.1 Create the use case that writes a new deployment from the commit of an earlier one, with the origin `repeat`.
- [ ] 3.2 Take the commit of the earlier record, and do not resolve the head of the branch.
- [ ] 3.3 Refuse the operation when the earlier record holds no commit, with a message that says so.
- [ ] 3.4 Change no earlier record, and remove no deployment that came after.
- [ ] 3.5 Create the endpoint of the repeat, and its spec.

## 4. Phase 4 — The strategy that builds

Agent: implementer
Paths: apps/backend/src/features/deployments/

- [ ] 4.1 Create the port `BuildStrategy`, which decides how a repository becomes a running stack.
- [ ] 4.2 Move the behavior of today behind that port, as the strategy of the compose file, and verify that no service that runs now changes its behavior.
- [ ] 4.3 **Decision needed.** Choose the tool that recognizes the stack of a repository. Ask the user to install it; an agent installs no dependency.
- [ ] 4.4 Create the strategy that recognizes the stack, behind the same port.
- [ ] 4.5 Write, as the first line of the output of that strategy, which stack it recognized and which rule matched.
- [ ] 4.6 Fail the deployment with a clear message when no strategy can build the repository.
- [ ] 4.7 Create the specs of the choice of the strategy and of each strategy.

## 5. Phase 5 — The frontend

Agent: implementer
Paths: apps/frontend/src/app/features/deployments/, apps/frontend/src/app/features/providers/

- [ ] 5.1 Show the origin of each entry of the history of the deployments.
- [ ] 5.2 Add the action that deploys the commit of an entry again, and hide it on an entry that holds no commit.
- [ ] 5.3 Show the state of the webhook in the tab of the provider, with the actions that turn it on and off.
- [ ] 5.4 Hide the action that turns the webhook on when the service is not deployable.
- [ ] 5.5 Create the specs of the tab, one per scenario of the deltas of `deployments` and of `providers`.

## 6. Phase 6 — The gaps that this change leaves

Agent: documenter
Paths: docs/backend-architecture/
This is the last phase.

- [ ] 6.1 Record that a deployment that a push starts and that fails notifies nobody. A notification is a separate change.
- [ ] 6.2 Add to the plan of the rollback the step that removes the registrations of the webhooks, so a repository does not call an address that answers `404`.
- [ ] 6.3 Add the webhook and the strategy of the build to `docs/backend-architecture/key-flows.md`.
