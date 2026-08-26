# domains

## Purpose

This capability gives a service its public address. A domain names one host, one compose service of the service, a port and a choice of HTTPS. The reverse proxy of the runtime reads the domains at each deployment and builds the routing from them; it also gets and renews the certificate of Let's Encrypt by itself. This capability gives the record of a domain, and the tab "Domains" of the detail of a service that claims, changes and removes one.

## A host belongs to one service alone

The system SHALL keep one record per domain, and it SHALL refuse a host that another service already claims.

The record holds the host, the identifier of the service, the compose service it targets, the port, the choice of HTTPS, and the state of the certificate. The system SHALL put the host into small letters before it writes the record, so one host cannot be claimed in two forms.

### Scenario: The host is free

- **WHEN** a client claims a host that no domain holds
- **THEN** the system writes the record, and it answers with the new domain

### Scenario: The host is taken

- **WHEN** a client claims a host that another service already holds
- **THEN** the system raises `DOMAIN_TAKEN`, and it answers `409 Conflict`

### Scenario: The domain does not exist

- **WHEN** a client changes or removes the identifier of a domain that no record holds
- **THEN** the system raises `DOMAIN_NOT_FOUND`, and it answers `404 Not Found`

## The rule of the host and of the port

The system SHALL refuse a host that is not a domain name, and a port outside the range `1`-`65535`.

A host holds letters, numbers, the hyphen and the point; it carries at least two labels, and no label starts or ends with the hyphen. The shared contract enforces this rule with a pattern, so the API and the screen refuse the same host.

### Scenario: The host breaks the pattern

- **WHEN** a client claims or changes a domain with a host that does not match the pattern
- **THEN** the system answers `400 Bad Request`

### Scenario: The port is outside the range

- **WHEN** a client claims or changes a domain with a port under `1` or over `65535`
- **THEN** the system answers `400 Bad Request`

## The routing travels in the labels of the stack

The system SHALL build the routing of a service from its domains at each deployment, and a claim or a change of a domain SHALL NOT touch the running stack by itself.

The proxy reads the routing from the labels of the compose service that a domain names. The system stamps those labels at the run of the next deployment, so a new domain, or a change of one, answers only after that deployment runs. The system SHALL remove the routing of a service when the service goes away.

### Scenario: A domain is new

- **WHEN** an operator claims a domain, and no deployment runs afterwards
- **THEN** the host answers with the labels of the deployment before the claim, and it answers with the labels of the domain after the next deployment

### Scenario: A service is removed

- **WHEN** an operator removes a service that holds a domain
- **THEN** the system removes the routing of that service together with its containers and its networks

## The certificate of HTTPS

The system SHALL get and renew the certificate of a domain of HTTPS by itself, through the resolver of Let's Encrypt of the proxy, and it SHALL give no certificate to a domain of plain HTTP.

The state of the certificate is one of `none`, `pending`, `ready` and `failed`. A domain of plain HTTP always carries `none`. A domain of HTTPS starts at `pending`, and the system reads the store of the proxy to find whether the certificate arrived, so it can move the state to `ready`. The certificate arrives some minutes after the domain answers, because the proxy asks Let's Encrypt only once the routing is live.

The local environment gives HTTP alone: its proxy declares no resolver of Let's Encrypt and no entry point `websecure`, because a name of `*.localhost` never resolves outside the machine that runs it. A domain of HTTPS still gets its routing there, but it never answers: its router of plain HTTP only redirects the visitor to the secure one, and no entry point serves that redirect. So a domain answers on the local machine only when it is claimed with HTTPS off, and its certificate stays `pending` forever.

### Scenario: A domain of HTTPS is new

- **WHEN** an operator claims a domain with HTTPS on
- **THEN** the system writes the record with the state `pending`

### Scenario: The certificate arrived

- **WHEN** a client reads the domains of a service, and the store of the proxy holds a certificate of one of them
- **THEN** the system answers with the state `ready` for that domain

### Scenario: A domain of plain HTTP

- **WHEN** an operator claims a domain with HTTPS off
- **THEN** the system writes the record with the state `none`, and it asks the proxy for no certificate

## The tab "Domains"

The tab `domains` of the detail of a service SHALL list its domains, with the compose service, the port, the choice of HTTPS and the state of the certificate of each one, and it SHALL give the form that claims, changes or removes one.

The form offers the compose services of the last deployment of the service as the only choices of the field that names the target, because a domain that names a service the recipe lost cannot route. The tab tells the operator that a domain answers after the next deployment, and that the certificate of HTTPS arrives some minutes later.

### Scenario: The user opens the tab

- **WHEN** the user opens the tab `domains`
- **THEN** the system shows the domains of the service, or the state of the reading, and the form to claim one

### Scenario: The claim is refused because the host is taken

- **WHEN** the API answers `409` to a claim or to a change
- **THEN** the system shows the message that the host belongs to another service, and the user stays on the form
