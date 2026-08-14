## Purpose

This capability gives a public address to a deployed service. It holds the domains that an operator claims,
it keeps the state of the certificate of each one, and it gives the routing that the reverse proxy reads.

## ADDED Requirements

### Requirement: The domain record

The system SHALL keep one record per domain. The record holds the identifier, the name of the domain, the
identifier of the service, the state of the certificate, and the dates of the creation and of the last
change.

The state of the certificate is `pending`, `issued` or `failed`.

#### Scenario: The system gives a domain

- **WHEN** a client reads a domain
- **THEN** the system gives the identifier, the name, the identifier of the service and the state of the
  certificate

### Requirement: A domain belongs to one service

The system SHALL refuse a domain that another service already claims. A domain is unique across the whole
installation.

A service can hold several domains. A domain cannot hold several services.

#### Scenario: The domain is free

- **WHEN** an operator claims a domain that no service holds
- **THEN** the system writes the record, and it answers `201`

#### Scenario: Another service holds the domain

- **WHEN** an operator claims a domain that another service already holds
- **THEN** the system raises `DOMAIN_TAKEN`, and it answers `409 Conflict`

#### Scenario: The service holds a second domain

- **WHEN** an operator claims a second domain for one service
- **THEN** the system writes the record, and the service answers on the two domains

### Requirement: The name of a domain is checked

The system SHALL accept only a name that has the form of a domain. The system SHALL put the name into small
letters before it writes the record, so two operators cannot claim the same domain in two forms.

#### Scenario: The name is not a domain

- **WHEN** an operator claims a value that has no form of a domain
- **THEN** the system answers `400 Bad Request`

#### Scenario: The name carries capital letters

- **WHEN** an operator claims a name that carries capital letters
- **THEN** the system writes the name in small letters

### Requirement: The routing takes effect at the next deployment

The system SHALL write the routing of a service when a deployment of that service starts its stack.

A domain that an operator adds therefore takes effect at the next deployment of the service, and not at the
moment of the claim. The system SHALL show this in the screen, so an operator does not read the delay as a
failure.

#### Scenario: The operator adds a domain

- **WHEN** an operator claims a domain for a service that already runs
- **THEN** the system writes the record, and it says that the domain answers after the next deployment

#### Scenario: The deployment starts the stack

- **WHEN** a deployment of the service starts its stack
- **THEN** the system writes the routing of every domain of that service, and the service answers on each
  one

### Requirement: The certificate

The system SHALL get a certificate for each domain, and it SHALL renew that certificate with no action of
the operator.

The system SHALL keep the state of the certificate on the record, and it SHALL report the reason when the
certificate fails. The most common reason is a name of a domain whose DNS does not point at the server.

#### Scenario: The certificate arrives

- **WHEN** the proxy gets a certificate for a domain
- **THEN** the state of that domain becomes `issued`, and the service answers over HTTPS

#### Scenario: The DNS does not point at the server

- **WHEN** the check of the domain fails, because its DNS points at another address
- **THEN** the state becomes `failed`, and the record holds a reason that names the check that failed

#### Scenario: The certificate comes near its end

- **WHEN** a certificate comes near the end of its life
- **THEN** the proxy renews it, and the operator does nothing

### Requirement: The removal of a domain

The system SHALL remove a domain at the request of the operator, and it SHALL remove the routing of that
domain.

#### Scenario: The operator removes a domain

- **WHEN** an operator removes a domain of a service
- **THEN** the system removes the record and the routing, and the domain no longer answers

#### Scenario: The service goes away

- **WHEN** an operator removes a service that holds domains
- **THEN** the system removes the domains of that service and their routing
