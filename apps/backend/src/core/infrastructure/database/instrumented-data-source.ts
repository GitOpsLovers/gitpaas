import { DataSource, type DataSourceOptions, type QueryRunner, type ReplicationMode } from 'typeorm';

import { recordDependencyCall } from '../telemetry/telemetry-deps';

/**
 * Wraps the query method of a query runner so every statement it executes is counted on the telemetry event
 *
 * @param queryRunner Query runner to instrument, mutated in place
 *
 * @returns The same query runner, with its query method instrumented
 */
function instrumentQueryRunner(queryRunner: QueryRunner): QueryRunner {
    const runQuery = queryRunner.query.bind(queryRunner) as (...args: unknown[]) => Promise<unknown>;

    const instrumented = async (...args: unknown[]): Promise<unknown> => {
        const startedAt = performance.now();

        try {
            const result = await runQuery(...args);

            recordDependencyCall('postgres', performance.now() - startedAt, false);

            return result;
        } catch (error) {
            recordDependencyCall('postgres', performance.now() - startedAt, true);

            throw error;
        }
    };

    const instrumentedQueryRunner = queryRunner;
    instrumentedQueryRunner.query = instrumented as unknown as QueryRunner['query'];

    return instrumentedQueryRunner;
}

/**
 * Builds the data source the application runs on.
 *
 * @param options Fully resolved TypeORM data source options
 *
 * @returns The initialised, instrumented data source
 *
 * @throws {Error} When the data source options are missing
 */
export function createInstrumentedDataSource(options?: DataSourceOptions): Promise<DataSource> {
    if (!options) {
        throw new Error('Cannot build the data source: the TypeORM options are missing.');
    }

    const dataSource = new DataSource(options);
    const createQueryRunner = dataSource.createQueryRunner.bind(dataSource);

    dataSource.createQueryRunner = (mode?: ReplicationMode): QueryRunner =>
        instrumentQueryRunner(createQueryRunner(mode));

    return dataSource.initialize();
}
