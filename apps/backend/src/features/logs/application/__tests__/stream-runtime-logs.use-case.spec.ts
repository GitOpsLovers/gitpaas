import type { RuntimeLogLine } from '@gitpaas/contracts';
import { firstValueFrom, of, Subject, toArray } from 'rxjs';

import { RuntimeLogFollower } from '../../domain/ports/runtime-log-follower.port';
import { RuntimeLogStore } from '../../domain/ports/runtime-log-store.port';
import { streamRuntimeLogsUseCase } from '../stream-runtime-logs.use-case';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE } from '@core/domain/constants/gitpaas-labels.constants';
import { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

const containerId = 'a1b2c3d4e5f6';

/** Builds a summary of a container of the runtime, overriding only the fields under test. */
const containerSummary = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: containerId,
    names: ['/web'],
    image: 'nginx:latest',
    state: 'running',
    status: 'Up 2 hours',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    projects: [],
    ports: [],
    networks: [],
    ...overrides,
});

/** Builds one line of the output of a container, overriding only the fields under test. */
const logLine = (overrides: Partial<RuntimeLogLine> = {}): RuntimeLogLine => ({
    timestamp: '2026-01-01T00:00:00.000Z',
    source: 'stdout',
    text: 'listening on 8080',
    ...overrides,
});

describe('streamRuntimeLogsUseCase', () => {
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'listContainers'>>;
    let mockRuntimeLogFollower: jest.Mocked<Pick<RuntimeLogFollower, 'follow'>>;
    let mockRuntimeLogStore: jest.Mocked<Pick<RuntimeLogStore, 'stream'>>;

    /** Runs the use case with the mocked ports and the identifier under test. */
    const run = (id: string = containerId): Promise<ReturnType<typeof mockRuntimeLogStore.stream>> =>
        streamRuntimeLogsUseCase(
            mockContainerRuntime as unknown as ContainerRuntime,
            mockRuntimeLogFollower as unknown as RuntimeLogFollower,
            mockRuntimeLogStore as unknown as RuntimeLogStore,
            id,
        );

    beforeEach(() => {
        jest.clearAllMocks();

        mockContainerRuntime = { listContainers: jest.fn() };
        mockRuntimeLogFollower = { follow: jest.fn() };
        mockRuntimeLogStore = { stream: jest.fn() };
    });

    it('reads the containers that run, and only the ones GitPaaS manages', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([]);

        await run();

        expect(mockContainerRuntime.listContainers).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.listContainers).toHaveBeenCalledWith(
            { labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE } },
            false,
        );
    });

    it('follows the container that runs, so the client waits for no round of the job', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary()]);
        mockRuntimeLogStore.stream.mockReturnValue(of(logLine()));

        await run();

        expect(mockRuntimeLogFollower.follow).toHaveBeenCalledTimes(1);
        expect(mockRuntimeLogFollower.follow).toHaveBeenCalledWith(containerId);
    });

    it('returns the live stream the store holds for that container', async () => {
        const lines = new Subject<RuntimeLogLine>();
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary()]);
        mockRuntimeLogStore.stream.mockReturnValue(lines.asObservable());

        const result = await run();

        expect(mockRuntimeLogStore.stream).toHaveBeenCalledWith(containerId);
        expect(result).toBeDefined();
    });

    it('gives the lines the store publishes, in the order the container wrote them', async () => {
        const first = logLine({ text: 'first' });
        const second = logLine({ text: 'second', source: 'stderr' });
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary()]);
        mockRuntimeLogStore.stream.mockReturnValue(of(first, second));

        const received = await firstValueFrom((await run()).pipe(toArray()));

        expect(received).toEqual([first, second]);
    });

    it('gives an empty stream for a container that does not run', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary({ id: 'ffffffffffff' })]);

        const received = await firstValueFrom((await run()).pipe(toArray()));

        expect(received).toEqual([]);
    });

    it('never follows a container that does not run', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([]);

        await run();

        expect(mockRuntimeLogFollower.follow).not.toHaveBeenCalled();
        expect(mockRuntimeLogStore.stream).not.toHaveBeenCalled();
    });

    it('propagates the failure of the daemon, which the edge turns into a 503', async () => {
        const failure = new Error('ECONNREFUSED');
        mockContainerRuntime.listContainers.mockRejectedValue(failure);

        await expect(run()).rejects.toThrow(failure);
        expect(mockRuntimeLogFollower.follow).not.toHaveBeenCalled();
    });
});
