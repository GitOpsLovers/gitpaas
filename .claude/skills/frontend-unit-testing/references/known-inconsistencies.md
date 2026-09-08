# Known inconsistencies — follow the dominant pattern

Some specs are different. If you change one of these specs, use the dominant convention. Never copy the minority convention into a new spec.

| The topic | The dominant pattern (use this) | The minority exception |
| --- | --- | --- |
| The name of the interface of the private members | `<ComponentName>Internals` | a shortened name, such as `RegistrationStartInternals` for `ProviderRegistrationStartComponent` |
| The template of a container | emptied with `set: { template: '' }` when the test drives the class | kept, in the specs that assert the rendering |
| A test with no `expect` | assert something | the specs of the repositories of `domains`, `projects`, `server` and `namespaces` disable `vitest/expect-expect`, because `httpMock.expectNone` carries the assertion |
