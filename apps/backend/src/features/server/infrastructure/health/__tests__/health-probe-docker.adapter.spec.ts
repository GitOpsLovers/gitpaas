import { HealthProbeDockerAdapter } from '../health-probe-docker.adapter';

import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/container-runtime-docker.adapter';

describe('HealthProbeDockerAdapter', () => {
    let ping: jest.Mock;
    let client: jest.Mocked<DockerContainerRuntimeAdapter>;
    let probe: HealthProbeDockerAdapter;

    beforeEach(() => {
        ping = jest.fn().mockResolvedValue(true);
        client = { ping } as unknown as jest.Mocked<DockerContainerRuntimeAdapter>;
        probe = new HealthProbeDockerAdapter(client);
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

    it('reports up on any answer from the daemon, whatever its acknowledgement', async () => {
        ping.mockResolvedValue(false);

        await expect(probe.check()).resolves.toBe(true);
    });

    it('reports down when the ping rejects, without throwing', async () => {
        ping.mockRejectedValue(new Error('daemon unreachable'));

        await expect(probe.check()).resolves.toBe(false);
    });

    it('swallows a synchronous throw from the runtime and reports down', async () => {
        ping.mockImplementation(() => {
            throw new Error('could not create the Docker client');
        });

        await expect(probe.check()).resolves.toBe(false);
    });

    it('reports down when the ping rejects with a non-Error value', async () => {
        ping.mockRejectedValue('socket hang up');

        await expect(probe.check()).resolves.toBe(false);
    });
});
