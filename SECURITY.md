# Security Policy

GitPaaS runs on a server that belongs to you, and it holds the keys of your
repositories and the passwords of your applications. A hole in GitPaaS is a hole
in your machine, so we treat every report as a priority.

## Report a vulnerability

**Do not open a public issue, and do not open a public pull request.** A public
report tells every operator of GitPaaS about the hole before a fix exists.

Use the private channel of GitHub:

1. Open <https://github.com/GitOpsLovers/gitpaas/security/advisories/new>, or go
   to the tab **Security** of the repository and press **Report a vulnerability**.
2. Describe what you found, the version of GitPaaS that you run, and the steps
   that reproduce it.
3. Add the impact that you expect: what an attacker reads, writes or executes.

The thread of the advisory stays private between you and the maintainers until a
fix is published.

### What happens next

| The step                                | The delay              |
|-----------------------------------------|------------------------|
| We acknowledge your report               | 3 days                 |
| We confirm or reject the vulnerability   | 10 days                |
| We publish a fix and a security advisory | As soon as it is ready |

We credit you in the advisory, unless you ask us not to.

## Supported versions

The fix lands on the latest released version alone. Update to the latest release
before you report, and before you ask for support.

## The signature of the images

The workflow of the release publishes `ghcr.io/gitopslovers/gitpaas-backend` and
`ghcr.io/gitopslovers/gitpaas-frontend`, and it signs each one with the keyless
mode of [cosign](https://docs.sigstore.dev/). There is no private key: the
workflow proves its identity with the OIDC token of GitHub Actions, Fulcio issues
a short-lived certificate, and Rekor records the signature in a public log.

Verify an image before you run it, with the version that you pull in place of
`<version>`:

```bash
cosign verify \
  --certificate-identity 'https://github.com/GitOpsLovers/gitpaas/.github/workflows/release.yml@refs/heads/main' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/gitopslovers/gitpaas-backend:<version>
```

The identity ends with the ref that ran the workflow, and the release runs from
`main`. If you verify an older image that was released from another ref, match
the workflow alone:

```bash
cosign verify \
  --certificate-identity-regexp '^https://github\.com/GitOpsLovers/gitpaas/\.github/workflows/release\.yml@' \
  --certificate-oidc-issuer 'https://token.actions.githubusercontent.com' \
  ghcr.io/gitopslovers/gitpaas-frontend:<version>
```

The command prints the claims of the certificate and exits with `0` when the
signature holds. **A non-zero exit means that the image is not the one that this
repository published — do not run it.**

## The scan of the supply chain

The workflow `.github/workflows/security-scan.yml` runs every week. It reads
`pnpm-lock.yaml` for a vulnerable dependency and it pulls the published images
for a vulnerable package of the system. The findings land in the tab **Security**
of the repository.

Every `uses:` of every workflow is pinned to a commit, so a tag that moves cannot
change what the pipeline of the release executes.

## Out of scope

- A vulnerability of a third-party dependency that already holds a public
  advisory. Open a normal issue instead, so we can bump the version.
- A finding of an automated scanner with no path of exploitation in GitPaaS.
- An attack that needs the credentials of the host or physical access to the
  server that runs GitPaaS.
