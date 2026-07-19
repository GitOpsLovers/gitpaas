import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { createDeploymentUseCase } from '../../../application/create-deployment.use-case';
import { deleteDeploymentUseCase } from '../../../application/delete-deployment.use-case';
import { findDeploymentByIdUseCase } from '../../../application/find-deployment-by-id.use-case';
import { getDeploymentsByServiceUseCase } from '../../../application/get-deployments-by-service.use-case';
import { TriggerDeploymentDto } from '../../../domain/dtos/trigger-deployment.dto';
import { ServiceNotDeployableError, ServiceNotFoundError } from '../../../domain/errors/deployment.errors';
import { Deployment } from '../../../domain/models/deployment.model';
import { DeploymentQueue } from '../../../domain/queues/deployment.queue';
import { DatabaseDeploymentQueue } from '../../../infrastructure/database/database-deployment.queue';
import { DeploymentsDatabaseRepository } from '../../../infrastructure/database/deployments-db.repository';
import { DeploymentsService } from '../deployments.service';

import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';
import { PersistentLogStoreRepository } from '@features/logs/infrastructure/log-store/persistent-log-store.repository';
import { GithubAppProvider } from '@features/providers/infrastructure/github/github-app.provider';
import { ServicesDatabaseRepository } from '@features/services/infrastructure/database/services-db.repository';

jest.mock('../../../application/create-deployment.use-case');
jest.mock('../../../application/delete-deployment.use-case');
jest.mock('../../../application/find-deployment-by-id.use-case');
jest.mock('../../../application/get-deployments-by-service.use-case');

const mockCreateDeploymentUseCase = createDeploymentUseCase as jest.MockedFunction<
    typeof createDeploymentUseCase
>;
const mockDeleteDeploymentUseCase = deleteDeploymentUseCase as jest.MockedFunction<
    typeof deleteDeploymentUseCase
>;
const mockFindDeploymentByIdUseCase = findDeploymentByIdUseCase as jest.MockedFunction<
    typeof findDeploymentByIdUseCase
>;
const mockGetDeploymentsByServiceUseCase = getDeploymentsByServiceUseCase as jest.MockedFunction<
    typeof getDeploymentsByServiceUseCase
>;

const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';

const deployment: Deployment = {
    id: deploymentId,
    serviceId,
    status: 'success',
    branch: 'main',
    commit: 'abc123',
    commitMessage: 'feat: something',
    composerPath: 'docker-compose.yml',
    triggeredBy: 'marc',
    error: null,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    finishedAt: new Date('2026-07-11T00:01:00.000Z'),
};

describe('DeploymentsService', () => {
    let mockDeploymentsRepository: jest.Mocked<DeploymentsDatabaseRepository>;
    let mockServicesRepository: jest.Mocked<ServicesDatabaseRepository>;
    let mockProvidersRepository: jest.Mocked<GithubAppProvider>;
    let mockQueue: jest.Mocked<Pick<DeploymentQueue, 'enqueue'>>;
    let mockLogStore: jest.Mocked<LogStoreRepository>;
    let sut: DeploymentsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockDeploymentsRepository = {} as jest.Mocked<DeploymentsDatabaseRepository>;
        mockServicesRepository = {} as jest.Mocked<ServicesDatabaseRepository>;
        mockProvidersRepository = {} as jest.Mocked<GithubAppProvider>;
        mockQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };
        mockLogStore = {
            append: jest.fn(),
            complete: jest.fn(),
            stream: jest.fn(),
            purge: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            providers: [
                DeploymentsService,
                { provide: DeploymentsDatabaseRepository, useValue: mockDeploymentsRepository },
                { provide: ServicesDatabaseRepository, useValue: mockServicesRepository },
                { provide: GithubAppProvider, useValue: mockProvidersRepository },
                { provide: DatabaseDeploymentQueue, useValue: mockQueue },
                { provide: PersistentLogStoreRepository, useValue: mockLogStore },
            ],
        }).compile();

        sut = moduleRef.get(DeploymentsService);
    });

    describe('getAllByService', () => {
        it('delegates to the use case with the repository and service id', async () => {
            mockGetDeploymentsByServiceUseCase.mockResolvedValue([deployment]);

            await sut.getAllByService(serviceId);

            expect(mockGetDeploymentsByServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetDeploymentsByServiceUseCase).toHaveBeenCalledWith(mockDeploymentsRepository, serviceId);
        });

        it('returns the deployments produced by the use case', async () => {
            mockGetDeploymentsByServiceUseCase.mockResolvedValue([deployment]);

            const result = await sut.getAllByService(serviceId);

            expect(result).toEqual([deployment]);
        });

        it('returns an empty list when the service has no deployments', async () => {
            mockGetDeploymentsByServiceUseCase.mockResolvedValue([]);

            const result = await sut.getAllByService(serviceId);

            expect(result).toEqual([]);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockGetDeploymentsByServiceUseCase.mockRejectedValue(error);

            await expect(sut.getAllByService(serviceId)).rejects.toThrow(error);
        });
    });

    describe('findById', () => {
        it('delegates to the use case with the repository and id', async () => {
            mockFindDeploymentByIdUseCase.mockResolvedValue(deployment);

            await sut.findById(deploymentId);

            expect(mockFindDeploymentByIdUseCase).toHaveBeenCalledTimes(1);
            expect(mockFindDeploymentByIdUseCase).toHaveBeenCalledWith(mockDeploymentsRepository, deploymentId);
        });

        it('returns the deployment produced by the use case', async () => {
            mockFindDeploymentByIdUseCase.mockResolvedValue(deployment);

            const result = await sut.findById(deploymentId);

            expect(result).toBe(deployment);
        });

        it('returns null when the deployment does not exist', async () => {
            mockFindDeploymentByIdUseCase.mockResolvedValue(null);

            const result = await sut.findById(deploymentId);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockFindDeploymentByIdUseCase.mockRejectedValue(error);

            await expect(sut.findById(deploymentId)).rejects.toThrow(error);
        });
    });

    describe('delete', () => {
        it('delegates to the use case with the repository and id', async () => {
            mockDeleteDeploymentUseCase.mockResolvedValue(true);

            await sut.delete(deploymentId);

            expect(mockDeleteDeploymentUseCase).toHaveBeenCalledTimes(1);
            expect(mockDeleteDeploymentUseCase).toHaveBeenCalledWith(mockDeploymentsRepository, mockLogStore, deploymentId);
        });

        it('returns true when a row was deleted', async () => {
            mockDeleteDeploymentUseCase.mockResolvedValue(true);

            const result = await sut.delete(deploymentId);

            expect(result).toBe(true);
        });

        it('returns false when nothing was deleted', async () => {
            mockDeleteDeploymentUseCase.mockResolvedValue(false);

            const result = await sut.delete(deploymentId);

            expect(result).toBe(false);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockDeleteDeploymentUseCase.mockRejectedValue(error);

            await expect(sut.delete(deploymentId)).rejects.toThrow(error);
        });
    });

    describe('create', () => {
        const triggerDto: TriggerDeploymentDto = { serviceId };

        it('delegates to the use case threading every collaborator and the dto', async () => {
            mockCreateDeploymentUseCase.mockResolvedValue(deployment);

            await sut.create(triggerDto);

            expect(mockCreateDeploymentUseCase).toHaveBeenCalledTimes(1);
            expect(mockCreateDeploymentUseCase).toHaveBeenCalledWith(
                mockDeploymentsRepository,
                mockServicesRepository,
                mockProvidersRepository,
                mockQueue,
                triggerDto,
            );
        });

        it('returns the created deployment', async () => {
            mockCreateDeploymentUseCase.mockResolvedValue(deployment);

            const result = await sut.create(triggerDto);

            expect(result).toBe(deployment);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('service not found');
            mockCreateDeploymentUseCase.mockRejectedValue(error);

            await expect(sut.create(triggerDto)).rejects.toThrow(error);
        });

        it('translates a ServiceNotFoundError into a NotFoundException', async () => {
            mockCreateDeploymentUseCase.mockRejectedValue(new ServiceNotFoundError(serviceId));

            await expect(sut.create(triggerDto)).rejects.toThrow(NotFoundException);
            await expect(sut.create(triggerDto)).rejects.toThrow(`Service ${serviceId} not found`);
        });

        it('translates a ServiceNotDeployableError into a BadRequestException', async () => {
            mockCreateDeploymentUseCase.mockRejectedValue(new ServiceNotDeployableError());

            await expect(sut.create(triggerDto)).rejects.toThrow(BadRequestException);
            await expect(sut.create(triggerDto)).rejects.toThrow(
                'Service has no repository or deployment branch configured',
            );
        });
    });
});
