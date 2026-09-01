import type { RuntimeLogLine } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';
import { EMPTY } from 'rxjs';

import { streamRuntimeLogsUseCase } from '../../../application/stream-runtime-logs.use-case';
import { DockerRuntimeLogFollowerAdapter } from '../../../infrastructure/docker/docker-runtime-log-follower.adapter';
import { MemoryRuntimeLogStoreAdapter } from '../../../infrastructure/memory/memory-runtime-log-store.adapter';
import { RuntimeLogsService } from '../runtime-logs.service';

import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

jest.mock('../../../application/stream-runtime-logs.use-case');

const mockStreamRuntimeLogsUseCase = streamRuntimeLogsUseCase as jest.MockedFunction<typeof streamRuntimeLogsUseCase>;

const containerId = 'a1b2c3d4e5f6';

/** Builds one line of the output of a container, overriding only the fields under test. */
const logLine = (overrides: Partial<RuntimeLogLine> = {}): RuntimeLogLine => ({
    timestamp: '2026-01-01T00:00:00.000Z',
    source: 'stdout',
    text: 'listening on 8080',
    ...overrides,
});

describe('RuntimeLogsService', () => {
    let mockContainerRuntime: jest.Mocked<DockerContainerRuntimeAdapter>;
    let mockRuntimeLogFollower: jest.Mocked<DockerRuntimeLogFollowerAdapter>;
    let mockRuntimeLogStore: jest.Mocked<Pick<MemoryRuntimeLogStoreAdapter, 'read'>>;
    let sut: RuntimeLogsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockContainerRuntime = {} as jest.Mocked<DockerContainerRuntimeAdapter>;
        mockRuntimeLogFollower = {} as jest.Mocked<DockerRuntimeLogFollowerAdapter>;
        mockRuntimeLogStore = { read: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                RuntimeLogsService,
                { provide: DockerContainerRuntimeAdapter, useValue: mockContainerRuntime },
                { provide: DockerRuntimeLogFollowerAdapter, useValue: mockRuntimeLogFollower },
                { provide: MemoryRuntimeLogStoreAdapter, useValue: mockRuntimeLogStore },
            ],
        }).compile();

        sut = moduleRef.get(RuntimeLogsService);
    });

    describe('getByContainer', () => {
        it('delegates the read to the store with the container and the options received', async () => {
            const since = new Date('2026-01-01T00:00:00.000Z');
            mockRuntimeLogStore.read.mockResolvedValue([]);

            await sut.getByContainer(containerId, { tail: 100, since });

            expect(mockRuntimeLogStore.read).toHaveBeenCalledTimes(1);
            expect(mockRuntimeLogStore.read).toHaveBeenCalledWith(containerId, { tail: 100, since });
        });

        it('returns the lines the store holds', async () => {
            const lines = [logLine()];
            mockRuntimeLogStore.read.mockResolvedValue(lines);

            await expect(sut.getByContainer(containerId, {})).resolves.toBe(lines);
        });

        it('returns an empty list for a container that wrote nothing', async () => {
            mockRuntimeLogStore.read.mockResolvedValue([]);

            await expect(sut.getByContainer(containerId, {})).resolves.toEqual([]);
        });

        it('propagates a failure of the store', async () => {
            const failure = new Error('database down');
            mockRuntimeLogStore.read.mockRejectedValue(failure);

            await expect(sut.getByContainer(containerId, {})).rejects.toThrow(failure);
        });

        it('adds the number of the lines it read to the telemetry event', async () => {
            mockRuntimeLogStore.read.mockResolvedValue([logLine(), logLine()]);

            const event = await runWithTelemetry({}, async () => {
                await sut.getByContainer(containerId, {});

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'container.log_lines': 2 });
        });
    });

    describe('streamByContainer', () => {
        it('delegates to the use case with the injected collaborators and the container', async () => {
            mockStreamRuntimeLogsUseCase.mockResolvedValue(EMPTY);

            await sut.streamByContainer(containerId);

            expect(mockStreamRuntimeLogsUseCase).toHaveBeenCalledTimes(1);
            expect(mockStreamRuntimeLogsUseCase).toHaveBeenCalledWith(
                mockContainerRuntime,
                mockRuntimeLogFollower,
                mockRuntimeLogStore,
                containerId,
            );
        });

        it('returns the stream the use case gives, with no change', async () => {
            mockStreamRuntimeLogsUseCase.mockResolvedValue(EMPTY);

            await expect(sut.streamByContainer(containerId)).resolves.toBe(EMPTY);
        });

        it('propagates the failure of the use case, which the edge turns into a 503', async () => {
            const failure = new Error('ECONNREFUSED');
            mockStreamRuntimeLogsUseCase.mockRejectedValue(failure);

            await expect(sut.streamByContainer(containerId)).rejects.toThrow(failure);
        });
    });
});
