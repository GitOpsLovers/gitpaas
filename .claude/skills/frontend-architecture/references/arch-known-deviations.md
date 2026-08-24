# The known deviations of the frontend

The pages of `docs/architecture/frontend/` give the canonical pattern. This is the known place where the code still deviates from it. Do not copy the deviation into new code.

## State management

New state uses signals. `SidebarService` of the shell still uses RxJS: it keeps the expanded, hovered and mobile-open state in a `BehaviorSubject`, and the templates read it with the `async` pipe. This is an intentional holdover from the TailAdmin port, not a pattern to repeat.
