import { RedisHealthProbeAdapter } from '../redis-health-probe.adapter';

import { RedisConnection } from '@core/infrastructure/redis/redis.connection';

describe('RedisHealthProbeAdapter', () => {
    let ping: jest.Mock;
    let getClient: jest.Mock;
    let mockConnection: jest.Mocked<Pick<RedisConnection, 'getClient'>>;
    let sut: RedisHealthProbeAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        ping = jest.fn().mockResolvedValue('PONG');
        getClient = jest.fn().mockReturnValue({ ping });
        mockConnection = { getClient };
        sut = new RedisHealthProbeAdapter(mockConnection as unknown as RedisConnection);
    });

    it('is named redis', () => {
        expect(sut.name).toBe('redis');
    });

    it('probes the store with a PING on the shared connection', async () => {
        await sut.check();

        expect(getClient).toHaveBeenCalledTimes(1);
        expect(ping).toHaveBeenCalledTimes(1);
    });

    it('reports up when the PING answers', async () => {
        await expect(sut.check()).resolves.toBe('up');
    });

    it('reports up whatever the payload the PING answers with', async () => {
        ping.mockResolvedValue('');

        await expect(sut.check()).resolves.toBe('up');
    });

    it('reports down when the PING rejects, without propagating the error', async () => {
        ping.mockRejectedValue(new Error('connection refused'));

        await expect(sut.check()).resolves.toBe('down');
    });

    it('reports down when the PING rejects with a non-Error value', async () => {
        ping.mockRejectedValue('socket hang up');

        await expect(sut.check()).resolves.toBe('down');
    });

    it('reports down when opening the connection throws synchronously', async () => {
        getClient.mockImplementation(() => {
            throw new Error('could not reach Redis');
        });

        await expect(sut.check()).resolves.toBe('down');
    });
});
