import { StackContainerHealthProbeAdapter } from '../stack-container-health-probe.adapter';

import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

/** Builds a container summary fixture, overriding only the fields under test. */
const containerSummary = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: 'c0ffee00c0ffee00',
    names: ['/gitpaas-watched'],
    image: 'gitpaas/watched:latest',
    state: 'running',
    status: 'Up 3 hours',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    projects: ['gitpaas'],
    ports: [],
    ...overrides,
});

/** Concrete probe used to exercise the abstract base class. */
class WatchedContainerHealthProbeAdapter extends StackContainerHealthProbeAdapter {
    public readonly name = 'watched';

    protected readonly containerName = 'gitpaas-watched';
}

describe('StackContainerHealthProbeAdapter', () => {
    let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'listContainers'>>;
    let sut: WatchedContainerHealthProbeAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockContainerRuntime = { listContainers: jest.fn().mockResolvedValue([containerSummary()]) };
        sut = new WatchedContainerHealthProbeAdapter(
            mockContainerRuntime as unknown as DockerContainerRuntimeAdapter,
        );
    });

    it('lists the stopped containers too, so a stopped container is reported down instead of missing', async () => {
        await sut.check();

        expect(mockContainerRuntime.listContainers).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.listContainers).toHaveBeenCalledWith({}, true);
    });

    it('reports up when the watched container runs', async () => {
        await expect(sut.check()).resolves.toBe(true);
    });

    it('reports up when the runtime reports the name without its leading slash', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary({ names: ['gitpaas-watched'] })]);

        await expect(sut.check()).resolves.toBe(true);
    });

    it('reports up when the watched name is one of several the container carries', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([
            containerSummary({ names: ['/gitpaas-watched-1', '/gitpaas-watched'] }),
        ]);

        await expect(sut.check()).resolves.toBe(true);
    });

    it('reports down when the watched container is stopped', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary({ state: 'exited' })]);

        await expect(sut.check()).resolves.toBe(false);
    });

    it('reports down when the watched container restarts', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary({ state: 'restarting' })]);

        await expect(sut.check()).resolves.toBe(false);
    });

    it('reports down when no container carries the watched name', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary({ names: ['/gitpaas-other'] })]);

        await expect(sut.check()).resolves.toBe(false);
    });

    it('never mistakes a container whose name merely starts with the watched one', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([
            containerSummary({ names: ['/gitpaas-watched-replica'] }),
        ]);

        await expect(sut.check()).resolves.toBe(false);
    });

    it('reports down when the runtime lists no container at all', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([]);

        await expect(sut.check()).resolves.toBe(false);
    });

    it('reports down when the listing rejects, without propagating the error', async () => {
        mockContainerRuntime.listContainers.mockRejectedValue(new Error('daemon unreachable'));

        await expect(sut.check()).resolves.toBe(false);
    });

    it('reports down when the listing throws synchronously', async () => {
        mockContainerRuntime.listContainers.mockImplementation(() => {
            throw new Error('could not create the Docker client');
        });

        await expect(sut.check()).resolves.toBe(false);
    });
});
