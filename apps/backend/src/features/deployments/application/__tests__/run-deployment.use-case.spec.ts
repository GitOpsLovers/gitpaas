import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { RunDeploymentPayload, runDeploymentUseCase } from '../run-deployment.use-case';

import { DockerExecutor } from '@core/docker/domain/executors/docker.executor';
import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';

describe('runDeploymentUseCase', () => {
    const payload: RunDeploymentPayload = {
        deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
        repositoryId: 42,
        commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        composerPath: 'docker-compose.yml',
        projectName: 'artifactory',
    };

    const archive = Buffer.from('gzipped-repo-tarball');

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
            getCommit: jest.fn(),
            getFileContent: jest.fn(),
            getRepositoryArchive: jest.fn(),
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
        providersRepository.getRepositoryArchive.mockResolvedValue(archive);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(repository.update).toHaveBeenNthCalledWith(1, payload.deploymentId, { status: 'running' });
    });

    it('downloads the repository archive for the payload repository and commit', async () => {
        providersRepository.getRepositoryArchive.mockResolvedValue(archive);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(providersRepository.getRepositoryArchive).toHaveBeenCalledWith(payload.repositoryId, payload.commit);
    });

    it('brings the stack up with the archive, compose path, project name and a log listener', async () => {
        providersRepository.getRepositoryArchive.mockResolvedValue(archive);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(dockerExecutor.up).toHaveBeenCalledWith(archive, payload.composerPath, payload.projectName, expect.any(Function));
    });

    it('forwards executor output to the log store', async () => {
        providersRepository.getRepositoryArchive.mockResolvedValue(archive);
        dockerExecutor.up.mockImplementation(async (_archive, _composePath, _project, onLog) => {
            onLog?.('building service');
        });

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(logStore.append).toHaveBeenCalledWith(payload.deploymentId, 'building service');
    });

    it('marks the deployment as successful and completes the log when the stack comes up', async () => {
        providersRepository.getRepositoryArchive.mockResolvedValue(archive);
        dockerExecutor.up.mockResolvedValue(undefined);

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success' });
        expect(logStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'success');
    });

    it('marks the deployment as failed with the error message when the executor throws', async () => {
        providersRepository.getRepositoryArchive.mockResolvedValue(archive);
        dockerExecutor.up.mockRejectedValue(new Error('build failed'));

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'build failed' });
        expect(logStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'failed');
    });

    it('marks the deployment as failed when downloading the archive throws', async () => {
        providersRepository.getRepositoryArchive.mockRejectedValue(new Error('archive not found'));

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(dockerExecutor.up).not.toHaveBeenCalled();
        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'archive not found' });
    });

    it('stringifies non-Error failures', async () => {
        providersRepository.getRepositoryArchive.mockRejectedValue('boom');

        await runDeploymentUseCase(repository, providersRepository, dockerExecutor, logStore, payload);

        expect(repository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'boom' });
    });
});
