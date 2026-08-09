import { DeploymentRunTask } from '../../domain/models/deployment-run-task.models';
import { DockerExecutor } from '../../domain/ports/docker-executor.port';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { runDeploymentUseCase } from '../run-deployment.use-case';

import { LogStore } from '@features/logs/domain/ports/log-store.port';
import { Providers } from '@features/providers/domain/ports/providers.port';

describe('runDeploymentUseCase', () => {
    const payload: DeploymentRunTask = {
        deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
        repositoryId: 42,
        commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        composerPath: 'docker-compose.yml',
        projectName: 'gitpaas',
    };

    const archive = Buffer.from('gzipped-repo-tarball');

    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'update'>>;
    let mockProviders: jest.Mocked<Pick<Providers, 'getRepositoryArchive'>>;
    let mockDockerExecutor: jest.Mocked<Pick<DockerExecutor, 'up'>>;
    let mockLogStore: jest.Mocked<Pick<LogStore, 'append' | 'complete'>>;

    const run = (): Promise<void> => {
        return runDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockProviders as unknown as Providers,
            mockDockerExecutor,
            mockLogStore as unknown as LogStore,
            payload,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeploymentsRepository = {
            update: jest.fn(),
        };
        mockProviders = {
            getRepositoryArchive: jest.fn(),
        };
        mockDockerExecutor = {
            up: jest.fn(),
        };
        mockLogStore = {
            append: jest.fn().mockResolvedValue(undefined),
            complete: jest.fn().mockResolvedValue(undefined),
        };
    });

    it('marks the deployment as running before doing any work', async () => {
        mockProviders.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(1, payload.deploymentId, { status: 'running' });
    });

    it('downloads the repository archive for the payload repository and commit', async () => {
        mockProviders.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockProviders.getRepositoryArchive).toHaveBeenCalledWith(payload.repositoryId, payload.commit);
    });

    it('brings the stack up with the archive, compose path, project name and a log listener', async () => {
        mockProviders.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockResolvedValue(undefined);

        await run();

        expect(mockDockerExecutor.up).toHaveBeenCalledWith(archive, payload.composerPath, payload.projectName, expect.any(Function));
    });

    it('fans executor output out live through the log store', async () => {
        mockProviders.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, onLog) => {
            onLog?.('building service');

            return Promise.resolve();
        });

        await run();

        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, 'building service');
    });

    it('absorbs a failing log append instead of leaving an unhandled rejection', async () => {
        mockProviders.getRepositoryArchive.mockResolvedValue(archive);
        mockLogStore.append.mockRejectedValue(new Error('log store unavailable'));
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, onLog) => {
            onLog?.('building service');

            return Promise.resolve();
        });

        await expect(run()).resolves.toBeUndefined();

        // The run still succeeds: a dropped line must not fail the deployment.
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success' });
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'success');
    });

    it('marks the deployment successful and completes the log when the stack comes up', async () => {
        mockProviders.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockImplementation((_archive, _composePath, _project, onLog) => {
            onLog?.('building service');
            onLog?.('stack up');

            return Promise.resolve();
        });

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'success' });
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'success');
    });

    it('marks the deployment failed, streams the failure line and completes when the executor throws', async () => {
        mockProviders.getRepositoryArchive.mockResolvedValue(archive);
        mockDockerExecutor.up.mockRejectedValue(new Error('build failed'));

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'build failed' });
        expect(mockLogStore.append).toHaveBeenCalledWith(payload.deploymentId, '✖ Deployment failed: build failed');
        expect(mockLogStore.complete).toHaveBeenCalledWith(payload.deploymentId, 'failed');
    });

    it('marks the deployment as failed when downloading the archive throws', async () => {
        mockProviders.getRepositoryArchive.mockRejectedValue(new Error('archive not found'));

        await run();

        expect(mockDockerExecutor.up).not.toHaveBeenCalled();
        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'archive not found' });
    });

    it('stringifies non-Error failures', async () => {
        mockProviders.getRepositoryArchive.mockRejectedValue('boom');

        await run();

        expect(mockDeploymentsRepository.update).toHaveBeenNthCalledWith(2, payload.deploymentId, { status: 'failed', error: 'boom' });
    });
});
