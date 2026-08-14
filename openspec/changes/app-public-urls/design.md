## Context

See proposal.md — Why.

The deployment already drives the local Docker daemon through its socket, and it starts a compose stack per
service. The name of the compose project comes from the slug of the service, and every resource of the
platform carries a label that marks it. A proxy that reads the labels of the Docker daemon therefore needs
no configuration file of its own for a service: the deployment writes the labels, and the proxy sees them.

The single-server model holds. GitPaaS and the applications it deploys share one machine and one daemon.

## Goals / Non-Goals

**Goals:**

- A deployed service answers on its domain, over HTTPS, with a certificate that renews itself.
- The operator gives a domain in the browser, and edits no file on the server.
- The choice of the proxy stays behind a port, so a later change can replace it.

**Non-Goals:**

- A load balancer across several servers. The model stays one server.
- A certificate that the operator uploads. This change uses Let's Encrypt only. A later change can add one.
- A path that routes to a service (`example.com/api`). One domain routes to one service.
- A redirection of `www`, and a domain that carries a wildcard. Both are later changes.

## Decisions

**1. Traefik, and not Caddy.**

Traefik reads the labels of the Docker daemon, which is exactly the surface that a deployment already
writes. A service gets its route when the executor starts the stack, with no file to write and no signal to
send. Caddy needs a file of the configuration, or its API, and that adds a second path of the state that can
go out of step with the labels.

**Alternative that the change does not take:** Caddy with its API. Its configuration of the TLS is simpler
to read, and it makes the deployment write the route two times — once as a label for the daemon, and once
through the API.

**2. The route lives on the labels of the stack, and the record of the domain is the source.**

The table of the domains is what the operator edits, and what survives a restart. The labels are the form
that the proxy reads. The executor writes the labels from the records when it starts the stack.

Thus a domain that an operator adds takes effect at the next deployment of that service, and not
immediately. `tasks.md` carries an item that makes this visible in the screen, because an operator who adds
a domain and sees no effect will call it a defect.

**3. A domain is unique across the installation.**

Two services cannot claim one domain. The database holds the rule, and the API answers `409` on the second
claim. A proxy that receives two routes for one domain picks one of them, and the operator cannot see which.

**4. The proxy is a port with one adapter.**

`ReverseProxy` holds the operations that the platform needs: write the route of a service, remove it, and
report the state of the certificate. The adapter of Traefik implements it. A later change that replaces the
proxy writes a second adapter.

**5. GitPaaS moves behind the proxy.**

The control plane answers on a domain, and not on the port `8080`. This makes the platform reachable over
HTTPS, and it frees the port. The installer must ask for that domain, and the upgrade of an installation
that answers on a port must keep answering until the operator gives one.

## Risks / Trade-offs

**The ports `80` and `443` must be free.** → The installer checks them before it starts, and it stops with a
message that names the process that holds them.

**Let's Encrypt limits the number of certificates for one domain.** A loop that asks again for a certificate
that fails will reach that limit and lock the domain for a week. → The adapter uses the staging service of
Let's Encrypt until a domain answers a first check, and the state of the certificate is a field of the
record that the screen shows.

**A domain that points at no server, or at the wrong one.** The operator adds a domain before the DNS points
at the machine, and the certificate fails. → The record holds the state, the screen shows it, and the
message names the check that failed. This is the most common failure of a first installation, and it must
read as a state and not as a defect.

**The upgrade moves the address of the control plane.** → The change keeps the port until the operator gives
a domain. An installation that upgrades and changes nothing keeps working.

**The socket of the daemon reaches the proxy too.** Traefik reads the labels through the same socket, which
gives it the equivalent of root on the host. → The security cost is the one that
`docs/infrastructure-architecture.md` already records for the backend. The change adds no new kind of
access, and it adds a second holder of it. The release notes must say so.

## Migration Plan

1. The migration adds the table of the domains. It is empty, so nothing breaks.
2. The stack of the production gains the proxy. An installation that gives no domain keeps answering on its
   port.
3. The operator gives the domain of GitPaaS, and then a domain per service.
4. A rollback removes the proxy from the stack. The services answer on their ports again, and the records of
   the domains stay in the database with no effect.
