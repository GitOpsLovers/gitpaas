## Why

GitPaaS deploys a compose stack onto the server, and nothing sends traffic to it. No stack runs a proxy,
nothing gives a certificate, and the ports `80` and `443` of the server stay free. An operator who deploys a
service reaches it only by a port of the container, on the address of the server, without TLS.

This is the most important function that a Platform-as-a-Service gives, and it is the one that GitPaaS does
not have. Vercel, Dokploy and Coolify all answer the same sentence: point the platform at a repository, and
the application answers on a domain over HTTPS. Until this change lands, GitPaaS answers only the first half
of it.

## What Changes

A reverse proxy becomes part of the runtime. It holds the ports `80` and `443` of the server, and it sends
each request to the service that owns the domain of that request. It gets and renews the certificates by
itself.

- **New:** a domain belongs to a service. An operator gives a domain or a subdomain to a service, and the
  system routes it.
- **New:** the certificates come from Let's Encrypt, and the proxy renews them with no action of the
  operator.
- **Changed:** a deployment writes the configuration of the routing when it starts the stack, so a service
  answers on its domain as soon as the run ends.
- **Changed:** the detail of a service gains a tab that manages the domains of that service.
- **Changed:** the production stack runs the proxy, and GitPaaS itself answers behind it.

## Capabilities

### New Capabilities

- `domains`: the record of a domain, the rule that one domain belongs to one service, the state of its
  certificate, and the configuration of the routing that a deployment writes.

### Modified Capabilities

- `deployments`: the run writes the configuration of the routing of the service before it starts the stack,
  and it removes that configuration when a service goes away.
- `web-service-detail`: a tab manages the domains of the service.

## Impact

**A new part of the runtime.** The production stack of `iac/production/docker-compose.yml` gains the proxy,
which holds the ports `80` and `443`. GitPaaS itself moves behind it, so the frontend and the API answer on
a domain instead of a port.

**The backend.** A new feature `domains`, with the same division that the other features use. A new port of
the proxy, behind which the adapter of the chosen proxy sits. The executor of the deployments gains a step.

**The database.** One migration adds the table of the domains, with the foreign key to the service and the
rule that a domain is unique across the installation.

**The frontend.** A tab of the domains in the detail of a service, with the state of the certificate.

**The operator.** The installation asks for the domain of GitPaaS itself, and for an email address that
Let's Encrypt needs. The ports `80` and `443` of the server must be free and reachable, which the installer
must check.

**This change decides the proxy.** `design.md` names it, and the port keeps the decision reversible.
