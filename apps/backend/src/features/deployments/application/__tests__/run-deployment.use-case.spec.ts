import { DockerExecutor } from '@core/docker/domain/executors/docker.executor';
import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';
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
    let logStore: jest.Mocked<LogStoreRepository>;

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
        logStore = {
            append: jest.fn(),
            complete: jest.fn(),
            stream: jest.fn(),
        };
    });

    it('marks the deployment as running before doing any work', async () => {
        providersRepository.getFileContent.mockResolvedValue(composeContent);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(repository.update).toHaveBeenNthCalledWith(1, payload.deploymentId, { status: 'running' });
    });

    it('reads the compose file for the payload repository, path and branch', async () => {
        providersRepository.getFileContent.mockResolvedValue(composeContent);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(providersRepository.getFileContent).toHaveBeenCalledWith(payload.repositoryId, payload.composerPath, payload.branch);
    });

    it('brings the stack up with the compose content, project name and a log listener', async () => {
        providersRepository.getFileContent.mockResolvedValue(composeContent);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(dockerExecutor.up).toHaveBeenCalledWith(composeContent, payload.projectName, expect.any(Function));
    });

    it('forwards executor output to the log store', async () => {
        providersRepository.getFileContent.mockResolvedValue(composeContent);
        dockerExecutor.up.mockImplementation(async (_content, _project, onLog) => {
            onLog?.('pulling image');
        });

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(logStore.append).toHaveBeenCalledWith(payload.deploymentId, 'pulling image');
    });

    it('marks the deployment as successful and completes the log when the stack comes up', async () => {
        providersRepository.getFileContent.mockResolvedValue(composeContent);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success' });
        expect(logStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'success');
    });

    it('marks the deployment as failed with the error message when the executor throws', async () => {
        providersRepository.getFileContent.mockResolvedValue(composeContent);
        dockerExecutor.up.mockRejectedValue(new Error('compose failed'));

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'compose failed' });
        expect(logStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'failed');
    });

    it('marks the deployment as failed when fetching the compose file throws', async () => {
        providersRepository.getFileContent.mockRejectedValue(new Error('file not found'));

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(dockerExecutor.up).not.toHaveBeenCalled();
        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'file not found' });
    });

    it('stringifies non-Error failures', async () => {
        providersRepository.getFileContent.mockRejectedValue('boom');

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'boom' });
    });
});
