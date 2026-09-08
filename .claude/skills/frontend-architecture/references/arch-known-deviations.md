# The known deviations of the frontend

The pages of `docs/architecture/frontend/` give the canonical pattern. This table names the place
where the code still deviates from it. Do not copy a deviation into new code.

| The deviation | The pattern it should follow | Where |
| --- | --- | --- |
| A `BehaviorSubject` of RxJS holds the state, and the template reads it with the `async` pipe. | New state uses signals. | `SidebarService` and `ThemeService` (`layout/ui/services/`). |
| `CommonModule` or `ngClass` makes a dynamic class. | Use a `[class]` binding or a `get …Classes()` accessor. | The five components of `layout/` (`sidebar`, `backdrop`, `theme-toggle`, `header`, `layout`). |
| `@Output()` and `EventEmitter` declare an event. | Use `output()`. | `shared/components/input/`, `shared/components/textarea/` and `shared/components/button/`. |
| A feature repository is `providedIn: 'root'`. | The smart container gives the repository, so each screen gets a new instance. | `NamespacesApiRepository`. |
| `@HostListener` binds a DOM event to the host. | No canonical alternative documented yet; kept as a known deviation. | `header` and `shared/components/dropdown/`. |

## `@features/server/application/`

`domain/`, `infrastructure/` and `ui/` of a feature must not import the `application/` layer of
another feature. Ten importers of `@features/server/application/` still cross this boundary; see
`## The layers of a feature` of [arch-layers.md](arch-layers.md).
