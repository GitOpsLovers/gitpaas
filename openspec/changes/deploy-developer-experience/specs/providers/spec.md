## ADDED Requirements

### Requirement: The state of the webhook in the tab "Provider"

The tab `provider` SHALL show whether the webhook of the service is on, and it SHALL give the action that
turns it on and the action that turns it off.

The tab SHALL NOT show the secret of the webhook, because the API never gives it.

#### Scenario: The webhook is off

- **WHEN** the user opens the tab, and the webhook of the service is off
- **THEN** the tab says that a push does not deploy, and it gives the action that turns the webhook on

#### Scenario: The operator turns the webhook on

- **WHEN** the operator turns the webhook on
- **THEN** the tab says that a push to the deployment branch now deploys the service

#### Scenario: The service is not deployable

- **WHEN** the service holds no repository or no deployment branch
- **THEN** the action that turns the webhook on is not available
