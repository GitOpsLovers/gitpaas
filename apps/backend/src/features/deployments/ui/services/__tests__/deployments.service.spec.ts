import { Test } from '@nestjs/testing';

import { createDeploymentUseCase } from '../../../application/create-deployment.use-case';
import { deleteDeploymentUseCase } from '../../../application/delete-deployment.use-case';
import { findDeploymentByIdUseCase } from '../../../application/find-deployment-by-id.use-case';
import { getDeploymentsByServiceUseCase } from '../../../application/get-deployments-by-service.use-case';
import { TriggerDeploymentDto } from '../../../domain/dtos/trigger-deployment.dto';
import { ServiceNotDeployableError } from '../../../domain/errors/deployment.errors';
import { Deployment } from '../../../domain/models/deployment.models';
import { DeploymentQueue } from '../../../domain/ports/deployment-queue.port';
import { DatabaseDeploymentQueueAdapter } from '../../../infrastructure/database/db-deployment-queue.adapter';
import { DatabaseDeploymentsRepository } from '../../../infrastructure/database/db-deployments.repository';
import { DeploymentsService } from '../deployments.service';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { LogStore } from '@features/logs/domain/ports/log-store.port';
import { RedisLogStoreAdapter } from '@features/logs/infrastructure/redis/redis-log-store.adapter';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';
import { DatabaseProvidersRepository } from '@features/providers/infrastructure/database/db-providers.repository';
import { GithubProviderClientAdapter } from '@features/providers/infrastructure/github/github-provider-client.adapter';

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
    let mockDeploymentsRepository: jest.Mocked<DatabaseDeploymentsRepository>;
    let mockServicesRepository: jest.Mocked<DatabaseServicesRepository>;
    let mockProvidersRepository: jest.Mocked<DatabaseProvidersRepository>;
    let mockProviderClient: jest.Mocked<GithubProviderClientAdapter>;
    let mockQueue: jest.Mocked<Pick<DeploymentQueue, 'enqueue'>>;
    let mockLogStore: jest.Mocked<LogStore>;
    let sut: DeploymentsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockDeploymentsRepository = {} as jest.Mocked<DatabaseDeploymentsRepository>;
        mockServicesRepository = {} as jest.Mocked<DatabaseServicesRepository>;
        mockProvidersRepository = {} as jest.Mocked<DatabaseProvidersRepository>;
        mockProviderClient = {} as jest.Mocked<GithubProviderClientAdapter>;
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
                { provide: DatabaseDeploymentsRepository, useValue: mockDeploymentsRepository },
                { provide: DatabaseServicesRepository, useValue: mockServicesRepository },
                { provide: DatabaseProvidersRepository, useValue: mockProvidersRepository },
                { provide: GithubProviderClientAdapter, useValue: mockProviderClient },
                { provide: DatabaseDeploymentQueueAdapter, useValue: mockQueue },
                { provide: RedisLogStoreAdapter, useValue: mockLogStore },
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
                mockProviderClient,
                mockQueue,
                triggerDto,
            );
        });

        it('threads the providers repository so the use case can load the credentials of the provider', async () => {
            mockCreateDeploymentUseCase.mockResolvedValue(deployment);

            await sut.create(triggerDto);

            expect(mockCreateDeploymentUseCase.mock.calls[0]?.[2]).toBe(mockProvidersRepository);
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

        it('propagates a ServiceNotFoundError raised by the use case unchanged', async () => {
            const error = new ServiceNotFoundError(serviceId);
            mockCreateDeploymentUseCase.mockRejectedValue(error);

            await expect(sut.create(triggerDto)).rejects.toBe(error);
        });

        it('propagates a ServiceNotDeployableError raised by the use case unchanged', async () => {
            const error = new ServiceNotDeployableError();
            mockCreateDeploymentUseCase.mockRejectedValue(error);

            await expect(sut.create(triggerDto)).rejects.toBe(error);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the business context of the deployment it read', async () => {
            mockFindDeploymentByIdUseCase.mockResolvedValue(deployment);

            const event = await runWithTelemetry({}, async () => {
                await sut.findById(deploymentId);

                return getTelemetry();
            });

            expect(event).toEqual({
                'service.id': serviceId,
                'deployment.id': deploymentId,
                'deployment.status': 'success',
                'deployment.branch': 'main',
                'deployment.trigger': 'marc',
                'deployment.compose_path': 'docker-compose.yml',
                'deployment.commit': 'abc123',
            });
        });

        it('never adds the commit message', async () => {
            mockFindDeploymentByIdUseCase.mockResolvedValue(deployment);

            const event = await runWithTelemetry({}, async () => {
                await sut.findById(deploymentId);

                return getTelemetry();
            });

            expect(JSON.stringify(event)).not.toContain(String(deployment.commitMessage));
        });

        it('omits the commit when the deployment has none', async () => {
            mockFindDeploymentByIdUseCase.mockResolvedValue({ ...deployment, commit: null });

            const event = await runWithTelemetry({}, async () => {
                await sut.findById(deploymentId);

                return getTelemetry();
            });

            expect(Object.keys(event ?? {})).not.toContain('deployment.commit');
        });

        it('adds nothing when the deployment does not exist', async () => {
            mockFindDeploymentByIdUseCase.mockResolvedValue(null);

            const event = await runWithTelemetry({}, async () => {
                await sut.findById(deploymentId);

                return getTelemetry();
            });

            expect(event).toEqual({});
        });

        it('adds the business context of the deployment it created', async () => {
            mockCreateDeploymentUseCase.mockResolvedValue(deployment);

            const event = await runWithTelemetry({}, async () => {
                await sut.create({ serviceId });

                return getTelemetry();
            });

            expect(event).toMatchObject({
                'deployment.id': deploymentId,
                'deployment.status': 'success',
                'service.id': serviceId,
            });
        });
    });
});
