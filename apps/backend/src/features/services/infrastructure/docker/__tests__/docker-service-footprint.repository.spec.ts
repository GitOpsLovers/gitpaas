import { Service } from '../../../domain/models/service.model';
import { DockerServiceFootprintRepository } from '../docker-service-footprint.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';
import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

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

    let listContainers: jest.Mock;
    let listNetworks: jest.Mock;
    let listImages: jest.Mock;
    let removeContainer: jest.Mock;
    let removeNetwork: jest.Mock;
    let removeImage: jest.Mock;
    let getContainer: jest.Mock;
    let getNetwork: jest.Mock;
    let getImage: jest.Mock;
    let client: jest.Mocked<DockerClient>;
    let diagnostics: jest.Mocked<DiagnosticLoggerService>;
    let repository: DockerServiceFootprintRepository;

    beforeEach(() => {
        listContainers = jest.fn().mockResolvedValue([]);
        listNetworks = jest.fn().mockResolvedValue([]);
        listImages = jest.fn().mockResolvedValue([]);
        removeContainer = jest.fn().mockResolvedValue(undefined);
        removeNetwork = jest.fn().mockResolvedValue(undefined);
        removeImage = jest.fn().mockResolvedValue(undefined);
        getContainer = jest.fn().mockReturnValue({ remove: removeContainer });
        getNetwork = jest.fn().mockReturnValue({ remove: removeNetwork });
        getImage = jest.fn().mockReturnValue({ remove: removeImage });

        client = {
            getClient: jest.fn().mockReturnValue({
                listContainers,
                listNetworks,
                listImages,
                getContainer,
                getNetwork,
                getImage,
            }),
        } as unknown as jest.Mocked<DockerClient>;

        diagnostics = {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        } as unknown as jest.Mocked<DiagnosticLoggerService>;

        repository = new DockerServiceFootprintRepository(client, diagnostics);
    });

    it('lists containers and networks filtered by the compose project label', async () => {
        await repository.remove(service);

        expect(listContainers).toHaveBeenCalledWith({ all: true, filters: projectFilter });
        expect(listNetworks).toHaveBeenCalledWith({ filters: projectFilter });
    });

    it('falls back to a service-<id> label when the name slugifies to empty', async () => {
        const unnamed: Service = { ...service, name: '!!!' };

        await repository.remove(unnamed);

        const fallbackFilter = { label: [`com.docker.compose.project=service-${unnamed.id}`] };
        expect(listContainers).toHaveBeenCalledWith({ all: true, filters: fallbackFilter });
        expect(listNetworks).toHaveBeenCalledWith({ filters: fallbackFilter });
    });

    it('force-removes each container of the service', async () => {
        listContainers.mockResolvedValue([{ Id: 'c1' }, { Id: 'c2' }]);

        await repository.remove(service);

        expect(getContainer).toHaveBeenCalledWith('c1');
        expect(getContainer).toHaveBeenCalledWith('c2');
        expect(removeContainer).toHaveBeenCalledTimes(2);
        expect(removeContainer).toHaveBeenCalledWith({ force: true, v: true });
    });

    it('removes each compose network of the service', async () => {
        listNetworks.mockResolvedValue([{ Id: 'n1' }]);

        await repository.remove(service);

        expect(getNetwork).toHaveBeenCalledWith('n1');
        expect(removeNetwork).toHaveBeenCalledTimes(1);
    });

    it('removes only images built locally for the project and keeps shared images', async () => {
        listImages.mockResolvedValue([
            { Id: 'img-built-app', RepoTags: [`${projectName}_app:latest`] },
            { Id: 'img-built-worker', RepoTags: [`${projectName}_worker:latest`] },
            { Id: 'img-shared-redis', RepoTags: ['redis:8'] },
            { Id: 'img-no-tags', RepoTags: null },
        ]);

        await repository.remove(service);

        expect(getImage).toHaveBeenCalledWith('img-built-app');
        expect(getImage).toHaveBeenCalledWith('img-built-worker');
        expect(getImage).not.toHaveBeenCalledWith('img-shared-redis');
        expect(getImage).not.toHaveBeenCalledWith('img-no-tags');
        expect(removeImage).toHaveBeenCalledTimes(2);
        expect(removeImage).toHaveBeenCalledWith({ force: true });
    });

    it('catches a single resource failure, logs a warning and continues with the rest', async () => {
        listContainers.mockResolvedValue([{ Id: 'c1' }, { Id: 'c2' }]);
        removeContainer.mockRejectedValueOnce(new Error('boom'));

        await expect(repository.remove(service)).resolves.toBeUndefined();

        expect(removeContainer).toHaveBeenCalledTimes(2);
        expect(diagnostics.warn).toHaveBeenCalled();
    });

    it('does not throw when the daemon is unreachable while listing', async () => {
        listContainers.mockRejectedValue(new Error('daemon down'));
        listNetworks.mockRejectedValue(new Error('daemon down'));
        listImages.mockRejectedValue(new Error('daemon down'));

        await expect(repository.remove(service)).resolves.toBeUndefined();

        expect(diagnostics.warn).toHaveBeenCalledTimes(3);
    });

    it('logs a summary of the removed resources', async () => {
        listContainers.mockResolvedValue([{ Id: 'c1' }]);
        listNetworks.mockResolvedValue([{ Id: 'n1' }]);
        listImages.mockResolvedValue([{ Id: 'img', RepoTags: [`${projectName}_app:latest`] }]);

        await repository.remove(service);

        expect(diagnostics.log).toHaveBeenCalledTimes(1);
        expect(diagnostics.log).toHaveBeenCalledWith(
            expect.stringContaining('1 container(s), 1 network(s), 1 image(s)'),
            DockerServiceFootprintRepository.name,
        );
    });
});
