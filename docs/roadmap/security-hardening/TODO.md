# The hardening of the security

## Why

GitPaaS drives the Docker daemon of the host through the socket `/var/run/docker.sock`. Whoever reaches
that socket is root on the machine. The platform therefore carries the trust of the whole server, and every
hole in the control plane becomes a hole in the server.

An audit of the three areas found that the platform runs a compose file of a repository with no restriction,
that it gives every authenticated user the same power over every record, and that the installer writes the
secrets of the server into a file that each local user reads. The audit is in [research.md](./research.md).

## What must change

The platform must hold three lines of defence that it does not hold today.

- **The line of the deployment.** A compose file of a repository must not ask for a privilege of the host.
  The system refuses the file that asks for one, and it names the key that it refused.
- **The line of the authorization.** A record belongs to somebody. A user reaches the record that belongs
  to them, and an administrator reaches the operation that changes the server.
- **The line of the secrets.** A secret never reaches a log, a message of an error, or a file that the world
  reads. The environment refuses a key that is too short to protect anything.

The workflow of the project must also prove what it ships: the actions of the pipeline are pinned to a
commit, the images are signed, and a scan runs on each pull request.

## The state today

The audit found 7 findings of a high severity or above, 12 of a medium severity, and 7 in the workflow.
[research.md](./research.md) holds each one with the file, the line and the attack that reaches it.
[plan.md](./plan.md) holds the phases that close them.

## Out of scope

- A multi-tenant platform. The model of the ownership that this change adds separates the users of one
  installation. It does not isolate one customer from another.
- A rootless daemon, and a runtime of the containers other than Docker. The change reduces what the
  socket is asked to do; it does not replace the socket.
- A certificate that the platform issues. The feature [domains](../domains/TODO.md) owns that work.
- An external store of the secrets, such as Vault. The key of the environment stays.

## Impact

The backend features `deployments`, `service-environment`, `authentication`, `projects`, `services`,
`namespaces`, `logs` and `server`. The frontend shell and its store of the tokens. The whole of
`iac/production/`, the script `scripts/install.sh` and the workflows of `.github/`. Two migrations open:
the column of the owner on the records, and the index that reads it.
