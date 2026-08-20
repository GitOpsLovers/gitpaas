import type { Deployment as DeploymentResponse, TriggerDeploymentDto } from '@gitpaas/contracts';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ServiceNotDeployableError } from '../../../domain/errors/deployment.errors';
import { Deployment } from '../../../domain/models/deployment.models';
import { DeploymentsService } from '../../services/deployments.service';
import { DeploymentsController } from '../deployments.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';

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

const deploymentResponse: DeploymentResponse = {
    id: deploymentId,
    serviceId,
    status: 'success',
    branch: 'main',
    commit: 'abc123',
    commitMessage: 'feat: something',
    composerPath: 'docker-compose.yml',
    triggeredBy: 'marc',
    error: null,
    createdAt: '2026-07-11T00:00:00.000Z',
    finishedAt: '2026-07-11T00:01:00.000Z',
};

describe('DeploymentsController', () => {
    let mockDeploymentsService: jest.Mocked<
        Pick<DeploymentsService, 'getAllByService' | 'findById' | 'create' | 'delete'>
    >;
    let sut: DeploymentsController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockDeploymentsService = {
            getAllByService: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [DeploymentsController],
            providers: [{ provide: DeploymentsService, useValue: mockDeploymentsService }],
        }).compile();

        sut = moduleRef.get(DeploymentsController);
    });

    describe('getAllByService', () => {
        it('delegates to the service with the received service id', async () => {
            mockDeploymentsService.getAllByService.mockResolvedValue([deployment]);

            await sut.getAllByService(serviceId);

            expect(mockDeploymentsService.getAllByService).toHaveBeenCalledTimes(1);
            expect(mockDeploymentsService.getAllByService).toHaveBeenCalledWith(serviceId);
        });

        it('returns the deployments produced by the service', async () => {
            mockDeploymentsService.getAllByService.mockResolvedValue([deployment]);

            const result = await sut.getAllByService(serviceId);

            expect(result).toEqual([deploymentResponse]);
        });

        it('gives each timestamp of the answer as a text of the ISO form', async () => {
            mockDeploymentsService.getAllByService.mockResolvedValue([deployment]);

            const [first] = await sut.getAllByService(serviceId);

            expect(typeof first.createdAt).toBe('string');
            expect(typeof first.finishedAt).toBe('string');
        });

        it('gives null for the finish of a deployment that still runs', async () => {
            mockDeploymentsService.getAllByService.mockResolvedValue([
                { ...deployment, status: 'running', finishedAt: null },
            ]);

            const [first] = await sut.getAllByService(serviceId);

            expect(first.finishedAt).toBeNull();
        });

        it('returns an empty list when the service has no deployments', async () => {
            mockDeploymentsService.getAllByService.mockResolvedValue([]);

            const result = await sut.getAllByService(serviceId);

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockDeploymentsService.getAllByService.mockRejectedValue(error);

            await expect(sut.getAllByService(serviceId)).rejects.toBe(error);
        });
    });

    describe('findById', () => {
        it('delegates to the service with the received id', async () => {
            mockDeploymentsService.findById.mockResolvedValue(deployment);

            await sut.findById(deploymentId);

            expect(mockDeploymentsService.findById).toHaveBeenCalledTimes(1);
            expect(mockDeploymentsService.findById).toHaveBeenCalledWith(deploymentId);
        });

        it('returns the deployment produced by the service', async () => {
            mockDeploymentsService.findById.mockResolvedValue(deployment);

            const result = await sut.findById(deploymentId);

            expect(result).toEqual(deploymentResponse);
        });

        it('throws a NotFoundException when the deployment does not exist', async () => {
            mockDeploymentsService.findById.mockResolvedValue(null);

            await expect(sut.findById(deploymentId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockDeploymentsService.findById.mockResolvedValue(null);

            await expect(sut.findById(deploymentId)).rejects.toThrow(`Deployment ${deploymentId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockDeploymentsService.findById.mockRejectedValue(error);

            await expect(sut.findById(deploymentId)).rejects.toBe(error);
        });
    });

    describe('create', () => {
        const triggerDto: TriggerDeploymentDto = { serviceId };

        it('delegates to the service with the received dto', async () => {
            mockDeploymentsService.create.mockResolvedValue(deployment);

            await sut.create(triggerDto);

            expect(mockDeploymentsService.create).toHaveBeenCalledTimes(1);
            expect(mockDeploymentsService.create).toHaveBeenCalledWith(triggerDto);
        });

        it('returns the created deployment', async () => {
            mockDeploymentsService.create.mockResolvedValue(deployment);

            const result = await sut.create(triggerDto);

            expect(result).toEqual(deploymentResponse);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('service not found');
            mockDeploymentsService.create.mockRejectedValue(error);

            await expect(sut.create(triggerDto)).rejects.toBe(error);
        });

        it('translates a ServiceNotFoundError into a NotFoundException', async () => {
            mockDeploymentsService.create.mockRejectedValue(new ServiceNotFoundError(serviceId));

            await expect(sut.create(triggerDto)).rejects.toBeInstanceOf(NotFoundException);
            await expect(sut.create(triggerDto)).rejects.toThrow(`Service ${serviceId} not found`);
        });

        it('translates a ServiceNotDeployableError into a BadRequestException', async () => {
            mockDeploymentsService.create.mockRejectedValue(new ServiceNotDeployableError());

            await expect(sut.create(triggerDto)).rejects.toBeInstanceOf(BadRequestException);
            await expect(sut.create(triggerDto)).rejects.toThrow(
                'Service has no provider, repository or deployment branch configured',
            );
        });
    });

    describe('delete', () => {
        it('delegates to the service with the received id', async () => {
            mockDeploymentsService.delete.mockResolvedValue(true);

            await sut.delete(deploymentId);

            expect(mockDeploymentsService.delete).toHaveBeenCalledTimes(1);
            expect(mockDeploymentsService.delete).toHaveBeenCalledWith(deploymentId);
        });

        it('resolves with no value when a row was deleted', async () => {
            mockDeploymentsService.delete.mockResolvedValue(true);

            await expect(sut.delete(deploymentId)).resolves.toBeUndefined();
        });

        it('throws a NotFoundException when nothing was deleted', async () => {
            mockDeploymentsService.delete.mockResolvedValue(false);

            await expect(sut.delete(deploymentId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockDeploymentsService.delete.mockResolvedValue(false);

            await expect(sut.delete(deploymentId)).rejects.toThrow(`Deployment ${deploymentId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockDeploymentsService.delete.mockRejectedValue(error);

            await expect(sut.delete(deploymentId)).rejects.toBe(error);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the service id of a listing', async () => {
            mockDeploymentsService.getAllByService.mockResolvedValue([deployment]);

            const event = await runWithTelemetry({}, async () => {
                await sut.getAllByService(serviceId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'service.id': serviceId });
        });

        it('adds the deployment id of a read', async () => {
            mockDeploymentsService.findById.mockResolvedValue(deployment);

            const event = await runWithTelemetry({}, async () => {
                await sut.findById(deploymentId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'deployment.id': deploymentId });
        });

        it('adds the service id of a trigger', async () => {
            mockDeploymentsService.create.mockResolvedValue(deployment);

            const event = await runWithTelemetry({}, async () => {
                await sut.create({ serviceId });

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'service.id': serviceId });
        });

        it('adds the deployment id of a delete', async () => {
            mockDeploymentsService.delete.mockResolvedValue(true);

            const event = await runWithTelemetry({}, async () => {
                await sut.delete(deploymentId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'deployment.id': deploymentId });
        });
    });
});
