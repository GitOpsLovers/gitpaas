# web-signin Specification

## Purpose

This capability gives the screen where an operator signs in. It is the one public screen of the
application, and it lies at the route `/signin`.

## Requirements

### Requirement: The fields of the screen

The system SHALL show a form with three controls:

| Control | Kind | Obligatory |
|---|---|---|
| Email | A field of the kind `email` | Yes |
| Password | A field that hides the text | Yes |
| Keep me logged in | A box to mark | No |

The system SHALL mark the two obligatory fields with a star.

The system SHALL give a control that shows the password as plain text, and that hides it again. The control
carries a name for the reader of the screen that says which action follows.

#### Scenario: The user asks to see the password

- **WHEN** the user chooses the control of the password
- **THEN** the system shows the password as plain text, and the control now offers to hide it

### Requirement: The check before the call

The system SHALL remove the empty places at the two ends of the email before it uses the value.

If the email is empty after that, or if the password is empty, the system SHALL show a message that says
"Missing credentials", and it SHALL make no call of the API.

#### Scenario: A field is empty

- **WHEN** the user sends the form with an empty email, or with an empty password
- **THEN** the system shows the message "Missing credentials", and it calls no endpoint

### Requirement: The state of the sending

The system SHALL block a second sending while a first sending runs.

While the sending runs, the button carries the text "Signing in…", and the user cannot choose it. At other
times the button carries the text "Sign in".

#### Scenario: The user sends the form twice

- **WHEN** the user sends the form again while the first call runs
- **THEN** the system does nothing, and it makes no second call

### Requirement: The end of the sign-in

If the API accepts the credentials, the system SHALL keep the token pair and open `/dashboard`. The choice
of the storage follows the box "Keep me logged in". See the capability `web-session`.

If the API refuses the credentials, the system SHALL show a message that says "Sign in failed", with the
text "Invalid credentials or inactive account.". The system SHALL let the user try again, and it SHALL keep
the two values in the form.

The message is the same for a wrong password and for an account that is not active, because the message of
the API does not separate the two.

#### Scenario: The credentials are correct

- **WHEN** the API accepts the credentials
- **THEN** the system keeps the token pair, and it opens `/dashboard`

#### Scenario: The credentials are not correct

- **WHEN** the API refuses the credentials
- **THEN** the system shows the message "Sign in failed", and the user can send the form again

#### Scenario: The API does not answer

- **WHEN** the call fails because the backend does not answer
- **THEN** the system shows the same message, and the user can send the form again
