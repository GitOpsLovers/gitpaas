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

## MODIFIED Requirements

### Requirement: The window of the output of a deployment

When the user views a deployment, the system SHALL open a window that streams the output of that
deployment.

The window SHALL open the stream only while it is open and a deployment is chosen. It SHALL close the
stream when the user closes the window.

The window holds a mark of the status. The mark says `running` until a terminal event arrives, and then it
says `success` or `failed`.

The window SHALL handle the three kinds of the event of the stream:

| Kind | What the window does |
|---|---|
| `line` | Adds the text to the output |
| `end` | Sets the mark of the status to `success` or to `failed`, and ends the stream |
| `error` | Shows the code and the safe message of the failure, and ends the stream |

The window SHALL NOT treat an event of the kind `error` as an event of the end. An event of the error
carries no status, so that treatment leaves the mark of the status without a value and hides the cause from
the user.

The window SHALL keep the view at the last line as the output arrives. The window gives an action that
copies the full output.

#### Scenario: The user opens the output

- **WHEN** the user views a deployment
- **THEN** the system opens the window, it clears the old lines, and it streams the output from the first
  line

#### Scenario: The terminal event arrives

- **WHEN** the stream sends the event of the end
- **THEN** the mark of the status shows `success` or `failed`, and the stream ends

#### Scenario: The stream sends an event of the error

- **WHEN** the stream sends an event of the kind `error`
- **THEN** the window shows the code and the safe message of that event, and the mark of the status does not
  stay without a value

#### Scenario: The user closes the window

- **WHEN** the user closes the window
- **THEN** the system ends the stream

#### Scenario: The copy fails

- **WHEN** the browser refuses the access to the clipboard
- **THEN** the system shows no message of failure, and the window continues to work
