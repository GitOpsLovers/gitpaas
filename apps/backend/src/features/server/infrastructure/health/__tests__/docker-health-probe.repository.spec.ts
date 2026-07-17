import { ServiceUnavailableException } from '@nestjs/common';

import { DockerHealthProbe } from '../docker-health-probe.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';

describe('DockerHealthProbe', () => {
    let ping: jest.Mock;
    let getClient: jest.Mock;
    let client: jest.Mocked<DockerClient>;
    let probe: DockerHealthProbe;

    beforeEach(() => {
        ping = jest.fn().mockResolvedValue('OK');
        getClient = jest.fn().mockReturnValue({ ping });
        client = { getClient } as unknown as jest.Mocked<DockerClient>;
        probe = new DockerHealthProbe(client);
    });

    it('is named docker', () => {
        expect(probe.name).toBe('docker');
    });

    it('probes the daemon with a ping', async () => {
        await probe.check();

        expect(ping).toHaveBeenCalledTimes(1);
    });

    it('reports up when the ping resolves', async () => {
        await expect(probe.check()).resolves.toBe(true);
    });

    it('reports down when the ping rejects, without throwing', async () => {
        ping.mockRejectedValue(new Error('daemon unreachable'));

        await expect(probe.check()).resolves.toBe(false);
    });

    it('swallows the synchronous ServiceUnavailableException from getClient and reports down', async () => {
        getClient.mockImplementation(() => {
            throw new ServiceUnavailableException('Could not read VPS TLS certificates');
        });

        await expect(probe.check()).resolves.toBe(false);
    });
});
