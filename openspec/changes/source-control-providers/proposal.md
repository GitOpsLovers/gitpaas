## Why

One GitHub App serves the whole installation, and three environment variables carry it: `GITHUB_APP_ID`,
`GITHUB_APP_PRIVATE_KEY` and `GITHUB_APP_INSTALLATION_ID`. This gives three problems.

1. **A fresh installation does not start.** The three variables are obligatory at boot. The installer leaves
   them empty, so the environment validation fails and the backend restarts without end.
2. **One account serves every service.** The port `SourceControl` takes no credential, so no caller can
   choose an account. Two teams with two GitHub organizations cannot use one installation.
3. **The credential lives in the environment.** An operator who adds an account must open a file on the
   server and restart the backend.

After this change, GitPaaS holds no GitHub credential in its environment.

## What Changes

An operator opens a **Providers** section in the frontend, and registers one or more GitHub Apps. Each
provider is a record of the database, with its private key encrypted at rest. When the operator configures
a service, a select field offers the registered providers. The chosen provider gives the credentials that
read the repository, list the branches, resolve the commit and download the archive for every deployment of
that service.

- **New:** the capability `providers` — the record, the encryption, the API and the test of the connection.
- **New:** three screens — the list of the providers, the creation and the change.
- **Changed:** every operation of `source-control` takes the credentials as its first parameter, and the
  adapter keeps one client for each provider instead of one client for the installation.
- **Changed:** a service points at exactly one provider, and the trigger of a deployment loads the
  credentials of that provider.
- **Changed:** the two routes of the repositories move under the provider, because a repository has no
  meaning without an account.
- **Changed:** the write routes of the providers need the role `admin`. The role exists today but no guard
  reads it.
- **Removed:** the three variables `GITHUB_APP_*`. One new variable, `PROVIDERS_ENCRYPTION_KEY`, replaces
  them.

## Capabilities

### New Capabilities

- `providers`: the provider record, the encryption of the private key at rest, the API that manages a
  provider, and the test of the credentials against the source control.
- `web-providers-list`: the screen that lists the providers, at `/providers`.
- `web-provider-add`: the screen that registers a provider, at `/providers/add`.
- `web-provider-edit`: the screen that changes a provider, at `/providers/edit/:id`.

### Modified Capabilities

- `source-control`: every operation takes the credentials of a provider. The adapter keeps one client for
  each provider. The two routes of the repositories move under the provider. The error of the configuration
  names the provider instead of the three environment variables.
- `services`: a service holds the identifier of its provider. The field is obligatory at the creation.
- `deployments`: the trigger loads the credentials of the provider of the service, and it refuses a
  deployment whose provider cannot reach the stored repository.
- `auth`: the role becomes a rule that the system enforces, for the write routes of the providers only.
- `web-service-detail`: the tab "Provider" gains a select of the provider, before the select of the
  repository.

## Impact

**The backend.** A new feature `apps/backend/src/features/providers/`. A new helper
`apps/backend/src/core/infrastructure/crypto/secret-cipher.ts`. A new decorator and a new guard of the role
under `apps/backend/src/features/authentication/ui/`. The controller and the service of `source-control`
go away, because their routes move onto the provider. The two services of the deployments gain a
dependency.

**The database.** Two migrations: `010_providers.sql` adds the table, and `011_services_provider.sql` adds
the column `providerId` to the table `services`, with `ON DELETE RESTRICT`.

**The frontend.** A new feature `apps/frontend/src/app/features/providers/`, three pages, three routes and
one entry of the sidebar.

**The environment.** `PROVIDERS_ENCRYPTION_KEY` enters. The three `GITHUB_APP_*` variables go away, in
`env-validation.config.ts`, in `iac/production/.env.example` and in `scripts/install.sh`.

**The upgrade.** An installation that already holds services must register a provider before it applies
migration 011. A one-time script reads the three variables of the `.env` file and creates that provider.
