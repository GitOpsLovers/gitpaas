# Known inconsistencies — follow the dominant pattern

Some older specs are different. If you change one of these specs, use the dominant convention. Do not copy the minority convention into a new spec.

| Topic | Dominant pattern (use this) | Minority exceptions |
| --- | --- | --- |
| SUT variable name | `sut` | `probe` (health probes), `hasher` (`argon2-password-hasher.adapter.spec.ts`), `strategy` (`local.strategy.spec.ts`), `store` (`db-log-store.adapter.spec.ts`) |
| Mocked collaborator name | with the `mock` prefix | no prefix: `query`, `dataSource`, `client`, `usersRepository`, `deploymentsRepository`, in the health-probe, strategy and queue-adapter specs |
| Mocked use-case name | `mock<UseCaseName>` | `validateUserUseCaseMock` in `local.strategy.spec.ts` |
| Spec-local fixture builders | `const` arrow | `function entity(...)` and `function createRepository()` in `db-deployment-queue.adapter.spec.ts` and `db-log-store.adapter.spec.ts` |
| `jest.clearAllMocks()` first in `beforeEach` | yes | absent in the health-probe, argon2 and queue-adapter specs |
| `restoreAllMocks()` when spying | restore in `afterEach` | `db-log-store.adapter.spec.ts` uses a spy with no explicit restore |
