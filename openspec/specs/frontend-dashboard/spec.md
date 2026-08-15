# frontend-dashboard Specification

## Purpose

This capability gives the first screen of the signed-in application, at the route `/dashboard`. It is the
target of every redirection that names no other screen.

## Requirements

### Requirement: The dashboard is the first screen

The system SHALL open `/dashboard` in three cases:

1. The user signs in.
2. The user opens the root path of the application.
3. The user opens a path that no route declares.

#### Scenario: The user opens the root path

- **WHEN** a signed-in user opens `/`
- **THEN** the system opens `/dashboard`

#### Scenario: The user opens an unknown path

- **WHEN** a user opens a path that no route declares
- **THEN** the system opens `/dashboard`

### Requirement: The dashboard holds no content yet

The system SHALL show the word "Dashboard" and nothing more. The screen reads no data of the API.

The component declares a set of numbers and a set of names of services, but the template of the screen uses
none of them. They are the rest of a first design of the theme.

This requirement records the state of today. A later change must replace it.

#### Scenario: The user opens the dashboard

- **WHEN** a signed-in user opens `/dashboard`
- **THEN** the system shows the word "Dashboard", and it calls no endpoint of the API
