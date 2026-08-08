import { Test } from '@nestjs/testing';
import { EMPTY, firstValueFrom, of, toArray } from 'rxjs';

import { LogEntry } from '../../../domain/models/log-entry.models';
import { LogEvent } from '../../../domain/models/log-event.models';
import { LogsService } from '../../services/logs.service';
import { LogsController } from '../logs.controller';

const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';
const logId = 'a1b2c3d4-0000-0000-0000-000000000000';
const entry = { id: logId } as LogEntry;

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

    describe('getAllByDeployment', () => {
        it('delegates to the service with the received deployment id', async () => {
            mockLogsService.getAllByDeployment.mockResolvedValue([entry]);

            const result = await sut.getAllByDeployment(deploymentId);

            expect(mockLogsService.getAllByDeployment).toHaveBeenCalledTimes(1);
            expect(mockLogsService.getAllByDeployment).toHaveBeenCalledWith(deploymentId);
            expect(result).toEqual([entry]);
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
    });
});
