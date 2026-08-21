## MODIFIED Requirements

### Requirement: The provider record

The system SHALL keep one record per provider. A provider is a GitHub App that an operator registers, whose private key the system encrypts at rest, and which a service selects to reach its repository.

The record holds the identifier, the name, the type, the identifier of the application, the identifier of the installation, the encrypted private key, the date of the creation and the date of the last change.

The identifier is a UUID that the database generates. The type holds `github_app`, which is the one value of today. The system SHALL manage the records under the path `/api/v1/providers`.

**The answer carries the two dates.** The system gives the date of the creation and the date of the last change in every answer that holds a provider. JSON carries no date, so each one is a text of the ISO form on the wire, and the domain of the backend keeps its own kind of date behind the layer of the UI.

The shared contract SHALL declare the shape of a provider one time, and the two applications SHALL both derive from it. Today the frontend declares its own shape, and that shape names neither of the two dates. Thus the API sends two fields that no consumer knows, and no compiler reports it.

#### Scenario: The system gives a provider

- **WHEN** a client reads a provider
- **THEN** the system gives the identifier, the name, the type, the identifier of the application, the identifier of the installation, the fingerprint of the key, the date of the creation and the date of the last change

#### Scenario: A client reads a date of a provider

- **WHEN** a client reads the date of the creation or the date of the last change of a provider
- **THEN** the value is a text of the ISO form, and the type of the contract declares a text

#### Scenario: The contract omits a field that the answer holds

- **WHEN** a change adds a field to the answer of a provider, and it does not add that field to the shared contract
- **THEN** the check of the types fails, because the producer and the consumer read one declaration

### Requirement: The API never gives a private key

The system SHALL NOT put the private key into the body of any answer.

Instead of the key, the read model carries a fingerprint: the first eight characters of the SHA-256 of the PEM. The fingerprint lets the operator recognize a key, and it gives no way back to the key.

**The shared contract SHALL hold no shape of an answer that declares the private key.** The credentials of a provider are a shape between the layers of the backend, and no contract of the wire. They stay inside the backend, and they enter the package of the contracts in no form.

This is the same rule that keeps the hash of the password out of every shape of the profile of a user.

#### Scenario: A client reads a provider

- **WHEN** a client reads one provider, or the list of the providers
- **THEN** no body of the answer holds the private key, in any form

#### Scenario: A shape of an answer names the private key

- **WHEN** a change puts the private key of a provider into a shape of an answer of the contract
- **THEN** the review refuses that change, because no shape of an answer may carry a secret

## ADDED Requirements

### Requirement: The kind of a provider carries one set of values

The kind of a provider SHALL come from one set of values that the shared contract declares. The producer and the consumer both derive from that set.

Today the backend declares the kind as an enumeration of TypeScript, and the frontend declares it as a text. The two agree on the one value of today, `github_app`, and nothing keeps them equal. A second kind of provider would enter the backend, and the frontend would still compile.

The domain of the backend MAY keep its own enumeration where the code reads better with it. In that case the layer of the UI converts, in the same way that it converts a date.

#### Scenario: A client reads the kind of a provider

- **WHEN** a client reads a provider
- **THEN** the kind holds one value of the set that the contract declares

#### Scenario: A kind enters the set

- **WHEN** a change adds a second kind of provider to the set of the contract
- **THEN** every consumer that decides on the kind and does not handle the new value fails to compile
