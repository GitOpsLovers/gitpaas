## MODIFIED Requirements

### Requirement: Profile of the current user

The system SHALL answer with the profile of the authenticated user at `GET /api/v1/auth/me`.

The profile SHALL never hold the hash of the password.

The shared contract SHALL declare that profile one time, and it SHALL carry one name. The producer and the
consumer both derive from it. Today the same shape carries three names — one in the domain of the backend,
one in the layer of the UI of the backend, and one in the frontend — and the three do not agree.

The contract SHALL declare the role as one set of values, so the two applications cannot describe it in two
ways.

#### Scenario: An authenticated client asks for the profile

- **WHEN** a client calls `GET /api/v1/auth/me` with a valid access token
- **THEN** the system answers `200` with the identifier, the email, the role, the state and the dates of the
  user, and without the field of the hash of the password

#### Scenario: A shape of an answer names the hash of the password

- **WHEN** a change puts the hash of the password into a shape of an answer of the contract
- **THEN** the review refuses that change, because no shape of an answer may carry a secret
