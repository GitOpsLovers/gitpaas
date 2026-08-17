# Operations

| Script                | Command                               |
|-----------------------|---------------------------------------|
| `dev`                 | `nest start --watch`                  |
| `start:debug`         | `nest start --debug --watch`          |
| `build`               | `nest build`                          |
| `start` / `start:prod`| `nest start` / `node dist/main`       |
| `lint` / `test`       | `eslint .` / `jest` (plus `test:e2e`) |

## Schema management

The backend has a **factory** that is the source of truth for the database connection. It sets `synchronize` to `NODE_ENV !== 'production'` and registers the entities **by glob**. Thus no code makes a list of them. The extension in the glob agrees with the mode of the process (`.ts` with ts-jest or ts-node, `.js` in `dist/` at runtime). `CoreModule` uses those options and adds `autoLoadEntities: true`. Thus Nest also finds the entities that `forFeature` registers.

- **Development**: TypeORM `synchronize` creates and updates the schema from the entities.
- **Production**: the schema stays in plain SQL files in `iac/production/migrations/`. See [infrastructure architecture](../infrastructure-architecture/key-flows.md#schema-bootstrap).

If the schemas change, **you must make the same change in a manually written `.sql` file** in `iac/production/migrations/`. Use the exact column types, the exact defaults and the exact constraint names that TypeORM needs.
