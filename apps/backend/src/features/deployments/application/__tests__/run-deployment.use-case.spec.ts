import { DockerExecutor } from '@core/docker/domain/executors/docker.executor';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';

import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { RunDeploymentPayload, runDeploymentUseCase } from '../run-deployment.use-case';

describe('runDeploymentUseCase', () => {
    const payload: RunDeploymentPayload = {
        deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
        repositoryId: 42,
        branch: 'main',
        composerPath: 'docker-compose.yml',
        projectName: 'artifactory',
    };

    const composeContent = 'services:\n  app:\n    image: nginx';

    let repository: jest.Mocked<DeploymentsRepository>;
    let providersRepository: jest.Mocked<ProvidersRepository>;
    let dockerExecutor: jest.Mocked<DockerExecutor>;

    beforeEach(() => {
        repository = {
            getAllByService: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        providersRepository = {
            listRepositories: jest.fn(),
            listBranches: jest.fn(),
            getFileContent: jest.fn(),
        };
        dockerExecutor = {
            up: jest.fn(),
        };
    });

    it('marks the deployment as running before doing any work', async () => {
        providersRepository.getFileContent.mockResolvedValue(composeContent);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, payload);

        expect(repository.update).toHaveBeenNthCalledWith(1, payload.deploymentId, { status: 'running' });
    });

    it('reads the compose file for the payload repository, path and branch', async () => {
        providersRepository.getFileContent.mockResolvedValue(composeContent);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, payload);

        expect(providersRepository.getFileContent).toHaveBeenCalledWith(payload.repositoryId, payload.composerPath, payload.branch);
    });

    it('brings the stack up with the compose content and project name', async () => {
        providersRepository.getFileContent.mockResolvedValue(composeContent);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, payload);

        expect(dockerExecutor.up).toHaveBeenCalledWith(composeContent, payload.projectName);
    });

    it('marks the deployment as successful when the stack comes up', async () => {
        providersRepository.getFileContent.mockResolvedValue(composeContent);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, payload);

        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success' });
    });

    it('marks the deployment as failed with the error message when the executor throws', async () => {
        providersRepository.getFileContent.mockResolvedValue(composeContent);
        dockerExecutor.up.mockRejectedValue(new Error('compose failed'));

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, payload);

        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'compose failed' });
    });

    it('marks the deployment as failed when fetching the compose file throws', async () => {
        providersRepository.getFileContent.mockRejectedValue(new Error('file not found'));

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, payload);

        expect(dockerExecutor.up).not.toHaveBeenCalled();
        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'file not found' });
    });

    it('stringifies non-Error failures', async () => {
        providersRepository.getFileContent.mockRejectedValue('boom');

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, payload);

        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'boom' });
    });
});
