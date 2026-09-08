# Class and selector naming of the frontend

## Pages

- The class name is in `PascalCase` and ends with `Page`. Example: `ProjectsListPage`.
- The selector is `app-<feature>-<action>-page`. Example: `app-projects-list-page`.
- **Exception:** a feature of one screen, with no separate list or detail action, takes the
  selector `app-<feature>`. Example: `DashboardPage` selects `app-dashboard`.

## Presentational components

- The class name is in `PascalCase` and ends with `Component`. Example: `StatCardComponent`.
- The selector is `app-<name>`. Example: `app-stat-card`.
- The selector must match the class: `app-stat-card` selects `StatCardComponent`, never a
  different name.

## Outputs

Name an `output()` with a bare verb (`set`, `remove`, `view`, `save`, `deploy`), and never with the name of a native DOM event (`change`, `input`, `select`, `submit`, `focus`, `blur`, `close`, `toggle`). A template that binds `(change)` to such an output reads the native event of the host instead, and the handler receives an `Event`, not the payload.
