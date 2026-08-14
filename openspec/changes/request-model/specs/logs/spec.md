## ADDED Requirements

### Requirement: The events of the stream come from one shared schema

The system SHALL declare the three kinds of the event of the stream — the line, the end and the error — in
the shared package of the contracts, and in one place only.

The producer and the consumer SHALL both derive from that declaration. The consumer SHALL parse each message
against the schema, and it SHALL NOT assert the shape with a cast.

Thus a fourth kind of event, or a change of an existing one, cannot enter the producer without a failure of
the compilation in the consumer that does not handle it.

#### Scenario: The consumer reads a message

- **WHEN** the client receives one message of the stream
- **THEN** the client parses the content against the schema of the package, and it gives the parsed event to
  its subscriber

#### Scenario: The message does not agree with the schema

- **WHEN** the content of a message agrees with no kind of the union
- **THEN** the parse fails, and the client reports that failure instead of giving an event whose shape is
  wrong

#### Scenario: A kind of event enters the union

- **WHEN** a change adds a fourth kind to the schema
- **THEN** every consumer that does not handle the new kind fails to compile
