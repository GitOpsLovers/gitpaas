## MODIFIED Requirements

### Requirement: The private key is encrypted at rest

The system SHALL encrypt the private key with AES-256-GCM before it writes the record. The key of the encryption comes from the environment variable `SECRETS_ENCRYPTION_KEY`, which holds 32 random bytes in the hexadecimal form. That variable serves every secret of the server, and not the providers alone.

The system SHALL NOT write the private key in clear text, in the database or in the log.

#### Scenario: The system writes a provider

- **WHEN** a client creates a provider with a private key
- **THEN** the system writes the encrypted form of that key, and no clear copy of it

#### Scenario: The variable of the encryption is absent

- **WHEN** the application starts, and `SECRETS_ENCRYPTION_KEY` is absent
- **THEN** the validation of the environment fails, and the application does not start
