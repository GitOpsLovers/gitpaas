import { ProxyHealthProbeAdapter } from '../proxy-health-probe.adapter';

import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

/** Builds a container summary fixture, overriding only the fields under test. */
const containerSummary = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: 'c0ffee00c0ffee00',
    names: ['/gitpaas-proxy'],
    image: 'gitpaas/proxy:latest',
    state: 'running',
    status: 'Up 3 hours',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    projects: ['gitpaas'],
    ports: [],
    networks: [],
    mounts: [],
    ...overrides,
});

describe('ProxyHealthProbeAdapter', () => {
    let envBackup: NodeJS.ProcessEnv;
    let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'listContainers'>>;
    let sut: ProxyHealthProbeAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        envBackup = { ...process.env };
        process.env.NODE_ENV = 'production';

        mockContainerRuntime = { listContainers: jest.fn().mockResolvedValue([containerSummary()]) };
        sut = new ProxyHealthProbeAdapter(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
    });

    afterEach(() => {
        process.env = envBackup;
    });

    it('is named proxy', () => {
        expect(sut.name).toBe('proxy');
    });

    it('reports up when the container gitpaas-proxy runs', async () => {
        await expect(sut.check()).resolves.toBe('up');
    });

    it('reports down when the container gitpaas-proxy is stopped', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary({ state: 'exited' })]);

        await expect(sut.check()).resolves.toBe('down');
    });

    it('never watches a container of another service of the stack', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary({ names: ['/gitpaas-postgres'] })]);

        await expect(sut.check()).resolves.toBe('down');
    });

    it('reports not-applicable outside of production, because the stack runs no such container', async () => {
        process.env.NODE_ENV = 'development';

        await expect(sut.check()).resolves.toBe('not-applicable');
    });
});
