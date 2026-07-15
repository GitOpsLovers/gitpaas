import { MessageEvent, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';

import { TriggerDeploymentDto } from '../../../domain/dtos/trigger-deployment.dto';
import { Deployment } from '../../../domain/models/deployment.model';
import { DeploymentsService } from '../../services/deployments.service';
import { DeploymentsController } from '../deployments.controller';

import { LogEvent } from '@features/logs/domain/models/log-event.model';

jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));

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

describe('DeploymentsController', () => {
    let service: jest.Mocked<
        Pick<DeploymentsService, 'getAllByService' | 'findById' | 'streamLogs' | 'create' | 'delete'>
    >;
    let sut: DeploymentsController;

    beforeEach(async () => {
        service = {
            getAllByService: jest.fn(),
            findById: jest.fn(),
            streamLogs: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [DeploymentsController],
            providers: [{ provide: DeploymentsService, useValue: service }],
        }).compile();

        sut = moduleRef.get(DeploymentsController);
    });

    describe('getAllByService', () => {
        it('delegates to the service with the received service id', async () => {
            service.getAllByService.mockResolvedValue([deployment]);

            await sut.getAllByService(serviceId);

            expect(service.getAllByService).toHaveBeenCalledTimes(1);
            expect(service.getAllByService).toHaveBeenCalledWith(serviceId);
        });

        it('returns the deployments produced by the service', async () => {
            service.getAllByService.mockResolvedValue([deployment]);

            const result = await sut.getAllByService(serviceId);

            expect(result).toEqual([deployment]);
        });

        it('returns an empty list when the service has no deployments', async () => {
            service.getAllByService.mockResolvedValue([]);

            const result = await sut.getAllByService(serviceId);

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            service.getAllByService.mockRejectedValue(error);

            await expect(sut.getAllByService(serviceId)).rejects.toBe(error);
        });
    });

    describe('findById', () => {
        it('delegates to the service with the received id', async () => {
            service.findById.mockResolvedValue(deployment);

            await sut.findById(deploymentId);

            expect(service.findById).toHaveBeenCalledTimes(1);
            expect(service.findById).toHaveBeenCalledWith(deploymentId);
        });

        it('returns the deployment produced by the service', async () => {
            service.findById.mockResolvedValue(deployment);

            const result = await sut.findById(deploymentId);

            expect(result).toBe(deployment);
        });

        it('throws a NotFoundException when the deployment does not exist', async () => {
            service.findById.mockResolvedValue(null);

            await expect(sut.findById(deploymentId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            service.findById.mockResolvedValue(null);

            await expect(sut.findById(deploymentId)).rejects.toThrow(`Deployment ${deploymentId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            service.findById.mockRejectedValue(error);

            await expect(sut.findById(deploymentId)).rejects.toBe(error);
        });
    });

    describe('streamLogs', () => {
        it('delegates to the service with the received id', () => {
            service.streamLogs.mockReturnValue(of<LogEvent>());

            sut.streamLogs(deploymentId);

            expect(service.streamLogs).toHaveBeenCalledTimes(1);
            expect(service.streamLogs).toHaveBeenCalledWith(deploymentId);
        });

        it('wraps each log event into an SSE message with JSON-encoded data', (done) => {
            const events: LogEvent[] = [
                { type: 'line', data: 'building…' },
                { type: 'end', status: 'success' },
            ];
            service.streamLogs.mockReturnValue(of<LogEvent>(...events));

            const received: MessageEvent[] = [];
            sut.streamLogs(deploymentId).subscribe({
                next: (message) => received.push(message),
                complete: () => {
                    expect(received).toEqual([
                        { data: JSON.stringify(events[0]) },
                        { data: JSON.stringify(events[1]) },
                    ]);
                    done();
                },
            });
        });

        it('completes without emitting when the log stream is empty', (done) => {
            service.streamLogs.mockReturnValue(of<LogEvent>());

            const received: MessageEvent[] = [];
            sut.streamLogs(deploymentId).subscribe({
                next: (message) => received.push(message),
                complete: () => {
                    expect(received).toEqual([]);
                    done();
                },
            });
        });
    });

    describe('create', () => {
        const triggerDto: TriggerDeploymentDto = { serviceId };

        it('delegates to the service with the received dto', async () => {
            service.create.mockResolvedValue(deployment);

            await sut.create(triggerDto);

            expect(service.create).toHaveBeenCalledTimes(1);
            expect(service.create).toHaveBeenCalledWith(triggerDto);
        });

        it('returns the created deployment', async () => {
            service.create.mockResolvedValue(deployment);

            const result = await sut.create(triggerDto);

            expect(result).toBe(deployment);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('service not found');
            service.create.mockRejectedValue(error);

            await expect(sut.create(triggerDto)).rejects.toBe(error);
        });
    });

    describe('delete', () => {
        it('delegates to the service with the received id', async () => {
            service.delete.mockResolvedValue(true);

            await sut.delete(deploymentId);

            expect(service.delete).toHaveBeenCalledTimes(1);
            expect(service.delete).toHaveBeenCalledWith(deploymentId);
        });

        it('resolves with no value when a row was deleted', async () => {
            service.delete.mockResolvedValue(true);

            await expect(sut.delete(deploymentId)).resolves.toBeUndefined();
        });

        it('throws a NotFoundException when nothing was deleted', async () => {
            service.delete.mockResolvedValue(false);

            await expect(sut.delete(deploymentId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            service.delete.mockResolvedValue(false);

            await expect(sut.delete(deploymentId)).rejects.toThrow(`Deployment ${deploymentId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            service.delete.mockRejectedValue(error);

            await expect(sut.delete(deploymentId)).rejects.toBe(error);
        });
    });
});
