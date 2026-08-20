# Known inconsistencies — follow the dominant pattern

Some specs are different. If you change one of these specs, use the dominant convention. Do not copy the minority convention into a new spec.

| Topic | Dominant pattern (use this) | Minority exceptions |
| --- | --- | --- |
| Name of the SUT | the role: `fixture` and `component`, `repository`, `service` | none; the frontend never uses `sut` |
| Helper of the spec | a `const` arrow inside the `describe` | a `function` above the `describe`, in `token-storage.service.spec.ts` and `deployments-api.repository.spec.ts`, where the helper is long or needs the hoisting |
| Interface of the private members | `<ComponentName>Internals`, declared under the imports | a shortened name, such as `RegistrationStartInternals` for `ProviderRegistrationStartComponent` |
| Repository of a container | replaced with `TestBed.overrideComponent` | replaced with a provider of the module, in the components that inject no repository of their own |
| Template of a container | emptied with `set: { template: '' }` when the test drives the class | kept, in the specs that assert the rendering |
| A test with no `expect` | assert something | `deployments-api.repository.spec.ts` and `projects-api.repository.spec.ts` disable `vitest/expect-expect`, because `httpMock` carries the assertion |

Two features hold a duplicated screen of the providers: `features/providers/` and `features/source-control/`. The two sets of specs are separate, and they are both current. Change the spec of the feature that your task names, and do not merge them.
