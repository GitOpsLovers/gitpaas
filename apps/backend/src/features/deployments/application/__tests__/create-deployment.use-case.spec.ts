import { BadRequestException, NotFoundException } from '@nestjs/common';

import { TriggerDeploymentDto } from '../../domain/dtos/trigger-deployment.dto';
import { DockerExecutor } from '../../domain/executors/docker.executor';
import { Deployment } from '../../domain/models/deployment.model';
import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { createDeploymentUseCase } from '../create-deployment.use-case';

import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';
import { GitCommit } from '@features/providers/domain/models/git-commit.model';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { Service } from '@features/services/domain/models/service.model';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

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

    const archive = Buffer.from('gzipped-repo-tarball');

    let deploymentsRepository: jest.Mocked<DeploymentsRepository>;
    let servicesRepository: jest.Mocked<ServicesRepository>;
    let providersRepository: jest.Mocked<ProvidersRepository>;
    let dockerExecutor: jest.Mocked<DockerExecutor>;
    let logStore: jest.Mocked<LogStoreRepository>;

    beforeEach(() => {
        deploymentsRepository = {
            getAllByService: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        servicesRepository = {
            getAllByProject: jest.fn(),
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

    it('throws NotFoundException when the service does not exist', async () => {
        servicesRepository.findById.mockResolvedValue(null);

        await expect(createDeploymentUseCase(
            deploymentsRepository,
            servicesRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            triggerDto,
        )).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the service has no repository or deployment branch', async () => {
        servicesRepository.findById.mockResolvedValue({ ...service, repositoryId: '', deploymentBranch: '' });

        await expect(createDeploymentUseCase(
            deploymentsRepository,
            servicesRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            triggerDto,
        )).rejects.toThrow(BadRequestException);
    });

    it('resolves the head commit for the service repository and branch', async () => {
        servicesRepository.findById.mockResolvedValue(service);
        providersRepository.getCommit.mockResolvedValue(commit);
        providersRepository.getRepositoryArchive.mockResolvedValue(archive);
        dockerExecutor.up.mockResolvedValue(undefined);
        deploymentsRepository.create.mockResolvedValue(createdDeployment);

        await createDeploymentUseCase(
            deploymentsRepository,
            servicesRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            triggerDto,
        );

        expect(providersRepository.getCommit).toHaveBeenCalledWith(42, 'main');
    });

    it('persists the deployment with the correctly-built DTO and returns it', async () => {
        servicesRepository.findById.mockResolvedValue(service);
        providersRepository.getCommit.mockResolvedValue(commit);
        providersRepository.getRepositoryArchive.mockResolvedValue(archive);
        dockerExecutor.up.mockResolvedValue(undefined);
        deploymentsRepository.create.mockResolvedValue(createdDeployment);

        const result = await createDeploymentUseCase(
            deploymentsRepository,
            servicesRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            triggerDto,
        );

        expect(deploymentsRepository.create).toHaveBeenCalledWith({
            serviceId: service.id,
            branch: 'main',
            commit: commit.sha,
            commitMessage: 'Fix deployment healthcheck parsing',
            composerPath: 'docker-compose.yml',
            triggeredBy: 'system',
        });
        expect(result).toBe(createdDeployment);
    });

    it('fires the background run after persisting the deployment', async () => {
        servicesRepository.findById.mockResolvedValue(service);
        providersRepository.getCommit.mockResolvedValue(commit);
        providersRepository.getRepositoryArchive.mockResolvedValue(archive);
        dockerExecutor.up.mockResolvedValue(undefined);
        deploymentsRepository.create.mockResolvedValue(createdDeployment);

        await createDeploymentUseCase(
            deploymentsRepository,
            servicesRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            triggerDto,
        );

        // The run is fire-and-forget; drain the microtask queue so it can start.
        await new Promise((resolve) => setImmediate(resolve));

        expect(providersRepository.getRepositoryArchive).toHaveBeenCalledWith(42, createdDeployment.commit);
        expect(dockerExecutor.up).toHaveBeenCalledWith(archive, 'docker-compose.yml', 'my-service', expect.any(Function));
    });
});
