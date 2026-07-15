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

const createLogUseCaseMock = createLogUseCase as jest.MockedFunction<typeof createLogUseCase>;
const deleteLogUseCaseMock = deleteLogUseCase as jest.MockedFunction<typeof deleteLogUseCase>;
const findLogByIdUseCaseMock = findLogByIdUseCase as jest.MockedFunction<typeof findLogByIdUseCase>;
const getLogsByDeploymentUseCaseMock = getLogsByDeploymentUseCase as jest.MockedFunction<typeof getLogsByDeploymentUseCase>;
const updateLogUseCaseMock = updateLogUseCase as jest.MockedFunction<typeof updateLogUseCase>;

const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';
const logId = 'a1b2c3d4-0000-0000-0000-000000000000';
const entry = { id: logId } as Log;

describe('LogsService', () => {
    let repository: jest.Mocked<LogsDatabaseRepository>;
    let logStoreRepository: jest.Mocked<Pick<RedisLogStoreRepository, 'stream'>>;
    let sut: LogsService;

    beforeEach(() => {
        jest.clearAllMocks();
        repository = {} as jest.Mocked<LogsDatabaseRepository>;
        logStoreRepository = { stream: jest.fn() };
        sut = new LogsService(repository, logStoreRepository as unknown as RedisLogStoreRepository);
    });

    describe('getAllByDeployment', () => {
        it('delegates to the use case with the repository and deployment id', async () => {
            getLogsByDeploymentUseCaseMock.mockResolvedValue([entry]);

            const result = await sut.getAllByDeployment(deploymentId);

            expect(getLogsByDeploymentUseCaseMock).toHaveBeenCalledWith(repository, deploymentId);
            expect(result).toEqual([entry]);
        });
    });

    describe('findById', () => {
        it('delegates to the use case with the repository and id', async () => {
            findLogByIdUseCaseMock.mockResolvedValue(entry);

            const result = await sut.findById(logId);

            expect(findLogByIdUseCaseMock).toHaveBeenCalledWith(repository, logId);
            expect(result).toBe(entry);
        });
    });

    describe('create', () => {
        const createDto: CreateLogDto = {
            deploymentId, seq: 1, type: 'line', content: 'x', status: null,
        };

        it('delegates to the use case with the repository and dto', async () => {
            createLogUseCaseMock.mockResolvedValue(entry);

            const result = await sut.create(createDto);

            expect(createLogUseCaseMock).toHaveBeenCalledWith(repository, createDto);
            expect(result).toBe(entry);
        });
    });

    describe('update', () => {
        it('delegates to the use case with the repository, id and dto', async () => {
            updateLogUseCaseMock.mockResolvedValue(entry);

            const result = await sut.update(logId, { content: 'edited' });

            expect(updateLogUseCaseMock).toHaveBeenCalledWith(repository, logId, { content: 'edited' });
            expect(result).toBe(entry);
        });
    });

    describe('delete', () => {
        it('delegates to the use case with the repository and id', async () => {
            deleteLogUseCaseMock.mockResolvedValue(true);

            const result = await sut.delete(logId);

            expect(deleteLogUseCaseMock).toHaveBeenCalledWith(repository, logId);
            expect(result).toBe(true);
        });
    });

    describe('streamLogs', () => {
        it('delegates to the log store repository with the deployment id and returns its observable', () => {
            const stream$ = of<LogEvent>({ type: 'end', status: 'success' });
            logStoreRepository.stream.mockReturnValue(stream$);

            const result = sut.streamLogs(deploymentId);

            expect(logStoreRepository.stream).toHaveBeenCalledWith(deploymentId);
            expect(result).toBe(stream$);
        });
    });
});
