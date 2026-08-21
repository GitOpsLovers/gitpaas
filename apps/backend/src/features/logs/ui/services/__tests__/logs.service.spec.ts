import type { LogEvent } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';

import { getLogsByDeploymentUseCase } from '../../../application/get-logs-by-deployment.use-case';
import { LogArchive, LogEntry } from '../../../domain/models/log-entry.models';
import { DatabaseLogsRepository } from '../../../infrastructure/database/db-logs.repository';
import { RedisLogStoreAdapter } from '../../../infrastructure/redis/redis-log-store.adapter';
import { LogsService } from '../logs.service';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { DatabaseDeploymentsRepository } from '@features/deployments/infrastructure/database/db-deployments.repository';

jest.mock('../../../application/get-logs-by-deployment.use-case');

const mockGetLogsByDeploymentUseCase = getLogsByDeploymentUseCase as jest.MockedFunction<typeof getLogsByDeploymentUseCase>;

const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';
const logId = 'a1b2c3d4-0000-0000-0000-000000000000';
const entry: LogEntry = {
    id: logId,
    deploymentId,
    seq: 1,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    type: 'line',
    data: 'building...',
};
const archive = (state: LogArchive['state'], entries: LogEntry[]): LogArchive => ({ state, entries });

describe('LogsService', () => {
    let mockLogsRepository: jest.Mocked<DatabaseLogsRepository>;
    let mockDeploymentsRepository: jest.Mocked<DatabaseDeploymentsRepository>;
    let mockLogStore: jest.Mocked<Pick<RedisLogStoreAdapter, 'stream'>>;
    let sut: LogsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockLogsRepository = {} as jest.Mocked<DatabaseLogsRepository>;
        mockDeploymentsRepository = {} as jest.Mocked<DatabaseDeploymentsRepository>;
        mockLogStore = { stream: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                LogsService,
                { provide: DatabaseLogsRepository, useValue: mockLogsRepository },
                { provide: DatabaseDeploymentsRepository, useValue: mockDeploymentsRepository },
                { provide: RedisLogStoreAdapter, useValue: mockLogStore },
            ],
        }).compile();

        sut = moduleRef.get(LogsService);
    });

    describe('getAllByDeployment', () => {
        it('delegates to the use case with both repositories and the deployment id', async () => {
            mockGetLogsByDeploymentUseCase.mockResolvedValue(archive('available', [entry]));

            const result = await sut.getAllByDeployment(deploymentId);

            expect(mockGetLogsByDeploymentUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetLogsByDeploymentUseCase).toHaveBeenCalledWith(
                mockLogsRepository,
                mockDeploymentsRepository,
                deploymentId,
            );
            expect(result).toEqual(archive('available', [entry]));
        });

        it('carries the state of a run that has not ended', async () => {
            mockGetLogsByDeploymentUseCase.mockResolvedValue(archive('running', []));

            await expect(sut.getAllByDeployment(deploymentId)).resolves.toEqual(archive('running', []));
        });

        it('carries the state of an output that went away', async () => {
            mockGetLogsByDeploymentUseCase.mockResolvedValue(archive('expired', []));

            await expect(sut.getAllByDeployment(deploymentId)).resolves.toEqual(archive('expired', []));
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockGetLogsByDeploymentUseCase.mockRejectedValue(error);

            await expect(sut.getAllByDeployment(deploymentId)).rejects.toBe(error);
        });
    });

    describe('streamLogs', () => {
        it('delegates to the log store with the deployment id and returns its observable', () => {
            const stream$ = of<LogEvent>({ type: 'end', status: 'success' });
            mockLogStore.stream.mockReturnValue(stream$);

            const result = sut.streamLogs(deploymentId);

            expect(mockLogStore.stream).toHaveBeenCalledWith(deploymentId);
            expect(result).toBe(stream$);
        });

        it('propagates errors thrown while opening the stream', () => {
            const error = new Error('log store unreachable');
            mockLogStore.stream.mockImplementation(() => {
                throw error;
            });

            expect(() => sut.streamLogs(deploymentId)).toThrow(error);
        });
    });

    describe('telemetry event enrichment', () => {
        it('reports how many log lines the listing served', async () => {
            mockGetLogsByDeploymentUseCase.mockResolvedValue(archive('available', [entry, { ...entry, seq: 2 }]));

            const event = await runWithTelemetry({}, async () => {
                await sut.getAllByDeployment(deploymentId);

                return getTelemetry();
            });

            expect(event).toEqual({ 'deployment.log_lines': 2 });
        });

        it('reports zero lines for a deployment that logged nothing', async () => {
            mockGetLogsByDeploymentUseCase.mockResolvedValue(archive('running', []));

            const event = await runWithTelemetry({}, async () => {
                await sut.getAllByDeployment(deploymentId);

                return getTelemetry();
            });

            expect(event).toEqual({ 'deployment.log_lines': 0 });
        });

        it('reports no line count when the listing failed', async () => {
            mockGetLogsByDeploymentUseCase.mockRejectedValue(new Error('db unreachable'));

            const event = await runWithTelemetry({}, async () => {
                await expect(sut.getAllByDeployment(deploymentId)).rejects.toThrow('db unreachable');

                return getTelemetry();
            });

            expect(event).toEqual({});
        });

        it('adds nothing for a stream, whose line count is only known once it ends', () => {
            mockLogStore.stream.mockReturnValue(of<LogEvent>({ type: 'end', status: 'success' }));

            const event = runWithTelemetry({}, () => {
                sut.streamLogs(deploymentId);

                return getTelemetry();
            });

            expect(event).toEqual({});
        });

        it('does nothing outside a unit of work', async () => {
            mockGetLogsByDeploymentUseCase.mockResolvedValue(archive('available', [entry]));

            await expect(sut.getAllByDeployment(deploymentId)).resolves.toEqual(archive('available', [entry]));
            expect(getTelemetry()).toBeUndefined();
        });
    });
});
