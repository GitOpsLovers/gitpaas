import type { LogEvent } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';

import { getLogsByDeploymentUseCase } from '../../../application/get-logs-by-deployment.use-case';
import { LogEntry } from '../../../domain/models/log-entry.models';
import { DatabaseLogsRepository } from '../../../infrastructure/database/db-logs.repository';
import { RedisLogStoreAdapter } from '../../../infrastructure/redis/redis-log-store.adapter';
import { LogsService } from '../logs.service';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

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

describe('LogsService', () => {
    let mockLogsRepository: jest.Mocked<DatabaseLogsRepository>;
    let mockLogStore: jest.Mocked<Pick<RedisLogStoreAdapter, 'stream'>>;
    let sut: LogsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockLogsRepository = {} as jest.Mocked<DatabaseLogsRepository>;
        mockLogStore = { stream: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                LogsService,
                { provide: DatabaseLogsRepository, useValue: mockLogsRepository },
                { provide: RedisLogStoreAdapter, useValue: mockLogStore },
            ],
        }).compile();

        sut = moduleRef.get(LogsService);
    });

    describe('getAllByDeployment', () => {
        it('delegates to the use case with the repository and deployment id', async () => {
            mockGetLogsByDeploymentUseCase.mockResolvedValue([entry]);

            const result = await sut.getAllByDeployment(deploymentId);

            expect(mockGetLogsByDeploymentUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetLogsByDeploymentUseCase).toHaveBeenCalledWith(mockLogsRepository, deploymentId);
            expect(result).toEqual([entry]);
        });

        it('returns an empty list when the deployment has no log entries', async () => {
            mockGetLogsByDeploymentUseCase.mockResolvedValue([]);

            const result = await sut.getAllByDeployment(deploymentId);

            expect(result).toEqual([]);
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
            mockGetLogsByDeploymentUseCase.mockResolvedValue([entry, { ...entry, seq: 2 }]);

            const event = await runWithTelemetry({}, async () => {
                await sut.getAllByDeployment(deploymentId);

                return getTelemetry();
            });

            expect(event).toEqual({ 'deployment.log_lines': 2 });
        });

        it('reports zero lines for a deployment that logged nothing', async () => {
            mockGetLogsByDeploymentUseCase.mockResolvedValue([]);

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
            mockGetLogsByDeploymentUseCase.mockResolvedValue([entry]);

            await expect(sut.getAllByDeployment(deploymentId)).resolves.toEqual([entry]);
            expect(getTelemetry()).toBeUndefined();
        });
    });
});
