import { DataSource } from 'typeorm';

import { PostgresHealthProbeAdapter } from '../postgres-health-probe.adapter';

describe('PostgresHealthProbeAdapter', () => {
    let query: jest.Mock;
    let dataSource: jest.Mocked<DataSource>;
    let probe: PostgresHealthProbeAdapter;

    beforeEach(() => {
        query = jest.fn().mockResolvedValue([{ '?column?': 1 }]);
        dataSource = { query } as unknown as jest.Mocked<DataSource>;
        probe = new PostgresHealthProbeAdapter(dataSource);
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
        await expect(probe.check()).resolves.toBe('up');
    });

    it('reports down when the query rejects, without throwing', async () => {
        query.mockRejectedValue(new Error('connection terminated'));

        await expect(probe.check()).resolves.toBe('down');
    });
});
