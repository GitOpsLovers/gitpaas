import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EMPTY, firstValueFrom, of, toArray } from 'rxjs';

import { CreateLogDto } from '../../../domain/dtos/create-log.dto';
import { LogEvent } from '../../../domain/models/log-event.model';
import { Log } from '../../../domain/models/log.model';
import { LogsService } from '../../services/logs.service';
import { LogsController } from '../logs.controller';

const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';
const logId = 'a1b2c3d4-0000-0000-0000-000000000000';
const entry = { id: logId } as Log;

describe('LogsController', () => {
    let mockLogsService: jest.Mocked<
        Pick<LogsService, 'getAllByDeployment' | 'findById' | 'streamLogs' | 'create' | 'update' | 'delete'>
    >;
    let sut: LogsController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockLogsService = {
            getAllByDeployment: jest.fn(),
            findById: jest.fn(),
            streamLogs: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
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

    describe('findById', () => {
        it('returns the log entry produced by the service', async () => {
            mockLogsService.findById.mockResolvedValue(entry);

            const result = await sut.findById(logId);

            expect(mockLogsService.findById).toHaveBeenCalledTimes(1);
            expect(mockLogsService.findById).toHaveBeenCalledWith(logId);
            expect(result).toBe(entry);
        });

        it('throws a NotFoundException when the log entry does not exist', async () => {
            mockLogsService.findById.mockResolvedValue(null);

            await expect(sut.findById(logId)).rejects.toBeInstanceOf(NotFoundException);
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

    describe('create', () => {
        const createDto: CreateLogDto = {
            deploymentId, seq: 1, type: 'line', content: 'x', status: null,
        };

        it('delegates to the service with the received dto', async () => {
            mockLogsService.create.mockResolvedValue(entry);

            const result = await sut.create(createDto);

            expect(mockLogsService.create).toHaveBeenCalledTimes(1);
            expect(mockLogsService.create).toHaveBeenCalledWith(createDto);
            expect(result).toBe(entry);
        });
    });

    describe('update', () => {
        it('returns the updated log entry produced by the service', async () => {
            mockLogsService.update.mockResolvedValue(entry);

            const result = await sut.update(logId, { content: 'edited' });

            expect(mockLogsService.update).toHaveBeenCalledTimes(1);
            expect(mockLogsService.update).toHaveBeenCalledWith(logId, { content: 'edited' });
            expect(result).toBe(entry);
        });

        it('throws a NotFoundException when the log entry does not exist', async () => {
            mockLogsService.update.mockResolvedValue(null);

            await expect(sut.update(logId, { content: 'edited' })).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('delete', () => {
        it('resolves with no value when a row was deleted', async () => {
            mockLogsService.delete.mockResolvedValue(true);

            await expect(sut.delete(logId)).resolves.toBeUndefined();
        });

        it('throws a NotFoundException when nothing was deleted', async () => {
            mockLogsService.delete.mockResolvedValue(false);

            await expect(sut.delete(logId)).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});
