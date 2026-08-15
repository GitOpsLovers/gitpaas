## MODIFIED Requirements

### Requirement: The tab "Provider" configures the source

The tab `provider` SHALL give a form with four controls, in this order:

| Control | Kind |
|---|---|
| The provider | A list of the registered providers |
| The repository | A list of the repositories that the chosen provider can reach |
| The branch | A list of the branches of the chosen repository |
| The path of the compose file | A field of text |

The system SHALL show `docker-compose.yml` as the path if the service holds no path.

The system SHALL keep the control of the repository blocked until the user chooses a provider, because a
repository has no meaning without an account.

When the user changes the provider, the system SHALL clear the repository and the branch. A repository
identifier is global at the source control, and the access to it is not. Thus a pair that stays behind would
name a repository that the new provider cannot reach.

When the user changes the repository, the system SHALL clear the branch, because a branch of the old
repository does not exist in the new one.

If no provider exists, the system SHALL show an empty state with a link to `/source-control/add`, in place
of the form.

The system SHALL send the name of the service together with the four values, because the API asks for the
name in every change.

#### Scenario: The user chooses a provider

- **WHEN** the user chooses a provider
- **THEN** the system reads the repositories of that provider, it opens the control of the repository, and
  it clears the repository and the branch of the form

#### Scenario: The user chooses a repository

- **WHEN** the user chooses a repository
- **THEN** the system reads the branches of that repository, and it clears the branch of the form

#### Scenario: No provider exists

- **WHEN** the installation holds no provider
- **THEN** the tab shows an empty state with a link to `/source-control/add`, and it shows no form

#### Scenario: The change succeeds

- **WHEN** the API accepts the four values
- **THEN** the system writes the answer into the screen, and it shows the message "Provider settings saved"

#### Scenario: The change fails

- **WHEN** the API refuses the change
- **THEN** the system shows the message "Could not save provider settings", and the form keeps the values
