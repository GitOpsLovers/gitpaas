import { FrontendHealthProbeAdapter } from '../frontend-health-probe.adapter';

import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

/** Builds a container summary fixture, overriding only the fields under test. */
const containerSummary = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: 'c0ffee00c0ffee00',
    names: ['/gitpaas-frontend'],
    image: 'gitpaas/frontend:latest',
    state: 'running',
    status: 'Up 3 hours',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    projects: ['gitpaas'],
    ports: [],
    ...overrides,
});

describe('FrontendHealthProbeAdapter', () => {
    let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'listContainers'>>;
    let sut: FrontendHealthProbeAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockContainerRuntime = { listContainers: jest.fn().mockResolvedValue([containerSummary()]) };
        sut = new FrontendHealthProbeAdapter(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
    });

    it('is named frontend', () => {
        expect(sut.name).toBe('frontend');
    });

    it('reports up when the container gitpaas-frontend runs', async () => {
        await expect(sut.check()).resolves.toBe(true);
    });

    it('reports down when the container gitpaas-frontend is stopped', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary({ state: 'exited' })]);

        await expect(sut.check()).resolves.toBe(false);
    });

    it('never watches a container of another service of the stack', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([containerSummary({ names: ['/gitpaas-postgres'] })]);

        await expect(sut.check()).resolves.toBe(false);
    });
});
