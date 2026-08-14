# web-namespaces-list Specification

## Purpose

This capability gives the screen that lists the namespaces, at the route `/namespaces`. It is the entry
into the tree of the domain: a namespace holds the projects, and a project holds the services.

## Requirements

### Requirement: The four states of the screen

The system SHALL show one of four states:

1. **The reading runs.** The screen says "Loading namespaces…".
2. **The reading failed.** The screen shows a red panel that says "Could not load namespaces. Is the
   backend running?".
3. **The list holds namespaces.** The screen shows one card per namespace, in a grid.
4. **The list is empty.** The screen shows a panel with a dotted border that says "No namespaces yet.",
   and a button that opens the screen of the creation.

#### Scenario: The reading runs

- **WHEN** the user opens the screen, and the call of the API still runs
- **THEN** the screen says "Loading namespaces…"

#### Scenario: The reading fails

- **WHEN** the call of the API fails
- **THEN** the screen shows the red panel with the question about the backend

#### Scenario: The list is empty

- **WHEN** the API answers with an empty list
- **THEN** the screen shows the panel "No namespaces yet." with the button "Create your first namespace"

### Requirement: The actions of a card

Each card SHALL give three actions:

| Action | Result |
|---|---|
| View | Opens the projects of the namespace, at `/namespaces/:id/projects` |
| Edit | Opens the change of the namespace, at `/namespaces/edit/:id` |
| Delete | Opens the question before the removal |

#### Scenario: The user chooses "View"

- **WHEN** the user chooses "View" on a card
- **THEN** the system opens the projects of that namespace

#### Scenario: The user chooses "Edit"

- **WHEN** the user chooses "Edit" on a card
- **THEN** the system opens the screen of the change for that namespace

### Requirement: The removal of a namespace

The system SHALL ask the user to confirm before it removes a namespace.

The question carries the title "Delete namespace?" and a message that names the namespace between marks of
quotation, and that says that the action has no way back.

After a removal that succeeds, the system SHALL show a message of success, and it SHALL read the list
again. After a removal that fails, the system SHALL show a message of failure, and it SHALL keep the list
as it is.

#### Scenario: The removal succeeds

- **WHEN** the user confirms the removal, and the API answers `204`
- **THEN** the system shows the message "Namespace deleted", and it reads the list again

#### Scenario: The namespace still holds projects

- **WHEN** the user confirms the removal, and the API refuses because the namespace still holds projects
- **THEN** the system shows the message "Could not delete namespace" with the text "Something went wrong.
  Please try again."

#### Scenario: The user cancels

- **WHEN** the user cancels the question
- **THEN** the system closes the question, and it calls no endpoint

### Requirement: The message of the failure does not name the reason

The system SHALL show one message for every failure of the removal. The message does not say if the
namespace still holds projects, or if the backend does not answer.

The API separates the two — it answers `409` for a namespace that is not empty, and it names the count of
the projects. The screen does not read that answer. See the capability `namespaces`.

This requirement records the state of today. A later change must show the true reason.

#### Scenario: Two different failures

- **WHEN** the removal fails because the namespace holds projects, or because the backend does not answer
- **THEN** the system shows the same message in the two cases
