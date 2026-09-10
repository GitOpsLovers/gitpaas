# domains

## Purpose

This capability gives a service its public address. A domain names one host, one compose service of the service, a port and a choice of HTTPS. The reverse proxy of the runtime reads the domains at each deployment and builds the routing from them; it also gets and renews the certificate of Let's Encrypt by itself. This capability gives the record of a domain, and the tab "Domains" of the detail of a service that claims, changes and removes one. A domain also carries an origin: an operator claims one from the tab, or the compose file of the service declares one that a deployment brings into a record (see *The domain the compose file declares*, below).

## A host belongs to one service alone

The system SHALL keep at most one record per host, and it SHALL refuse a host that another service already claims, whether the claim reaches the API from the tab, or reaches the records from the compose file at a deployment.

The record holds the host, the identifier of the service, the compose service it targets, the port, the choice of HTTPS, the state of the certificate and the origin. The system SHALL put the host into small letters before it writes the record, so one host cannot be claimed in two forms.

### Scenario: The host is free

- **WHEN** a client claims a host that no domain holds
- **THEN** the system writes the record, and it answers with the new domain

### Scenario: The host is taken

- **WHEN** a client claims a host that another service already holds
- **THEN** the system raises `DOMAIN_TAKEN`, and it answers `409 Conflict`

### Scenario: The domain does not exist

- **WHEN** a client changes or removes the identifier of a domain that no record holds
- **THEN** the system raises `DOMAIN_NOT_FOUND`, and it answers `404 Not Found`

## The domain the compose file declares

The compose file of a service declares the domain of one of its compose services with the key `x-gitpaas-domain` (see the requirement *The gate of the compose file* of the capability [deployments](./deployments.md) for the shape of that key). The key holds one declaration, or a list of them, so a compose service that listens on several ports carries one host for each port. An empty list declares no domain, and the service brings no record of it. At each deployment, before it builds the routing, the system SHALL bring the records of the domains of the service to the declarations its compose file carries.

The system SHALL create the record of a declared host that holds no record yet, with the origin `compose`. It SHALL update the record of the origin `compose` when the declaration changed. It SHALL delete the record of the origin `compose` whose host left the compose file. It SHALL leave a record of the origin `user` untouched, and it SHALL NOT overwrite it from a declaration that disagrees with it: the value the user saved always wins.

The system SHALL fail the deployment, with the host and the reason in the error, when a declared host already belongs to another service.

### Scenario: A declared host holds no record

- **WHEN** a deployment starts, and the compose file of the service declares a host that no record holds
- **THEN** the system creates the record of that host, with the origin `compose`

### Scenario: A declared host changed since the last deployment

- **WHEN** a deployment starts, and the record of the origin `compose` disagrees with the declaration of the same host
- **THEN** the system updates the record with the declaration, and it keeps the origin `compose`

### Scenario: A declared host left the compose file

- **WHEN** a deployment starts, and a record of the origin `compose` names a host the compose file no longer declares
- **THEN** the system deletes that record

### Scenario: The user already claimed the declared host

- **WHEN** a deployment starts, and the compose file declares a host whose record carries the origin `user`
- **THEN** the system leaves that record untouched, even when the declaration disagrees with it

### Scenario: The declared host belongs to another service

- **WHEN** a deployment starts, and the compose file declares a host that a record of another service already holds
- **THEN** the system fails the deployment, with a message that names the host and the reason, and it starts no stack

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

## The badge "Compose" marks a row of the origin `compose`, and a row with no record gives no removal

The list of the tab unions the records of the table with the host of a declaration the compose file gives and that holds no record yet; such a row carries the identifier `null` (see *The domain the compose file declares*, above). The tab SHALL show a badge "Compose" beside the host of every row whose origin is `compose`, and it SHALL give no action to remove a row of the identifier `null`, because no record exists yet to remove.

When the user saves the form of a row of the identifier `null`, or changes a row whose origin is `compose`, the system SHALL turn the origin of the record into `user`, because the user then chose the value over the declaration.

### Scenario: The row comes from the compose file

- **WHEN** a row of the list carries the origin `compose`
- **THEN** the tab shows the badge "Compose" beside its host

### Scenario: The row holds no record yet

- **WHEN** a row of the list carries the identifier `null`
- **THEN** the tab gives the form to save it, and no action to remove it

### Scenario: The user saves a row of the origin `compose`

- **WHEN** the user saves the form of a row of the identifier `null`, or changes a row whose origin is `compose`
- **THEN** the system writes the record with the origin `user`
