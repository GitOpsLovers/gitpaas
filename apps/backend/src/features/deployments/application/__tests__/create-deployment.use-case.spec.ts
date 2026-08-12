import { CreateDeploymentDto } from '../../domain/dtos/create-deployment.dto';
import { TriggerDeploymentDto } from '../../domain/dtos/trigger-deployment.dto';
import { ServiceNotDeployableError } from '../../domain/errors/deployment.errors';
import { Deployment } from '../../domain/models/deployment.models';
import { DeploymentQueue } from '../../domain/ports/deployment-queue.port';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { createDeploymentUseCase } from '../create-deployment.use-case';
import { persistDeploymentUseCase } from '../persist-deployment.use-case';

import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { GitCommit } from '@features/source-control/domain/models/git-commit.models';
import { SourceControl } from '@features/source-control/domain/ports/source-control.port';

jest.mock('../persist-deployment.use-case');

const mockPersistDeploymentUseCase = persistDeploymentUseCase as jest.MockedFunction<typeof persistDeploymentUseCase>;

describe('createDeploymentUseCase', () => {
    const triggerDto: TriggerDeploymentDto = {
        serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    };

    const service: Service = {
        id: triggerDto.serviceId,
        name: 'My Service',
        projectId: 'a1b2c3d4-0000-0000-0000-000000000000',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    };

    const commit: GitCommit = {
        sha: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        message: 'Fix deployment healthcheck parsing\n\nMore details here',
    };

    const expectedCreateDto: CreateDeploymentDto = {
        serviceId: service.id,
        branch: 'main',
        commit: commit.sha,
        commitMessage: 'Fix deployment healthcheck parsing',
        composerPath: 'docker-compose.yml',
        triggeredBy: 'system',
    };

    const createdDeployment: Deployment = {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        serviceId: service.id,
        status: 'pending',
        branch: 'main',
        commit: commit.sha,
        commitMessage: 'Fix deployment healthcheck parsing',
        composerPath: 'docker-compose.yml',
        triggeredBy: 'system',
        error: null,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        finishedAt: null,
    };

    const mockDeploymentsRepository = {} as unknown as DeploymentsRepository;
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById'>>;
    let mockSourceControl: jest.Mocked<Pick<SourceControl, 'getCommit'>>;
    let mockQueue: jest.Mocked<Pick<DeploymentQueue, 'enqueue'>>;

    const run = (): Promise<Deployment> => {
        return createDeploymentUseCase(
            mockDeploymentsRepository,
            mockServicesRepository as unknown as ServicesRepository,
            mockSourceControl as unknown as SourceControl,
            mockQueue as unknown as DeploymentQueue,
            triggerDto,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockServicesRepository = {
            findById: jest.fn(),
        };
        mockSourceControl = {
            getCommit: jest.fn(),
        };
        mockQueue = {
            enqueue: jest.fn().mockResolvedValue(undefined),
        };
        mockPersistDeploymentUseCase.mockResolvedValue(createdDeployment);
    });

    it('throws ServiceNotFoundError when the service does not exist', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toThrow(ServiceNotFoundError);
        expect(mockPersistDeploymentUseCase).not.toHaveBeenCalled();
        expect(mockQueue.enqueue).not.toHaveBeenCalled();
    });

    it('throws ServiceNotDeployableError when the service has no repository or deployment branch', async () => {
        mockServicesRepository.findById.mockResolvedValue({ ...service, repositoryId: '', deploymentBranch: '' });

        await expect(run()).rejects.toThrow(ServiceNotDeployableError);
        expect(mockPersistDeploymentUseCase).not.toHaveBeenCalled();
        expect(mockQueue.enqueue).not.toHaveBeenCalled();
    });

    it('resolves the head commit for the service repository and branch', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockSourceControl.getCommit.mockResolvedValue(commit);

        await run();

        expect(mockSourceControl.getCommit).toHaveBeenCalledWith(42, 'main');
    });

    it('delegates persistence to persistDeploymentUseCase with the correctly-built DTO and returns its result', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockSourceControl.getCommit.mockResolvedValue(commit);

        const result = await run();

        expect(mockPersistDeploymentUseCase).toHaveBeenCalledTimes(1);
        expect(mockPersistDeploymentUseCase).toHaveBeenCalledWith(mockDeploymentsRepository, expectedCreateDto);
        expect(result).toBe(createdDeployment);
    });

    it('publishes a run request on the queue after persisting the deployment', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockSourceControl.getCommit.mockResolvedValue(commit);

        await run();

        expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
        expect(mockQueue.enqueue).toHaveBeenCalledWith({
            deploymentId: createdDeployment.id,
            repositoryId: 42,
            commit: createdDeployment.commit,
            composerPath: 'docker-compose.yml',
            projectName: 'my-service',
        });
    });
});
