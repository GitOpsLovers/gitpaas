import { DataSource } from 'typeorm';

import { buildDataSourceOptions } from './data-source-options';

/**
 * Standalone TypeORM DataSource used exclusively by the TypeORM CLI (the `-d`
 * target for `migration:generate` / `migration:run` / `migration:revert`).
 *
 * It shares its connection options with the NestJS runtime through
 * {@link buildDataSourceOptions}, but — unlike the Nest side — it does NOT use
 * `autoLoadEntities`, so entities are discovered purely via the glob the
 * factory registers. This makes the CLI self-contained and independent of the
 * Nest DI container.
 */
export default new DataSource(buildDataSourceOptions());
