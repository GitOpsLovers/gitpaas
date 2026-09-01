# logs

## Purpose

This capability keeps and gives two kinds of output: the output of a deployment, and the output of a container of a service that runs today. It holds the output of a deployment in two tiers — a hot store for the run and a cold archive for the history — and it gives that output as a live stream and as a flat list. It follows the container that runs, and it gives its output the same way, as a history and as a live stream.

## The two tiers of the output

The system SHALL keep the output of a deployment in two tiers:

- The **hot store** is a Redis stream. It holds the output of a deployment while the deployment runs.
- The **cold archive** is a table of the database. It receives the full output one time, at the end of the run.

The system SHALL trim the hot store to the number of lines that the variable `LOGS_MAX_LINES` gives. The system SHALL keep the hot copy for 60 seconds after the archive, so a slow reader can read the last lines.

### Scenario: A line arrives during the run

- **WHEN** the runner appends one line
- **THEN** the system writes that line into the hot store immediately, and it writes nothing into the archive

### Scenario: The run ends

- **WHEN** the runner calls the completion with the terminal status
- **THEN** the system writes the terminal entry into the hot store, it copies the full output into the archive, and it gives the hot copy a life of 60 seconds

## The write port of the output

The system SHALL give one write port with four operations: append one line, complete the stream with the terminal status, read the stream, and purge the stream.

Only the runner writes into the store, and it writes through this port. The capability SHALL give no endpoint that writes a log entry.

### Scenario: A caller looks for a write endpoint

- **WHEN** a client posts to any path of `/api/v1/logs`
- **THEN** the system answers `404 Not Found`, because the controller declares only the two read endpoints

## A failure of the store does not stop the run

The system SHALL catch every failure of the append, of the completion, of the archive and of the purge. It SHALL write the failure into the log of the application, and it SHALL let the deployment continue.

Thus a store that is not available loses the output, but it does not fail the deployment.

### Scenario: The append fails

- **WHEN** the hot store refuses an append
- **THEN** the system writes the failure into the log of the application, and the run continues

### Scenario: The archive fails

- **WHEN** the copy into the archive fails
- **THEN** the system writes the failure into the log of the application, and it does not give the hot copy the short life, so the output stays available

## The order of the output

The system SHALL take the order of the output from the hot store itself. The system SHALL NOT give a number to a line at the moment of the write.

Thus every reader of one deployment reads the same recorded output, in the same order.

### Scenario: Two clients read the same deployment

- **WHEN** two clients read the output of one deployment
- **THEN** the two clients read the same lines, in the same order

## The live stream of the output

The system SHALL stream the output of a deployment at `GET /api/v1/logs/:deploymentId/stream`, with Server-Sent Events. Each message carries one event as JSON.

The stream carries three kinds of event:

- `line` — one line of the output.
- `end` — the terminal event, with the status `success` or `failed`.
- `error` — the stream could not be read. It carries the code `LOG_STREAM_UNAVAILABLE` and a safe message.

The system SHALL start the read at the first entry, and it SHALL continue with the live output on the same cursor. Thus there is no change-over between a replay and a live channel, and there is nothing to remove twice.

The stream needs an access token, as the rest of the API. Thus the client must use a reader of the Server-Sent Events that can send a header of the authentication, because a plain `EventSource` cannot.

### Scenario: A client connects during the run

- **WHEN** a client subscribes while the deployment runs
- **THEN** the system sends the output from the first line, then it continues with the live output, then it sends the `end` event, and then it closes

### Scenario: A client connects after the run

- **WHEN** a client subscribes after the hot copy expired
- **THEN** the system reads the archive, it sends every entry, and then it closes

### Scenario: The store cannot be read

- **WHEN** the read of the stream raises a failure, for example because the hot store is not available
- **THEN** the system sends one `error` event with the code `LOG_STREAM_UNAVAILABLE` and a safe message, and then it closes. The system SHALL NOT break the connection without an event.

### Scenario: The producer stopped without a terminal entry

- **WHEN** the producer wrote no terminal entry, and its lease is no longer held after two idle rounds
- **THEN** the system closes the stream, so the client does not wait for ever

### Scenario: The client goes away

- **WHEN** the client closes the connection
- **THEN** the system stops the read, and it frees the resources of that subscription

### Scenario: The identifier is no UUID

- **WHEN** a client calls the stream with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

## The durable list of the output

The system SHALL answer with the archived entries of a deployment at `GET /api/v1/logs?deploymentId=<uuid>`.

The system SHALL give the entries as a flat list, in the correct order. The parameter `deploymentId` is obligatory, and it must be a UUID.

This endpoint gives no history while a deployment runs, because the system writes the archive one time, at the end of the run. To see the output of a deployment that runs, the client uses the stream.

The answer SHALL separate three cases, so a client can say why a list is empty: the output is available, the run has not ended yet, or the output went away because of its age.

### Scenario: The deployment ended

- **WHEN** a client calls the endpoint for a deployment whose run ended inside the age
- **THEN** the system answers `200` with every archived entry, oldest first

### Scenario: The deployment still runs

- **WHEN** a client calls the endpoint for a deployment that still runs
- **THEN** the system answers `200` with an empty list, and it says that the run has not ended yet

### Scenario: The parameter is absent or is no UUID

- **WHEN** a client calls the endpoint without `deploymentId`, or with a value that is no UUID
- **THEN** the system answers `400 Bad Request`

### Scenario: The output went away

- **WHEN** a client calls the endpoint for a deployment whose run ended before the age
- **THEN** the system answers `200` with an empty list, and it says that the output went away because of its age

## The rate limit of the stream

The system SHALL apply a rate limit of the stream to the endpoint of the Server-Sent Events, and not the default rate limit of the API.

A stream holds one connection open for the length of a run, so the default limit does not apply to it.

### Scenario: A client opens a stream

- **WHEN** a client subscribes to the stream
- **THEN** the system skips the default rate limit, and it applies the limit named `stream`

## The purge of the output

The system SHALL remove the hot copy and the archived entries of a deployment when a caller purges that deployment.

The removal of a deployment and the removal of a service both purge the output. See the capabilities `deployments` and `services`.

### Scenario: A caller purges a deployment

- **WHEN** a caller purges the output of one deployment
- **THEN** the system removes the entries of the hot store, the lease of the producer and the archived rows of that deployment

## An archived row has a life

The system SHALL remove an archived row of a log when that row passes an age that the operator sets.

The age is measured from the creation of the row. The settings of the server carry it, and the operator sets it on the screen. The system holds a value by default, so an installation whose operator changed nothing still removes its old rows.

The system SHALL NOT remove the record of the deployment. The history of what ran stays complete, and only the output goes away.

### Scenario: A row passes the age

- **WHEN** an archived row of a log is older than the age
- **THEN** the system removes that row, and it keeps the record of its deployment

### Scenario: A row is inside the age

- **WHEN** an archived row is not older than the age
- **THEN** the system keeps it

### Scenario: The operator changed no age

- **WHEN** the settings hold no value for the age
- **THEN** the system uses the value by default, and it removes the rows that pass it

### Scenario: The operator changes the age

- **WHEN** the operator writes a new age into the settings of the server
- **THEN** the next run of the task uses the new value, and the server needs no restart

## The removal runs on a schedule and in batches

The system SHALL run the removal on a schedule, and it SHALL remove a bounded number of rows in one statement.

The system SHALL run again until it removes nothing more. Thus the first run of an installation that grew for a long time does not lock the table.

### Scenario: Many rows passed the age

- **WHEN** the task runs, and more rows passed the age than one batch holds
- **THEN** the system removes one batch, and it runs again until no row passes the age

### Scenario: No row passed the age

- **WHEN** the task runs, and no row passed the age
- **THEN** the system removes nothing, and it writes no failure

### Scenario: The removal fails

- **WHEN** the removal raises an error, for example because the database is not available
- **THEN** the system writes the failure into the log of the application, and the next run tries again

## The events of the stream come from one shared schema

The system SHALL declare the three kinds of the event of the stream — the line, the end and the error — in the shared package of the contracts, and in one place only.

The producer and the consumer SHALL both derive from that declaration. The consumer SHALL parse each message against the schema, and it SHALL NOT assert the shape with a cast.

Thus a fourth kind of event, or a change of an existing one, cannot enter the producer without a failure of the compilation in the consumer that does not handle it.

### Scenario: The consumer reads a message

- **WHEN** the client receives one message of the stream
- **THEN** the client parses the content against the schema of the package, and it gives the parsed event to its subscriber

### Scenario: The message does not agree with the schema

- **WHEN** the content of a message agrees with no kind of the union
- **THEN** the parse fails, and the client reports that failure instead of giving an event whose shape is wrong

### Scenario: A kind of event enters the union

- **WHEN** a change adds a fourth kind to the schema
- **THEN** every consumer that does not handle the new kind fails to compile

## The window of the output of a deployment

When the user views a deployment, the system SHALL open a window that streams the output of that deployment.

The window SHALL open the stream only while it is open and a deployment is chosen. It SHALL close the stream when the user closes the window.

The window holds a mark of the status. The mark says `running` until a terminal event arrives, and then it says `success` or `failed`.

The window SHALL handle the three kinds of the event of the stream:

| Kind | What the window does |
|---|---|
| `line` | Adds the text to the output |
| `end` | Sets the mark of the status to `success` or to `failed`, and ends the stream |
| `error` | Shows the code and the safe message of the failure, and ends the stream |

The window SHALL NOT treat an event of the kind `error` as an event of the end. An event of the error carries no status, so that treatment leaves the mark of the status without a value and hides the cause from the user.

The window SHALL keep the view at the last line as the output arrives. The window gives an action that copies the full output.

### Scenario: The user opens the output

- **WHEN** the user views a deployment
- **THEN** the system opens the window, it clears the old lines, and it streams the output from the first line

### Scenario: The terminal event arrives

- **WHEN** the stream sends the event of the end
- **THEN** the mark of the status shows `success` or `failed`, and the stream ends

### Scenario: The stream sends an event of the error

- **WHEN** the stream sends an event of the kind `error`
- **THEN** the window shows the code and the safe message of that event, and the mark of the status does not stay without a value

### Scenario: The user closes the window

- **WHEN** the user closes the window
- **THEN** the system ends the stream

### Scenario: The copy fails

- **WHEN** the browser refuses the access to the clipboard
- **THEN** the system shows no message of failure, and the window continues to work

## The tab "Logs" shows the output of a container that runs

The tab `logs` of a service SHALL show the real output of one container of that service, read from the daemon that runs it. It SHALL NOT show a fixed or an invented line.

The tab SHALL pick a container that runs by default, so the operator sees a live output without a choice to make first. When no container runs, the tab picks the first container of the service, and it shows the last output that container wrote before it stopped.

### Scenario: The user opens the tab of the logs

- **WHEN** the user opens the tab `logs` of a service that runs a container
- **THEN** the system shows the output of that container, and it keeps that output current while the tab stays open

### Scenario: No container of the service runs

- **WHEN** the user opens the tab `logs` of a service whose containers all stopped
- **THEN** the system shows the last output of the first container of the service

## The dropdown menu of the containers

The tab SHALL give a dropdown menu with every container of the service, so the operator can read the output of one container among several, for example the container of a database next to the container of an application.

### Scenario: The service holds more than one container

- **WHEN** the operator opens the dropdown menu of the containers
- **THEN** the system lists every container of the service, and it shows the output of the container the operator picks

### Scenario: The service holds no container

- **WHEN** the service runs no container, and never ran one
- **THEN** the dropdown menu of the containers stays empty, and the tab shows no output

## The selector of the lines of the history

The tab SHALL give a selector of the number of the lines of the history that it reads, among a fixed set of choices. The tab SHALL read 200 lines by default.

A larger number gives a longer history, at the cost of a slower read; the operator picks the number that its case needs.

### Scenario: The operator picks a number of the lines

- **WHEN** the operator picks a number of the lines of the history
- **THEN** the system reads that many lines of the history of the shown container, oldest first

## The mark of the error output

The tab SHALL show the instant of each line, and it SHALL mark a line whose output came from the error stream of the container (`stderr`) apart from a line of its standard stream (`stdout`), so the operator sees a failure of the container without a read of every line.

### Scenario: A container writes to its error stream

- **WHEN** a container writes a line to `stderr`
- **THEN** the system shows that line with the mark of the error stream, distinct from a line of `stdout`

## The download of the output of a container

The tab SHALL give an action that downloads the shown output as a text file, one line for each line of the output, with the instant, the stream and the text of that line.

### Scenario: The operator downloads the output

- **WHEN** the operator triggers the download of the shown output
- **THEN** the system gives a text file that holds every shown line, in the order the tab shows them

### Scenario: The container wrote no output yet

- **WHEN** the shown container wrote no line yet
- **THEN** the action of the download stays disabled

## The retention of the output of a container

The system SHALL remove a line of the output of a container when that line passes the retention in days that the configuration of the server holds. The server holds a value by default, so an installation whose operator set nothing still removes its old lines.

Unlike the age of the archive of a deployment, the operator does not set this retention on a screen; it is a value of the configuration of the server.

### Scenario: A line passes the retention

- **WHEN** a line of the output of a container is older than the retention
- **THEN** the system removes that line

### Scenario: A line is inside the retention

- **WHEN** a line of the output of a container is not older than the retention
- **THEN** the system keeps it
