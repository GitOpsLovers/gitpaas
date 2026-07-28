import { DataSource } from 'typeorm';

import { HealthProbePostgresAdapter } from '../health-probe-postgres.adapter';

describe('HealthProbePostgresAdapter', () => {
    let query: jest.Mock;
    let dataSource: jest.Mocked<DataSource>;
    let probe: HealthProbePostgresAdapter;

    beforeEach(() => {
        query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
        dataSource = { query } as unknown as jest.Mocked<DataSource>;
        probe = new HealthProbePostgresAdapter(dataSource);
    });

    it('is named postgres', () => {
        expect(probe.name).toBe('postgres');
    });

    it('probes the database with a trivial SELECT 1', async () => {
        await probe.check();

        expect(query).toHaveBeenCalledTimes(1);
        expect(query).toHaveBeenCalledWith('SELECT 1');
    });

    it('reports up when the query resolves', async () => {
        await expect(probe.check()).resolves.toBe(true);
    });

    it('reports down when the query rejects, without throwing', async () => {
        query.mockRejectedValue(new Error('connection terminated'));

        await expect(probe.check()).resolves.toBe(false);
    });
});
