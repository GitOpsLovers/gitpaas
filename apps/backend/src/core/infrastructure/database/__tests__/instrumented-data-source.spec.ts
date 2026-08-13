import { DataSource, type DataSourceOptions, type QueryRunner, type ReplicationMode } from 'typeorm';

import type { TelemetryEvent } from '../../../domain/models/telemetry.models';
import { getTelemetry, runWithTelemetry } from '../../telemetry/telemetry.context';
import { createInstrumentedDataSource } from '../instrumented-data-source';

// Only the DataSource constructor is used by the unit under test, so the whole
// module can be replaced by it: no real connection is ever attempted.
jest.mock('typeorm', () => ({ DataSource: jest.fn() }));

const DataSourceMock = DataSource as unknown as jest.Mock;

/** Minimal query runner the fake data source hands out. */
interface FakeQueryRunner {
    query: jest.Mock;
}

/** Minimal data source the mocked TypeORM constructor returns. */
interface FakeDataSource {
    options: DataSourceOptions;
    createQueryRunner: (mode?: ReplicationMode) => QueryRunner;
    initialize: jest.Mock;
}

const options = { type: 'postgres', database: 'gitpaas_db' } as unknown as DataSourceOptions;

describe('createInstrumentedDataSource', () => {
    let mockQuery: jest.Mock;
    let mockCreateQueryRunner: jest.Mock;
    let runner: FakeQueryRunner;
    let dataSource: FakeDataSource;

    beforeEach(() => {
        jest.clearAllMocks();

        mockQuery = jest.fn().mockResolvedValue([{ id: 1 }]);
        runner = { query: mockQuery };
        mockCreateQueryRunner = jest.fn().mockReturnValue(runner);
        dataSource = {
            options,
            createQueryRunner: mockCreateQueryRunner as unknown as FakeDataSource['createQueryRunner'],
            initialize: jest.fn(),
        };
        dataSource.initialize.mockResolvedValue(dataSource);
        DataSourceMock.mockImplementation(() => dataSource);
    });

    /** Builds the instrumented data source and gives back one instrumented runner. */
    const instrumentedRunner = async (): Promise<QueryRunner> => {
        await createInstrumentedDataSource(options);

        return dataSource.createQueryRunner();
    };

    it('builds the data source on the given options', async () => {
        await createInstrumentedDataSource(options);

        expect(DataSourceMock).toHaveBeenCalledTimes(1);
        expect(DataSourceMock).toHaveBeenCalledWith(options);
    });

    it('returns the initialised data source', async () => {
        const result = await createInstrumentedDataSource(options);

        expect(dataSource.initialize).toHaveBeenCalledTimes(1);
        expect(result).toBe(dataSource as unknown as DataSource);
    });

    it('throws when the TypeORM options are missing, before building anything', () => {
        expect(() => createInstrumentedDataSource()).toThrow(
            'Cannot build the data source: the TypeORM options are missing.',
        );
        expect(DataSourceMock).not.toHaveBeenCalled();
    });

    it('passes the replication mode through to the original createQueryRunner', async () => {
        await createInstrumentedDataSource(options);

        const created = dataSource.createQueryRunner('slave');

        expect(mockCreateQueryRunner).toHaveBeenCalledTimes(1);
        expect(mockCreateQueryRunner).toHaveBeenCalledWith('slave');
        expect(created).toBe(runner as unknown as QueryRunner);
    });

    it('forwards the arguments of a query to the original query method', async () => {
        const queryRunner = await instrumentedRunner();

        await queryRunner.query('SELECT $1', ['gitpaas']);

        expect(mockQuery).toHaveBeenCalledTimes(1);
        expect(mockQuery).toHaveBeenCalledWith('SELECT $1', ['gitpaas']);
    });

    it('returns the result of a successful query untouched', async () => {
        const rows = [{ id: 7 }];
        mockQuery.mockResolvedValue(rows);
        const queryRunner = await instrumentedRunner();

        await expect(queryRunner.query('SELECT 1')).resolves.toBe(rows);
    });

    it('counts a successful query on the postgres dependency counters', async () => {
        const queryRunner = await instrumentedRunner();

        const event = await runWithTelemetry({}, async (): Promise<Partial<TelemetryEvent> | undefined> => {
            await queryRunner.query('SELECT 1');

            return getTelemetry();
        });

        expect(event).toEqual({
            'deps.postgres.calls': 1,
            'deps.postgres.duration_ms': expect.any(Number),
            'deps.postgres.errors': 0,
            'deps.postgres.max_ms': expect.any(Number),
        });
    });

    it('adds up the statements of a unit of work', async () => {
        const queryRunner = await instrumentedRunner();

        const event = await runWithTelemetry({}, async (): Promise<Partial<TelemetryEvent> | undefined> => {
            await queryRunner.query('SELECT 1');
            await queryRunner.query('SELECT 2');

            return getTelemetry();
        });

        expect(event!['deps.postgres.calls']).toBe(2);
        expect(event!['deps.postgres.errors']).toBe(0);
    });

    it('counts a failing query as a postgres error', async () => {
        mockQuery.mockRejectedValue(new Error('deadlock detected'));
        const queryRunner = await instrumentedRunner();

        const event = await runWithTelemetry({}, async (): Promise<Partial<TelemetryEvent> | undefined> => {
            await expect(queryRunner.query('SELECT 1')).rejects.toThrow('deadlock detected');

            return getTelemetry();
        });

        expect(event).toEqual({
            'deps.postgres.calls': 1,
            'deps.postgres.duration_ms': expect.any(Number),
            'deps.postgres.errors': 1,
            'deps.postgres.max_ms': expect.any(Number),
        });
    });

    it('rethrows the error of a failing query unchanged', async () => {
        const error = new Error('connection terminated');
        mockQuery.mockRejectedValue(error);
        const queryRunner = await instrumentedRunner();

        await expect(
            runWithTelemetry({}, async () => queryRunner.query('SELECT 1')),
        ).rejects.toBe(error);
    });

    it('records nothing for a query run outside a unit of work', async () => {
        const queryRunner = await instrumentedRunner();

        await queryRunner.query('SELECT 1');

        expect(getTelemetry()).toBeUndefined();
    });

    it('neither throws nor loses the result outside a unit of work', async () => {
        const rows = [{ id: 3 }];
        mockQuery.mockResolvedValue(rows);
        const queryRunner = await instrumentedRunner();

        await expect(queryRunner.query('SELECT 1')).resolves.toBe(rows);
    });

    it('rethrows a failing query outside a unit of work, recording nothing', async () => {
        const error = new Error('boom');
        mockQuery.mockRejectedValue(error);
        const queryRunner = await instrumentedRunner();

        await expect(queryRunner.query('SELECT 1')).rejects.toBe(error);
        expect(getTelemetry()).toBeUndefined();
    });

    it('instruments every runner the data source hands out', async () => {
        const secondRunner: FakeQueryRunner = { query: jest.fn().mockResolvedValue([]) };
        mockCreateQueryRunner.mockReturnValueOnce(runner).mockReturnValueOnce(secondRunner);
        await createInstrumentedDataSource(options);

        const first = dataSource.createQueryRunner();
        const second = dataSource.createQueryRunner();

        const event = await runWithTelemetry({}, async (): Promise<Partial<TelemetryEvent> | undefined> => {
            await first.query('SELECT 1');
            await second.query('SELECT 2');

            return getTelemetry();
        });

        expect(event!['deps.postgres.calls']).toBe(2);
    });
});
