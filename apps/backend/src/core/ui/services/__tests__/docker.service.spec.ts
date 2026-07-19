import { Test } from '@nestjs/testing';
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
    let mockDaemon: jest.Mocked<Pick<Docker, 'ping' | 'info'>>;
    let mockDockerClient: jest.Mocked<Pick<DockerClient, 'getClient'>>;
    let sut: DockerService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockDaemon = {
            ping: jest.fn(),
            info: jest.fn(),
        };
        mockDockerClient = {
            getClient: jest.fn().mockReturnValue(mockDaemon),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                DockerService,
                { provide: DockerClient, useValue: mockDockerClient },
            ],
        }).compile();

        sut = moduleRef.get(DockerService);
    });

    describe('ping', () => {
        it('resolves the dockerode client before pinging it', async () => {
            mockDaemon.ping.mockResolvedValue(Buffer.from('OK'));

            await sut.ping();

            expect(mockDockerClient.getClient).toHaveBeenCalledTimes(1);
            expect(mockDaemon.ping).toHaveBeenCalledTimes(1);
        });

        it('returns true when the daemon answers with an "OK" buffer', async () => {
            mockDaemon.ping.mockResolvedValue(Buffer.from('OK'));

            const result = await sut.ping();

            expect(result).toBe(true);
        });

        it('returns true when the daemon answers with an "OK" string', async () => {
            mockDaemon.ping.mockResolvedValue('OK');

            const result = await sut.ping();

            expect(result).toBe(true);
        });

        it('returns false when the daemon answers with a non-OK payload', async () => {
            mockDaemon.ping.mockResolvedValue(Buffer.from('pong'));

            const result = await sut.ping();

            expect(result).toBe(false);
        });

        it('returns false when the daemon answers with an empty payload', async () => {
            mockDaemon.ping.mockResolvedValue(Buffer.from(''));

            const result = await sut.ping();

            expect(result).toBe(false);
        });

        it('propagates errors thrown while pinging the daemon', async () => {
            const error = new Error('docker daemon unreachable');
            mockDaemon.ping.mockRejectedValue(error);

            await expect(sut.ping()).rejects.toThrow(error);
        });
    });

    describe('info', () => {
        it('resolves the dockerode client before querying info', async () => {
            mockDaemon.info.mockResolvedValue(dockerInfo);

            await sut.info();

            expect(mockDockerClient.getClient).toHaveBeenCalledTimes(1);
            expect(mockDaemon.info).toHaveBeenCalledTimes(1);
            expect(mockDaemon.info).toHaveBeenCalledWith();
        });

        it('returns the info payload produced by the daemon', async () => {
            mockDaemon.info.mockResolvedValue(dockerInfo);

            const result = await sut.info();

            expect(result).toBe(dockerInfo);
        });

        it('propagates errors thrown while querying the daemon info', async () => {
            const error = new Error('docker daemon unreachable');
            mockDaemon.info.mockRejectedValue(error);

            await expect(sut.info()).rejects.toThrow(error);
        });
    });
});
