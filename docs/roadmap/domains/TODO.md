# The public address of a service

## Why

GitPaaS deploys a compose stack onto the server, and nothing sends traffic to it. No stack runs a
proxy, nothing gives a certificate, and the ports `80` and `443` of the server stay free. An
operator who deploys a service reaches it only by a port of the container, on the address of the
server, and without TLS.

This is the most important function that a Platform-as-a-Service gives, and GitPaaS does not have
it. Vercel, Dokploy and Coolify all answer the same sentence: point the platform at a repository,
and the application answers on a domain over HTTPS. Until this feature lands, GitPaaS answers only
the first half of that sentence.

## What must change

A reverse proxy becomes part of the runtime. It holds the ports `80` and `443` of the server, and it
sends each request to the service that owns the domain of that request. It gets and it renews the
certificates by itself.

- A domain belongs to one service. An operator gives a domain or a subdomain to a service, and the
  system routes it. One domain is unique across the installation.
- The certificates come from Let's Encrypt, and the proxy renews them with no action of the
  operator.
- A deployment writes the configuration of the routing before it starts the stack, so a service
  answers on its domain as soon as the run ends. It removes that configuration when a service goes
  away.
- The detail of a service gains a tab that manages the domains of that service, with the state of
  the certificate.
- The production stack runs the proxy, and GitPaaS itself answers behind it.

## Out of scope

- A load balancer across several servers. The model stays one server.
- A certificate that the operator uploads.
- A path that routes to a service (`example.com/api`). One domain routes to one service.
- A redirection of `www`, and a domain that carries a wildcard.

## Impact

**The runtime.** `iac/production/docker-compose.yml` gains the proxy, which holds the ports `80` and
`443`. GitPaaS itself moves behind it. The proxy reads the socket of the Docker daemon, which gives
it the equivalent of root on the host; the release notes must state that.

**The backend.** A new feature `domains`, with the same division that the other features use. A new
port of the proxy, behind which the adapter of the chosen proxy sits. The executor of the
deployments gains a step.

**The database.** One migration adds the table of the domains, with the foreign key to the service.

**The operator.** The installer asks for the domain of GitPaaS itself and for the email address that
Let's Encrypt needs. It must check that the ports `80` and `443` are free, and stop with a message
that names the process that holds one.
