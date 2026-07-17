import { RedisHealthProbe } from '../redis-health-probe.repository';

import { RedisClient } from '@core/infrastructure/redis/redis.client';

describe('RedisHealthProbe', () => {
    let ping: jest.Mock;
    let getClient: jest.Mock;
    let client: jest.Mocked<RedisClient>;
    let probe: RedisHealthProbe;

    beforeEach(() => {
        ping = jest.fn().mockResolvedValue('PONG');
        getClient = jest.fn().mockReturnValue({ ping });
        client = { getClient } as unknown as jest.Mocked<RedisClient>;
        probe = new RedisHealthProbe(client);
    });

    it('is named redis', () => {
        expect(probe.name).toBe('redis');
    });

    it('probes Redis with a PING', async () => {
        await probe.check();

        expect(ping).toHaveBeenCalledTimes(1);
    });

    it('reports up when Redis replies with PONG', async () => {
        await expect(probe.check()).resolves.toBe(true);
    });

    it('reports down on a non-PONG reply', async () => {
        ping.mockResolvedValue('LOADING Redis is loading the dataset in memory');

        await expect(probe.check()).resolves.toBe(false);
    });

    it('reports down when ping rejects, without throwing', async () => {
        ping.mockRejectedValue(new Error('connection is closed'));

        await expect(probe.check()).resolves.toBe(false);
    });

    it('reports down when getClient throws synchronously, without throwing', async () => {
        getClient.mockImplementation(() => {
            throw new Error('no connection');
        });

        await expect(probe.check()).resolves.toBe(false);
    });
});
