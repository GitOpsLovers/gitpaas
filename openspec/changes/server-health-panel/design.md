## Context

See proposal.md — Why.

Two constraints shape the approach.

**1. The two endpoints answer `503` on the case that matters.** `GET /api/v1/server/readiness` answers
`503` when a dependency is down, and the body of that answer carries the aggregate state and the state of
each dependency. `GET /api/v1/server/status` answers `503` when the Docker daemon does not answer. For a
panel of the health, a `503` is the interesting answer, and not a failure to hide.

**2. The convention of the frontend uses `httpResource` for a read.** A resource reports a non-2xx answer
through its signal `error()`, and not through `value()`. Thus the body of a `503` arrives, and it arrives on
the path of the error.

## Goals / Non-Goals

**Goals:**

- The panel shows the true state, whether the API answers `200` or `503`.
- The logic that decides what the panel shows is a pure function, so a specification can cover each case
  without a component and without an HTTP mock.

**Non-Goals:**

- A change of the two endpoints, or of the capability `server`. The backend already gives what the panel
  needs.
- A read on a timer, and a stream. See the decision 3.
- A rich view of the information of the daemon. The panel shows what the daemon reports, and it invents no
  fields of its own.

## Decisions

**1. The component reads `value()` and `error()`, and one pure function maps the two into a view model.**

The repository keeps the convention: two reads with `httpResource`. The component gives both signals of each
resource to a pure function, which gives the model that the panel renders. The function has three cases:

- The answer arrived: use the body.
- The answer failed, and its body has the shape of the result: use that body. This is the `503` of a
  dependency that is down.
- The answer failed, and its body has no usable shape: report that the health could not be read. This is a
  network that failed, or a backend that does not answer.

**Alternative that the change does not take:** `HttpClient.get` with `catchError` in the repository, which
maps a `503` back into a value. It hides the difference between "the server answered that it is not ready"
and "the server did not answer" inside the repository, and it leaves the convention of `httpResource`.

**Alternative that the change does not take:** the option `parse` of `httpResource`. It does not run on the
path of the error, so it cannot reach the body of a `503`.

**2. The panel is a presentational component, and the page holds the reads.**

This follows the division of the frontend that the rest of the feature uses: the container holds the state,
and the component renders the inputs that it receives. The existing container of the maintenance stays as it
is, and the panel enters beside it.

**3. The panel reads one time, when the screen opens.**

A panel that reads again on a timer needs a decision about the period, and it holds a call open for as long
as the screen stays open. The value of a first version is that the operator sees the state at all. The
specification records the one read, so a later change that adds a refresh changes a requirement, and does
not slip in.

## Risks / Trade-offs

**The shape of the body of the `503` is not a contract that a tool enforces.** → The pure function tests the
shape before it uses it, and it falls back to the message of the failed reading. The change `request-model`
puts this shape into the shared package later, and then the compiler enforces it.

**A state that is old.** The panel shows the state of the moment when the screen opened. An operator who
leaves the screen open reads a value that is out of date. → The panel is above the maintenance, and an
action of the maintenance reports its own failure. The operator loses nothing that they have today.

**The information of the daemon has no fixed shape in the frontend.** → The panel shows the fields that it
knows, and it shows nothing for a field that is absent.

## Migration Plan

None. The change adds a panel to one screen. There is no migration of the data, no change of an endpoint and
no flag. A rollback is the revert of the commit.
