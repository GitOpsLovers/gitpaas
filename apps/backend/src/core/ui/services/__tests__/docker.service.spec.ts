import type Docker from 'dockerode';

import { DockerInfo } from '../../../domain/models/docker.models';
import { DockerClient } from '../../../infrastructure/docker/docker.client';
import { DockerService } from '../docker.service';

const dockerInfo: DockerInfo = {
    ServerVersion: '27.1.1',
    OperatingSystem: 'Ubuntu 24.04',
    Containers: 4,
    Images: 12,
};

describe('DockerService', () => {
    let daemon: jest.Mocked<Pick<Docker, 'ping' | 'info'>>;
    let client: jest.Mocked<Pick<DockerClient, 'getClient'>>;
    let sut: DockerService;

    beforeEach(() => {
        daemon = {
            ping: jest.fn(),
            info: jest.fn(),
        };
        client = {
            getClient: jest.fn().mockReturnValue(daemon),
        };

        sut = new DockerService(client as unknown as DockerClient);
    });

    describe('ping', () => {
        it('resolves the dockerode client before pinging it', async () => {
            daemon.ping.mockResolvedValue(Buffer.from('OK'));

            await sut.ping();

            expect(client.getClient).toHaveBeenCalledTimes(1);
            expect(daemon.ping).toHaveBeenCalledTimes(1);
        });

        it('returns true when the daemon answers with an "OK" buffer', async () => {
            daemon.ping.mockResolvedValue(Buffer.from('OK'));

            const result = await sut.ping();

            expect(result).toBe(true);
        });

        it('returns true when the daemon answers with an "OK" string', async () => {
            daemon.ping.mockResolvedValue('OK');

            const result = await sut.ping();

            expect(result).toBe(true);
        });

        it('returns false when the daemon answers with a non-OK payload', async () => {
            daemon.ping.mockResolvedValue(Buffer.from('pong'));

            const result = await sut.ping();

            expect(result).toBe(false);
        });

        it('returns false when the daemon answers with an empty payload', async () => {
            daemon.ping.mockResolvedValue(Buffer.from(''));

            const result = await sut.ping();

            expect(result).toBe(false);
        });

        it('propagates errors thrown while pinging the daemon', async () => {
            const error = new Error('docker daemon unreachable');
            daemon.ping.mockRejectedValue(error);

            await expect(sut.ping()).rejects.toThrow(error);
        });
    });

    describe('info', () => {
        it('resolves the dockerode client before querying info', async () => {
            daemon.info.mockResolvedValue(dockerInfo);

            await sut.info();

            expect(client.getClient).toHaveBeenCalledTimes(1);
            expect(daemon.info).toHaveBeenCalledTimes(1);
            expect(daemon.info).toHaveBeenCalledWith();
        });

        it('returns the info payload produced by the daemon', async () => {
            daemon.info.mockResolvedValue(dockerInfo);

            const result = await sut.info();

            expect(result).toBe(dockerInfo);
        });

        it('propagates errors thrown while querying the daemon info', async () => {
            const error = new Error('docker daemon unreachable');
            daemon.info.mockRejectedValue(error);

            await expect(sut.info()).rejects.toThrow(error);
        });
    });
});
