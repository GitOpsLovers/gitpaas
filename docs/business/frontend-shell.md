# frontend-shell

## Purpose

This capability gives the frame around every screen of the signed-in application: the sidebar with the navigation, the header with the user menu, and the choice between the light theme and the dark theme.

## The frame of the signed-in application

The system SHALL show every signed-in screen inside one shell. The shell holds the sidebar, the header and the area of the screen.

The sign-in screen stays outside the shell. It fills the window, and it shows no sidebar and no header.

### Scenario: A user opens a screen of the application

- **WHEN** a signed-in user opens any route of the application
- **THEN** the system shows the sidebar, the header and the screen inside the shell

### Scenario: A user opens the sign-in screen

- **WHEN** a user opens `/signin`
- **THEN** the system shows the screen alone, without the sidebar and without the header

## The sidebar of the navigation

The system SHALL give the navigation in the sidebar.

On a wide window, the control of the header makes the sidebar wide or narrow. On a narrow window, the same control opens the sidebar above the screen, and a dark ground behind it closes the sidebar.

### Scenario: The user uses the control on a wide window

- **WHEN** the user chooses the control, and the window is 1280 pixels wide or wider
- **THEN** the system makes the sidebar wide or narrow

### Scenario: The user uses the control on a narrow window

- **WHEN** the user chooses the control, and the window is narrower than 1280 pixels
- **THEN** the system opens the sidebar above the screen, with a dark ground behind it

## The version at the bottom of the sidebar

The system SHALL show the installed version of GitPaaS at the bottom of the sidebar, to an administrator alone, and only while the sidebar is expanded, hovered or open on the narrow window.

The system SHALL show a button "Update to X.Y.Z" below the version, when a newer release exists. The button carries the user to the tab Maintenance, at `/server/maintenance` (see the capability `server`), where the update runs. The system SHALL hide the button when the installed version already agrees with the latest one.

The system SHALL read the version and the state of the update one time, when the sidebar starts. No timer refreshes it.

### Scenario: An administrator sees the version

- **WHEN** an administrator opens the application, and the sidebar is expanded, hovered or open on the narrow window
- **THEN** the system shows the installed version at the bottom of the sidebar

### Scenario: An administrator sees the button of the update

- **WHEN** an administrator opens the application, and a newer release exists
- **THEN** the system shows the button "Update to X.Y.Z", and it carries the administrator to the tab Maintenance when they choose it

### Scenario: The platform already runs the latest release

- **WHEN** the installed version agrees with the latest one
- **THEN** the system shows the version, and no button

### Scenario: The user is not an administrator

- **WHEN** a user who is not an administrator opens the application
- **THEN** the system shows no version, and no button, in the sidebar

## The menu of the user

The system SHALL give a menu in the header that holds the action to sign out.

The system SHALL close the menu when the user chooses a point outside it, and when the user presses the key `Escape`.

### Scenario: The user opens the menu

- **WHEN** the user chooses the control of the menu
- **THEN** the system opens the menu

### Scenario: The user chooses a point outside the menu

- **WHEN** the menu is open, and the user chooses a point outside it
- **THEN** the system closes the menu

### Scenario: The user presses Escape

- **WHEN** the menu is open, and the user presses `Escape`
- **THEN** the system closes the menu

### Scenario: The user signs out

- **WHEN** the user chooses the action to sign out
- **THEN** the system closes the menu, and it ends the session. See the capability `auth`

## The choice of the theme

The system SHALL give a control that changes between the light theme and the dark theme.

The system SHALL keep the choice under the key `theme` of `localStorage`, and it SHALL apply that choice at the start of the application.

### Scenario: The user changes the theme

- **WHEN** the user chooses the control of the theme
- **THEN** the system changes to the other theme, and it writes the choice into `localStorage`

### Scenario: The application starts again

- **WHEN** the user opens the application again, and `localStorage` holds a choice
- **THEN** the system applies that choice

### Scenario: The storage holds no choice

- **WHEN** the user opens the application, and `localStorage` holds no choice
- **THEN** the system applies the dark theme

## The loading state of a screen

The system SHALL show a skeleton in the shape of the content, while the screen loads it, in place of a sentence of text. The skeleton SHALL take about the same height as the content that replaces it, so the screen keeps one height while it moves from the loading state to the loaded state.

The system SHALL give the error state and the empty state of a screen a minimum height as well, so the screen keeps one height across its four states: loading, error, empty and loaded.

### Scenario: A screen loads its content

- **WHEN** a user opens a screen that reads dynamic content from the API
- **THEN** the system shows a skeleton in the shape of that content, until the content arrives

### Scenario: The content fails to load

- **WHEN** the call to the API fails
- **THEN** the system shows the error message at the minimum height of the loaded content, and not a shorter box

### Scenario: The content is empty

- **WHEN** the call to the API succeeds, and it returns no item
- **THEN** the system shows the empty message at the minimum height of the loaded content, and not a shorter box

## The icon of the main title

The system SHALL show the icon of its section before the main title of every screen, next to the trail of the navigation.

The icon names the kind of the record that the screen holds: a screen of a project shows the icon "folder", and a screen of a service shows the icon "layers". A screen that names no record of that kind shows the icon of its section of the sidebar, for example, and the dashboard shows the icon "grid".

### Scenario: The user opens a screen of a project

- **WHEN** a signed-in user opens a screen of a project
- **THEN** the system shows the icon "folder" before the main title

### Scenario: The user opens a screen of a service

- **WHEN** a signed-in user opens a screen of a service
- **THEN** the system shows the icon "layers" before the main title

### Scenario: The user opens the dashboard

- **WHEN** a signed-in user opens the dashboard
- **THEN** the system shows the icon "grid" before the main title

## The trail of the navigation

The system SHALL show a trail of the navigation at the top of each screen that lies below the first level.

Each part of the trail before the last one opens its screen. The last part names the screen of the moment, and it opens nothing.

### Scenario: The user opens the detail of a service

- **WHEN** the user opens the detail of a service
- **THEN** the trail shows the projects, the name of the project and the name of the service, and only the first two parts open a screen

### Scenario: The name is not yet available

- **WHEN** the trail needs a name that the application still reads from the API
- **THEN** the trail shows a general word, for example "Project", until the name arrives
