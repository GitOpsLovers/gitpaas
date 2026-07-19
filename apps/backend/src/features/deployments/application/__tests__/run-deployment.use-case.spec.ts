import { DockerExecutor } from '../../domain/executors/docker.executor';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { RunDeploymentPayload, runDeploymentUseCase } from '../run-deployment.use-case';

import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';

describe('runDeploymentUseCase', () => {
    const payload: RunDeploymentPayload = {
        deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
        repositoryId: 42,
        commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        composerPath: 'docker-compose.yml',
        projectName: 'gitpaas',
    };

    const archive = Buffer.from('gzipped-repo-tarball');

    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'update'>>;
    let mockProvidersRepository: jest.Mocked<Pick<ProvidersRepository, 'getRepositoryArchive'>>;
    let mockDockerExecutor: jest.Mocked<Pick<DockerExecutor, 'up'>>;
    let mockLogStoreRepository: jest.Mocked<Pick<LogStoreRepository, 'append' | 'complete'>>;

    const run = (): Promise<void> => {
        return runDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockProvidersRepository as unknown as ProvidersRepository,
            mockDockerExecutor,
            mockLogStoreRepository as unknown as LogStoreRepository,
            payload,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeploymentsRepository = {
            update: jest.fn(),
        };
        mockProvidersRepository = {
            getRepositoryArchive: jest.fn(),
        };
        mockDockerExecutor = {
            up: jest.fn(),
        };
        mockLogStoreRepository = {
            append: jest.fn(),
            complete: jest.fn(),
        };
    });

    it('marks the deployment as running before doing any work', async () => {
        mockProvidersRepository.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(1, payload.deploymentId, { status: 'running' });
    });

    it('downloads the repository archive for the payload repository and commit', async () => {
        mockProvidersRepository.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockProvidersRepository.getRepositoryArchive).toHaveBeenCalledWith(payload.repositoryId, payload.commit);
    });

    it('brings the stack up with the archive, compose path, project name and a log listener', async () => {
        mockProvidersRepository.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockDockerExecutor.up).toHaveBeenCalledWith(archive, payload.composerPath, payload.projectName, expect.any(Function));
    });

    it('fans executor output out live through the log store', async () => {
        mockProvidersRepository.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, onLog) => {
            onLog?.('building service');

            return Promise.resolve();
        });

        await run();

        expect(mockLogStoreRepository.append).toHaveBeenCalledWith(payload.deploymentId, 'building service');
    });

    it('marks the deployment successful and completes the log when the stack comes up', async () => {
        mockProvidersRepository.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, onLog) => {
            onLog?.('building service');
            onLog?.('stack up');

            return Promise.resolve();
        });

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success' });
        expect(mockLogStoreRepository.complete).toHaveBeenCalledWith(payload.deploymentId, 'success');
    });

    it('marks the deployment failed, streams the failure line and completes when the executor throws', async () => {
        mockProvidersRepository.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockRejectedValue(new Error('build failed'));

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'build failed' });
        expect(mockLogStoreRepository.append).toHaveBeenCalledWith(payload.deploymentId, '✖ Deployment failed: build failed');
        expect(mockLogStoreRepository.complete).toHaveBeenCalledWith(payload.deploymentId, 'failed');
    });

    it('marks the deployment as failed when downloading the archive throws', async () => {
        mockProvidersRepository.getRepositoryArchive.mockRejectedValue(new Error('archive not found'));

        await run();

        expect(mockDockerExecutor.up).not.toHaveBeenCalled();
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'archive not found' });
    });

    it('stringifies non-Error failures', async () => {
        mockProvidersRepository.getRepositoryArchive.mockRejectedValue('boom');

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'boom' });
    });
});
