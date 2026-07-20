/* eslint-disable no-secrets/no-secrets */
import type Docker from 'dockerode';

import { DockerOrphanContainersRepository } from '../docker-orphan-containers.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';
import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

/**
 * Compose label the SUT filters on; re-declared here as the SUT keeps it private
 * (not exported from its module).
 */
const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';

/**
 * Builds a listed-container summary stamped with a compose project label.
 */
const containerInfo = (
    project: string,
    overrides: { Id?: string; Names?: string[] } = {},
): Docker.ContainerInfo => ({
    Id: overrides.Id ?? `id-${project}`,
    Names: overrides.Names ?? [`/${project}-app-1`],
    Labels: { [COMPOSE_PROJECT_LABEL]: project },
} as unknown as Docker.ContainerInfo);

describe('DockerOrphanContainersRepository', () => {
    let mockListContainers: jest.Mock;
    let mockRemove: jest.Mock;
    let mockGetContainer: jest.Mock;
    let mockDockerClient: jest.Mocked<Pick<DockerClient, 'getClient'>>;
    let mockDiagnostics: jest.Mocked<Pick<DiagnosticLoggerService, 'log' | 'warn'>>;
    let sut: DockerOrphanContainersRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListContainers = jest.fn().mockResolvedValue([]);
        mockRemove = jest.fn().mockResolvedValue(undefined);
        mockGetContainer = jest.fn().mockReturnValue({ remove: mockRemove });
        const handle = {
            listContainers: mockListContainers,
            getContainer: mockGetContainer,
        } as unknown as jest.Mocked<Pick<Docker, 'listContainers' | 'getContainer'>>;
        mockDockerClient = { getClient: jest.fn().mockReturnValue(handle) };
        mockDiagnostics = { log: jest.fn(), warn: jest.fn() };
        sut = new DockerOrphanContainersRepository(
            mockDockerClient as unknown as DockerClient,
            mockDiagnostics as unknown as DiagnosticLoggerService,
        );
    });

    it('lists only compose-labeled containers, all states included', async () => {
        await sut.removeOrphaned([]);

        expect(mockListContainers).toHaveBeenCalledTimes(1);
        expect(mockListContainers).toHaveBeenCalledWith({
            all: true,
            filters: { label: [COMPOSE_PROJECT_LABEL] },
        });
    });

    it('force-removes containers whose project is not known, dropping volumes', async () => {
        mockListContainers.mockResolvedValue([containerInfo('orphan')]);

        const result = await sut.removeOrphaned(['known']);

        expect(mockGetContainer).toHaveBeenCalledWith('id-orphan');
        expect(mockRemove).toHaveBeenCalledWith({ force: true, v: true });
        expect(result).toEqual({ removed: 1, names: ['orphan-app-1'] });
    });

    it('leaves containers of known projects untouched', async () => {
        mockListContainers.mockResolvedValue([containerInfo('known')]);

        const result = await sut.removeOrphaned(['known']);

        expect(mockGetContainer).not.toHaveBeenCalled();
        expect(mockRemove).not.toHaveBeenCalled();
        expect(result).toEqual({ removed: 0, names: [] });
    });

    it('removes only the orphaned ones from a mixed set', async () => {
        mockListContainers.mockResolvedValue([
            containerInfo('known'),
            containerInfo('orphan-a'),
            containerInfo('orphan-b'),
        ]);

        const result = await sut.removeOrphaned(['known']);

        expect(mockRemove).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ removed: 2, names: ['orphan-a-app-1', 'orphan-b-app-1'] });
    });

    it('catches and logs a per-container removal failure without aborting the rest', async () => {
        mockListContainers.mockResolvedValue([
            containerInfo('orphan-a'),
            containerInfo('orphan-b'),
        ]);
        mockRemove.mockRejectedValueOnce(new Error('container is restarting'));

        const result = await sut.removeOrphaned([]);

        expect(mockRemove).toHaveBeenCalledTimes(2);
        expect(mockDiagnostics.warn).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ removed: 1, names: ['orphan-b-app-1'] });
    });

    it('falls back to the short id when the container has no names', async () => {
        mockListContainers.mockResolvedValue([
            containerInfo('orphan', { Id: 'abcdef0123456789', Names: [] }),
        ]);

        const result = await sut.removeOrphaned([]);

        expect(result).toEqual({ removed: 1, names: ['abcdef012345'] });
    });

    it('logs a summary of how many containers were removed', async () => {
        mockListContainers.mockResolvedValue([containerInfo('orphan')]);

        await sut.removeOrphaned([]);

        expect(mockDiagnostics.log).toHaveBeenCalledWith(
            'Removed 1 orphaned container(s) from the VPS',
            'DockerOrphanContainersRepository',
        );
    });
});
