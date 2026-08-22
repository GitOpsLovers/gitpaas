import type { ArchivedLogEntry, LogEvent } from '@gitpaas/contracts';
import { ParseUUIDPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { EMPTY, firstValueFrom, of, toArray } from 'rxjs';

import { LogArchive, LogEntry } from '../../../domain/models/log-entry.models';
import {
    LOG_STREAM_UNAVAILABLE_CODE, LOG_STREAM_UNAVAILABLE_MESSAGE,
} from '../../../domain/models/log-event.models';
import { LogsService } from '../../services/logs.service';
import { LogsController } from '../logs.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';
const logId = 'a1b2c3d4-0000-0000-0000-000000000000';
const createdAt = new Date('2026-07-11T00:00:00.000Z');
const entry: LogEntry = {
    id: logId,
    deploymentId,
    seq: 1,
    createdAt,
    type: 'line',
    data: 'building…',
};
const entryResponse: ArchivedLogEntry = {
    id: logId,
    deploymentId,
    seq: 1,
    createdAt: createdAt.toISOString(),
    type: 'line',
    data: 'building…',
};
const archive = (state: LogArchive['state'], entries: LogEntry[]): LogArchive => ({ state, entries });

/**
 * Shape of a single entry of the route-argument metadata NestJS stores per handler.
 */
interface RouteArgMetadata {
    index: number;
    data: unknown;
    pipes: unknown[];
}

/**
 * Reads the pipes the controller declares for one bound argument of a handler.
 *
 * The pipes themselves are framework mechanics that the unit specs never run, so
 * this reads the declaration instead: dropping a pipe would let an unchecked
 * value reach the service, and must fail a test.
 */
const pipesFor = (handler: string, parameter?: string): unknown[] => {
    // eslint-disable-next-line operator-linebreak
    const metadata =
        (Reflect.getMetadata(ROUTE_ARGS_METADATA, LogsController, handler) as Record<
            string,
            RouteArgMetadata
        >) ?? {};

    return Object.values(metadata).find((argument) => argument.data === parameter)?.pipes ?? [];
};

describe('LogsController', () => {
    let mockLogsService: jest.Mocked<Pick<LogsService, 'getAllByDeployment' | 'streamLogs'>>;
    let sut: LogsController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockLogsService = {
            getAllByDeployment: jest.fn(),
            streamLogs: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [LogsController],
            providers: [{ provide: LogsService, useValue: mockLogsService }],
        }).compile();

        sut = moduleRef.get(LogsController);
    });

    describe('parameter validation', () => {
        it('validates the deploymentId query parameter of getAllByDeployment as a UUID', () => {
            expect(pipesFor('getAllByDeployment', 'deploymentId')).toContain(ParseUUIDPipe);
        });
    });

    describe('getAllByDeployment', () => {
        it('delegates to the service with the received deployment id', async () => {
            mockLogsService.getAllByDeployment.mockResolvedValue(archive('available', [entry]));

            const result = await sut.getAllByDeployment(deploymentId);

            expect(mockLogsService.getAllByDeployment).toHaveBeenCalledTimes(1);
            expect(mockLogsService.getAllByDeployment).toHaveBeenCalledWith(deploymentId);
            expect(result).toEqual({ state: 'available', entries: [entryResponse] });
        });

        it('gives each timestamp of the answer as a text of the ISO form', async () => {
            mockLogsService.getAllByDeployment.mockResolvedValue(archive('available', [entry]));

            const [first] = (await sut.getAllByDeployment(deploymentId)).entries;

            expect(typeof first.createdAt).toBe('string');
            expect(first.createdAt).toBe(createdAt.toISOString());
        });

        it('keeps the kind of the end of the union in the answer', async () => {
            const endEntry: LogEntry = {
                id: 'a1b2c3d4-0000-0000-0000-000000000001',
                deploymentId,
                seq: 2,
                createdAt,
                type: 'end',
                status: 'failed',
            };
            mockLogsService.getAllByDeployment.mockResolvedValue(archive('available', [entry, endEntry]));

            const result = await sut.getAllByDeployment(deploymentId);

            expect(result.entries).toEqual([
                entryResponse,
                {
                    id: 'a1b2c3d4-0000-0000-0000-000000000001',
                    deploymentId,
                    seq: 2,
                    createdAt: createdAt.toISOString(),
                    type: 'end',
                    status: 'failed',
                },
            ]);
        });

        it('says the run has not ended yet for a deployment that still runs', async () => {
            mockLogsService.getAllByDeployment.mockResolvedValue(archive('running', []));

            await expect(sut.getAllByDeployment(deploymentId)).resolves.toEqual({ state: 'running', entries: [] });
        });

        it('says the output went away for a deployment whose run ended before the age', async () => {
            mockLogsService.getAllByDeployment.mockResolvedValue(archive('expired', []));

            await expect(sut.getAllByDeployment(deploymentId)).resolves.toEqual({ state: 'expired', entries: [] });
        });
    });

    describe('streamLogs', () => {
        it('delegates to the service with the received deployment id', () => {
            mockLogsService.streamLogs.mockReturnValue(EMPTY);

            sut.streamLogs(deploymentId);

            expect(mockLogsService.streamLogs).toHaveBeenCalledTimes(1);
            expect(mockLogsService.streamLogs).toHaveBeenCalledWith(deploymentId);
        });

        it('wraps each log event into an SSE message with JSON-encoded data', async () => {
            const events: LogEvent[] = [
                { type: 'line', data: 'building…' },
                { type: 'end', status: 'success' },
            ];
            mockLogsService.streamLogs.mockReturnValue(of(...events));

            const received = await firstValueFrom(sut.streamLogs(deploymentId).pipe(toArray()));

            expect(received).toEqual([
                { data: JSON.stringify(events[0]) },
                { data: JSON.stringify(events[1]) },
            ]);
        });

        it('publishes the failure event with its code and message, and completes without erroring', async () => {
            const failure: LogEvent = {
                type: 'error',
                code: LOG_STREAM_UNAVAILABLE_CODE,
                message: LOG_STREAM_UNAVAILABLE_MESSAGE,
            };
            mockLogsService.streamLogs.mockReturnValue(of(failure));

            const received = await firstValueFrom(sut.streamLogs(deploymentId).pipe(toArray()));

            expect(received).toEqual([{
                data: JSON.stringify({
                    type: 'error',
                    code: LOG_STREAM_UNAVAILABLE_CODE,
                    message: LOG_STREAM_UNAVAILABLE_MESSAGE,
                }),
            }]);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the deployment id of a listing', async () => {
            mockLogsService.getAllByDeployment.mockResolvedValue(archive('available', [entry]));

            const event = await runWithTelemetry({}, async () => {
                await sut.getAllByDeployment(deploymentId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'deployment.id': deploymentId });
        });

        it('adds the deployment id of a stream', () => {
            mockLogsService.streamLogs.mockReturnValue(EMPTY);

            const event = runWithTelemetry({}, () => {
                sut.streamLogs(deploymentId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'deployment.id': deploymentId });
        });
    });
});
