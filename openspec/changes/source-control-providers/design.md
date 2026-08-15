## Context

`GithubSourceControlAdapter` builds one Octokit client from three environment variables, it keeps that
client in a private field, and it uses it again for every call. The port `SourceControl` takes no credential
argument. Two services consume the port: `DeploymentsService` and `DeploymentRunnerService`.
`DbServiceEntity` stores `repositoryId` as text, and no account owns it.

The rule that a namespace applies to its projects is the model for the new rule: a namespace that still
holds projects cannot be removed. Migration `009_namespaces.sql` gives the shape of that constraint.

**One correction of the original plan.** The plan of `docs/roadmap/` puts the select of the provider in
`features/services/ui/components/service-form/`. That component holds only the name of the service today.
The fields of the source control live in `features/services/ui/components/service-provider/`, which the tab
"Provider" of the detail of a service shows. The work therefore lands in the tab, and not in the form. The
capability `web-service-detail` records the behavior of that tab.

## Goals / Non-Goals

**Goals:**

- An operator registers a GitHub App from the browser, and no credential enters the environment.
- One installation serves several GitHub accounts at the same time.
- A fresh installation starts with no credential of the source control present.
- The private key never leaves the server, and no answer of the API carries it.

**Non-Goals:**

- A second kind of provider. The column `type` prepares GitLab and Bitbucket, and this change adds neither.
- A full system of the roles. The guard of the role covers the write routes of the providers only. Every
  other endpoint keeps the rule of today, where each authenticated user can do each action.
- A provider that several services share by a group. A service points at exactly one provider.
- A rotation of the key of the encryption. A lost key means that the operator registers the Apps again.

## Decisions

**1. A provider is a record of the feature `source-control`, and not a file of the configuration.**
A record can be created, changed and removed from the browser. A file cannot. The feature
`source-control` owns that record, with the same division `domain` / `application` / `infrastructure` /
`ui` that `namespaces` uses. One feature therefore owns the credentials, the port and the adapter.

**Alternative that the change does not take:** a second feature `providers` beside `source-control`. The
first commits of this change built it, and this design removes it. Two features for one idea split the port
from the credentials that the port needs, they give the operator two names for one thing, and they force
`source-control` to import the repository of another feature for every call.

**2. The private key is encrypted at rest, with AES-256-GCM.**
A new helper of `core` encrypts it under one new variable, `PROVIDERS_ENCRYPTION_KEY` (32 random bytes,
hex). This trades three secrets for one, and that one secret never leaves the server. The helper is a pair
of exported functions, and not a class, because it holds no state.

**3. The API never gives a private key.**
The read model gives the name, the type, the identifier of the application, the identifier of the
installation and a short fingerprint — the first eight characters of the SHA-256 of the key. The path of
the change accepts a new key, and it keeps the stored key when the field is empty.

**4. The port carries the credentials, and the adapter keeps one client for each provider.**
Every method of `SourceControl` takes the credentials first. The adapter replaces its one field `client`
with a `Map<string, Octokit>` that the identifier of the provider keys. The reuse of today stays, one
client for each account.

**Alternative that the change does not take:** a factory that builds a client for each call. It is simpler,
and it loses the reuse of the connection and the token of the installation, which Octokit caches.

**5. A service points at exactly one provider.**
`services."providerId"` is `NOT NULL` with `ON DELETE RESTRICT`. A provider that still holds services
cannot be removed. This copies the rule of the namespaces.

**Alternative that the change does not take:** a provider by default at the level of the installation, with
`providerId` allowed to be empty. It keeps the upgrade simpler, and it brings back the hidden global
account that this change removes.

**6. The field `type` prepares the next kind of provider.**
The column holds `github_app` today. GitLab becomes a new value and a new adapter, with no change of the
schema.

**7. Every route of the capability shares the prefix `/source-control`.**
The controller answers `/source-control` for the records, and
`GET /source-control/:providerId/repositories` for the repositories of one record. A repository identifier
is global at GitHub, but the access to it is not. The path must therefore name the account. The old route
`GET /source-control/repositories` goes away, because no released client depends on it.

The name of the table stays `providers`, the variable stays `PROVIDERS_ENCRYPTION_KEY`, and the codes of the
errors stay `PROVIDER_*`. The word "provider" names one record, and the word "source control" names the
capability. Thus migration 010, which the repository already holds, needs no change.

**8. The guard of the role enters with this change, and it covers the providers only.**
The management of a provider is an action of an administrator. The project holds the role and the enum
`UserRole` today, and no guard reads them. The change adds `@Roles(...)` and a `RolesGuard`, and it applies
them to the write routes of the records of `source-control`. Every other endpoint keeps the rule of today.
This keeps the change of the behavior small and visible.

## Risks / Trade-offs

**1. A leaked private key.** The key is the strongest credential of the product. The mitigations are the
encryption at rest, the read model without the key, and the routes that only an administrator can call. A
test must assert the absence of the key in every body of an answer.

**2. A lost key of the encryption.** If `PROVIDERS_ENCRYPTION_KEY` is lost, every stored key is unreadable.
The recovery is to register the Apps again. The summary of the installer must state this.

**3. A repository identifier that crosses accounts.** A repository identifier is global at GitHub, and the
access is not. The screen must clear the repository when the provider changes, and the backend must refuse
a deployment whose provider cannot reach the stored repository, with a message that names the two.

**4. The order of the migrations.** Migration 011 makes `providerId` obligatory. An installation that holds
services and no provider fails that migration. The upgrade must create the provider first. The release notes
must state the sequence.

**5. A larger signature of the port.** Every method of `SourceControl` takes one more parameter. The change
is mechanical, and the compiler finds each place that calls it.

**6. The merge touches code that three commits already delivered.** The feature `providers` exists in the
repository, and the move carries every file of it into `source-control`. The move keeps the name of each
file, so the compiler names each caller that must change. The tests move with their subjects, and the suite
proves the result.

**7. The guard of the role changes an assumption.** Today each authenticated user can do each action, and
the documentation says so. After this change that sentence has one exception. A user with the role `user`
meets a refusal for the first time.
