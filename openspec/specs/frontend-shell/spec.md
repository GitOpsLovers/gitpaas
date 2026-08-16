# frontend-shell Specification

## Purpose

This capability gives the frame around every screen of the signed-in application: the sidebar with the navigation, the header with the user menu, and the choice between the light theme and the dark theme.

## Requirements

### Requirement: The frame of the signed-in application

The system SHALL show every signed-in screen inside one shell. The shell holds the sidebar, the header and the area of the screen.

The sign-in screen stays outside the shell. It fills the window, and it shows no sidebar and no header.

#### Scenario: A user opens a screen of the application

- **WHEN** a signed-in user opens any route of the application
- **THEN** the system shows the sidebar, the header and the screen inside the shell

#### Scenario: A user opens the sign-in screen

- **WHEN** a user opens `/signin`
- **THEN** the system shows the screen alone, without the sidebar and without the header

### Requirement: The sidebar of the navigation

The system SHALL give the navigation in the sidebar.

On a wide window, the control of the header makes the sidebar wide or narrow. On a narrow window, the same control opens the sidebar above the screen, and a dark ground behind it closes the sidebar.

#### Scenario: The user uses the control on a wide window

- **WHEN** the user chooses the control, and the window is 1280 pixels wide or wider
- **THEN** the system makes the sidebar wide or narrow

#### Scenario: The user uses the control on a narrow window

- **WHEN** the user chooses the control, and the window is narrower than 1280 pixels
- **THEN** the system opens the sidebar above the screen, with a dark ground behind it

### Requirement: The menu of the user

The system SHALL give a menu in the header that holds the action to sign out.

The system SHALL close the menu when the user chooses a point outside it, and when the user presses the key `Escape`.

#### Scenario: The user opens the menu

- **WHEN** the user chooses the control of the menu
- **THEN** the system opens the menu

#### Scenario: The user chooses a point outside the menu

- **WHEN** the menu is open, and the user chooses a point outside it
- **THEN** the system closes the menu

#### Scenario: The user presses Escape

- **WHEN** the menu is open, and the user presses `Escape`
- **THEN** the system closes the menu

#### Scenario: The user signs out

- **WHEN** the user chooses the action to sign out
- **THEN** the system closes the menu, and it ends the session. See the capability `auth`

### Requirement: The choice of the theme

The system SHALL give a control that changes between the light theme and the dark theme.

The system SHALL keep the choice under the key `theme` of `localStorage`, and it SHALL apply that choice at the start of the application.

#### Scenario: The user changes the theme

- **WHEN** the user chooses the control of the theme
- **THEN** the system changes to the other theme, and it writes the choice into `localStorage`

#### Scenario: The application starts again

- **WHEN** the user opens the application again, and `localStorage` holds a choice
- **THEN** the system applies that choice

#### Scenario: The storage holds no choice

- **WHEN** the user opens the application, and `localStorage` holds no choice
- **THEN** the system applies the dark theme

### Requirement: The trail of the navigation

The system SHALL show a trail of the navigation at the top of each screen that lies below the first level.

Each part of the trail before the last one opens its screen. The last part names the screen of the moment, and it opens nothing.

#### Scenario: The user opens the detail of a service

- **WHEN** the user opens the detail of a service
- **THEN** the trail shows the projects, the name of the project and the name of the service, and only the first two parts open a screen

#### Scenario: The name is not yet available

- **WHEN** the trail needs a name that the application still reads from the API
- **THEN** the trail shows a general word, for example "Project", until the name arrives
