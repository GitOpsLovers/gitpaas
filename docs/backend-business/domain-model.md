# Domain model

A **namespace** is a group of **projects**. A **project** is a group of **services**. A service is a unit that you can deploy. It points to a Git repository, to a compose file path and to a deployment branch. A **deployment** is one attempt to start the Docker Compose stack of a service on the server. A **user** is an operator who authenticates to use the API.

## The provider

A **provider** is a named account, of the kind `github_app` today, that the operator registers from the browser. A service reaches its repository through exactly one provider. The record holds the name (unique across the installation), the type, the identifier of the GitHub App, the identifier of the installation, and the private key.

**The encrypted key.** The private key never sits in the table as clear text. The API seals it with AES-256-GCM under the variable `PROVIDERS_ENCRYPTION_KEY` (32 random bytes, hex) before it writes the row, and it opens it again only to build a client for a call to GitHub. A change of a provider that gives no new key keeps the sealed key of the row, so the operator can update the name or the identifiers without pasting the PEM again. A lost `PROVIDERS_ENCRYPTION_KEY` makes every stored key unreadable, and the recovery is to register the GitHub Apps again.

**The fingerprint.** The read model of a provider never carries the private key, not even sealed. It carries a `keyFingerprint` instead — the first eight characters of the SHA-256 hash of the PEM — so an operator can tell two providers apart, and confirm that a change replaced the intended key, with no risk of exposing the secret.

**The four errors.** The domain declares one error for each way a request on a provider can fail:

- `ProviderNotFoundError` — the identified provider does not exist.
- `ProviderNameTakenError` — another provider already carries the requested name.
- `ProviderInUseError` — a service still points at the provider, so the deletion is refused.
- `ProviderCredentialsInvalidError` — the provider refuses the stored credentials.

**The binding of a service to a provider.** The table `services` carries an optional `providerId`, which points at one row of `providers` with `ON DELETE RESTRICT`: a provider that a service still names cannot be removed. A service becomes deployable only once it names a provider, a repository and a branch together, in the tab "Provider" of its detail page. A deployment loads the credentials of the named provider before it reads the repository, and it refuses to start when the service names no provider, with the same error it gives when the service names no repository or no branch.
