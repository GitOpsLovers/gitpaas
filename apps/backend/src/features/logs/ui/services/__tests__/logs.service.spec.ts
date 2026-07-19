import { Test } from '@nestjs/testing';
import { of } from 'rxjs';

import { createLogUseCase } from '../../../application/create-log.use-case';
import { deleteLogUseCase } from '../../../application/delete-log.use-case';
import { findLogByIdUseCase } from '../../../application/find-log-by-id.use-case';
import { getLogsByDeploymentUseCase } from '../../../application/get-logs-by-deployment.use-case';
import { updateLogUseCase } from '../../../application/update-log.use-case';
import { CreateLogDto } from '../../../domain/dtos/create-log.dto';
import { LogEvent } from '../../../domain/models/log-event.model';
import { Log } from '../../../domain/models/log.model';
import { LogsDatabaseRepository } from '../../../infrastructure/database/logs-db.repository';
import { RedisLogStoreRepository } from '../../../infrastructure/redis/redis-log-store.repository';
import { LogsService } from '../logs.service';

jest.mock('../../../application/create-log.use-case');
jest.mock('../../../application/delete-log.use-case');
jest.mock('../../../application/find-log-by-id.use-case');
jest.mock('../../../application/get-logs-by-deployment.use-case');
jest.mock('../../../application/update-log.use-case');

const mockCreateLogUseCase = createLogUseCase as jest.MockedFunction<typeof createLogUseCase>;
const mockDeleteLogUseCase = deleteLogUseCase as jest.MockedFunction<typeof deleteLogUseCase>;
const mockFindLogByIdUseCase = findLogByIdUseCase as jest.MockedFunction<typeof findLogByIdUseCase>;
const mockGetLogsByDeploymentUseCase = getLogsByDeploymentUseCase as jest.MockedFunction<typeof getLogsByDeploymentUseCase>;
const mockUpdateLogUseCase = updateLogUseCase as jest.MockedFunction<typeof updateLogUseCase>;

const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';
const logId = 'a1b2c3d4-0000-0000-0000-000000000000';
const entry = { id: logId } as Log;

describe('LogsService', () => {
    let mockLogsRepository: jest.Mocked<LogsDatabaseRepository>;
    let mockLogStoreRepository: jest.Mocked<Pick<RedisLogStoreRepository, 'stream'>>;
    let sut: LogsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockLogsRepository = {} as jest.Mocked<LogsDatabaseRepository>;
        mockLogStoreRepository = { stream: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                LogsService,
                { provide: LogsDatabaseRepository, useValue: mockLogsRepository },
                { provide: RedisLogStoreRepository, useValue: mockLogStoreRepository },
            ],
        }).compile();

        sut = moduleRef.get(LogsService);
    });

    describe('getAllByDeployment', () => {
        it('delegates to the use case with the repository and deployment id', async () => {
            mockGetLogsByDeploymentUseCase.mockResolvedValue([entry]);

            const result = await sut.getAllByDeployment(deploymentId);

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

    describe('findById', () => {
        it('delegates to the use case with the repository and id', async () => {
            mockFindLogByIdUseCase.mockResolvedValue(entry);

            const result = await sut.findById(logId);

            expect(mockFindLogByIdUseCase).toHaveBeenCalledWith(mockLogsRepository, logId);
            expect(result).toBe(entry);
        });

        it('returns null when the log entry does not exist', async () => {
            mockFindLogByIdUseCase.mockResolvedValue(null);

            const result = await sut.findById(logId);

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockFindLogByIdUseCase.mockRejectedValue(error);

            await expect(sut.findById(logId)).rejects.toBe(error);
        });
    });

    describe('create', () => {
        const createDto: CreateLogDto = {
            deploymentId, seq: 1, type: 'line', content: 'x', status: null,
        };

        it('delegates to the use case with the repository and dto', async () => {
            mockCreateLogUseCase.mockResolvedValue(entry);

            const result = await sut.create(createDto);

            expect(mockCreateLogUseCase).toHaveBeenCalledWith(mockLogsRepository, createDto);
            expect(result).toBe(entry);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockCreateLogUseCase.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toBe(error);
        });
    });

    describe('update', () => {
        it('delegates to the use case with the repository, id and dto', async () => {
            mockUpdateLogUseCase.mockResolvedValue(entry);

            const result = await sut.update(logId, { content: 'edited' });

            expect(mockUpdateLogUseCase).toHaveBeenCalledWith(mockLogsRepository, logId, { content: 'edited' });
            expect(result).toBe(entry);
        });

        it('returns null when the log entry does not exist', async () => {
            mockUpdateLogUseCase.mockResolvedValue(null);

            const result = await sut.update(logId, { content: 'edited' });

            expect(result).toBeNull();
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockUpdateLogUseCase.mockRejectedValue(error);

            await expect(sut.update(logId, { content: 'edited' })).rejects.toBe(error);
        });
    });

    describe('delete', () => {
        it('delegates to the use case with the repository and id', async () => {
            mockDeleteLogUseCase.mockResolvedValue(true);

            const result = await sut.delete(logId);

            expect(mockDeleteLogUseCase).toHaveBeenCalledWith(mockLogsRepository, logId);
            expect(result).toBe(true);
        });

        it('returns false when nothing was deleted', async () => {
            mockDeleteLogUseCase.mockResolvedValue(false);

            const result = await sut.delete(logId);

            expect(result).toBe(false);
        });

        it('propagates errors thrown by the use case', async () => {
            const error = new Error('db unreachable');
            mockDeleteLogUseCase.mockRejectedValue(error);

            await expect(sut.delete(logId)).rejects.toBe(error);
        });
    });

    describe('streamLogs', () => {
        it('delegates to the log store repository with the deployment id and returns its observable', () => {
            const stream$ = of<LogEvent>({ type: 'end', status: 'success' });
            mockLogStoreRepository.stream.mockReturnValue(stream$);

            const result = sut.streamLogs(deploymentId);

            expect(mockLogStoreRepository.stream).toHaveBeenCalledWith(deploymentId);
            expect(result).toBe(stream$);
        });

        it('propagates errors thrown while opening the stream', () => {
            const error = new Error('redis unreachable');
            mockLogStoreRepository.stream.mockImplementation(() => {
                throw error;
            });

            expect(() => sut.streamLogs(deploymentId)).toThrow(error);
        });
    });
});
