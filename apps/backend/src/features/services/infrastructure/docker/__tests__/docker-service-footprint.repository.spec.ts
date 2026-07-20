import type Docker from 'dockerode';

import { Service } from '../../../domain/models/service.model';
import { DockerServiceFootprintRepository } from '../docker-service-footprint.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';
import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

/**
 * Builds a listed-container summary carrying only the id the SUT reads.
 */
const containerInfo = (id: string): Docker.ContainerInfo => ({ Id: id } as Docker.ContainerInfo);

/**
 * Builds a listed-network summary carrying only the id the SUT reads.
 */
const networkInfo = (id: string): Docker.NetworkInspectInfo => ({ Id: id } as Docker.NetworkInspectInfo);

/**
 * Builds a listed-image summary carrying the id and repo tags the SUT filters on.
 */
const imageInfo = (id: string, repoTags: string[] | null): Docker.ImageInfo => (
    { Id: id, RepoTags: repoTags } as Docker.ImageInfo
);

describe('DockerServiceFootprintRepository', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service!',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    };
    const projectName = 'my-service';
    const projectFilter = { label: [`com.docker.compose.project=${projectName}`] };

    let mockListContainers: jest.Mock;
    let mockListNetworks: jest.Mock;
    let mockListImages: jest.Mock;
    let mockRemoveContainer: jest.Mock;
    let mockRemoveNetwork: jest.Mock;
    let mockRemoveImage: jest.Mock;
    let mockGetContainer: jest.Mock;
    let mockGetNetwork: jest.Mock;
    let mockGetImage: jest.Mock;
    let mockDockerClient: jest.Mocked<Pick<DockerClient, 'getClient'>>;
    let mockDiagnostics: jest.Mocked<Pick<DiagnosticLoggerService, 'log' | 'warn'>>;
    let sut: DockerServiceFootprintRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListContainers = jest.fn().mockResolvedValue([]);
        mockListNetworks = jest.fn().mockResolvedValue([]);
        mockListImages = jest.fn().mockResolvedValue([]);
        mockRemoveContainer = jest.fn().mockResolvedValue(undefined);
        mockRemoveNetwork = jest.fn().mockResolvedValue(undefined);
        mockRemoveImage = jest.fn().mockResolvedValue(undefined);
        mockGetContainer = jest.fn().mockReturnValue({ remove: mockRemoveContainer });
        mockGetNetwork = jest.fn().mockReturnValue({ remove: mockRemoveNetwork });
        mockGetImage = jest.fn().mockReturnValue({ remove: mockRemoveImage });

        const handle = {
            listContainers: mockListContainers,
            listNetworks: mockListNetworks,
            listImages: mockListImages,
            getContainer: mockGetContainer,
            getNetwork: mockGetNetwork,
            getImage: mockGetImage,
        } as unknown as jest.Mocked<
            Pick<Docker, 'listContainers' | 'listNetworks' | 'listImages' | 'getContainer' | 'getNetwork' | 'getImage'>
        >;
        mockDockerClient = { getClient: jest.fn().mockReturnValue(handle) };

        mockDiagnostics = { log: jest.fn(), warn: jest.fn() };

        sut = new DockerServiceFootprintRepository(
            mockDockerClient as unknown as DockerClient,
            mockDiagnostics as unknown as DiagnosticLoggerService,
        );
    });

    it('lists containers and networks filtered by the compose project label', async () => {
        await sut.remove(service);

        expect(mockListContainers).toHaveBeenCalledWith({ all: true, filters: projectFilter });
        expect(mockListNetworks).toHaveBeenCalledWith({ filters: projectFilter });
    });

    it('falls back to a service-<id> label when the name slugifies to empty', async () => {
        const unnamed: Service = { ...service, name: '!!!' };

        await sut.remove(unnamed);

        const fallbackFilter = { label: [`com.docker.compose.project=service-${unnamed.id}`] };
        expect(mockListContainers).toHaveBeenCalledWith({ all: true, filters: fallbackFilter });
        expect(mockListNetworks).toHaveBeenCalledWith({ filters: fallbackFilter });
    });

    it('force-removes each container of the service', async () => {
        mockListContainers.mockResolvedValue([containerInfo('c1'), containerInfo('c2')]);

        await sut.remove(service);

        expect(mockGetContainer).toHaveBeenCalledWith('c1');
        expect(mockGetContainer).toHaveBeenCalledWith('c2');
        expect(mockRemoveContainer).toHaveBeenCalledTimes(2);
        expect(mockRemoveContainer).toHaveBeenCalledWith({ force: true, v: true });
    });

    it('removes each compose network of the service', async () => {
        mockListNetworks.mockResolvedValue([networkInfo('n1')]);

        await sut.remove(service);

        expect(mockGetNetwork).toHaveBeenCalledWith('n1');
        expect(mockRemoveNetwork).toHaveBeenCalledTimes(1);
    });

    it('removes only images built locally for the project and keeps shared images', async () => {
        mockListImages.mockResolvedValue([
            imageInfo('img-built-app', [`${projectName}_app:latest`]),
            imageInfo('img-built-worker', [`${projectName}_worker:latest`]),
            imageInfo('img-shared-redis', ['redis:8']),
            imageInfo('img-no-tags', null),
        ]);

        await sut.remove(service);

        expect(mockGetImage).toHaveBeenCalledWith('img-built-app');
        expect(mockGetImage).toHaveBeenCalledWith('img-built-worker');
        expect(mockGetImage).not.toHaveBeenCalledWith('img-shared-redis');
        expect(mockGetImage).not.toHaveBeenCalledWith('img-no-tags');
        expect(mockRemoveImage).toHaveBeenCalledTimes(2);
        expect(mockRemoveImage).toHaveBeenCalledWith({ force: true });
    });

    it('catches a single resource failure, logs a warning and continues with the rest', async () => {
        mockListContainers.mockResolvedValue([containerInfo('c1'), containerInfo('c2')]);
        mockRemoveContainer.mockRejectedValueOnce(new Error('boom'));

        await expect(sut.remove(service)).resolves.toBeUndefined();

        expect(mockRemoveContainer).toHaveBeenCalledTimes(2);
        expect(mockDiagnostics.warn).toHaveBeenCalled();
    });

    it('does not throw when the daemon is unreachable while listing', async () => {
        mockListContainers.mockRejectedValue(new Error('daemon down'));
        mockListNetworks.mockRejectedValue(new Error('daemon down'));
        mockListImages.mockRejectedValue(new Error('daemon down'));

        await expect(sut.remove(service)).resolves.toBeUndefined();

        expect(mockDiagnostics.warn).toHaveBeenCalledTimes(3);
    });

    it('logs a summary of the removed resources', async () => {
        mockListContainers.mockResolvedValue([containerInfo('c1')]);
        mockListNetworks.mockResolvedValue([networkInfo('n1')]);
        mockListImages.mockResolvedValue([imageInfo('img', [`${projectName}_app:latest`])]);

        await sut.remove(service);

        expect(mockDiagnostics.log).toHaveBeenCalledTimes(1);
        expect(mockDiagnostics.log).toHaveBeenCalledWith(
            expect.stringContaining('1 container(s), 1 network(s), 1 image(s)'),
            DockerServiceFootprintRepository.name,
        );
    });
});
