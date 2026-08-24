# Class and selector naming of the frontend

## Pages

- The class name is in `PascalCase` and ends with `Page`. Example: `ProjectsListPage`.
- The selector is `app-<feature>-<action>-page`. Example: `app-projects-list-page`.

## Presentational components

- The class name is in `PascalCase` and ends with `Component`. Example: `StatCardComponent`.
- The selector is `app-<name>`. Example: `app-stat-card`.

## Outputs

Name an `output()` with a bare verb (`set`, `remove`, `view`, `save`, `deploy`), and never with the name of a native DOM event (`change`, `input`, `select`, `submit`, `focus`, `blur`, `close`, `toggle`). A template that binds `(change)` to such an output reads the native event of the host instead, and the handler receives an `Event`, not the payload.
