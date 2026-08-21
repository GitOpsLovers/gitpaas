import { In, LessThan, Repository } from 'typeorm';

import { CreateLogDto } from '../../../domain/dtos/create-log.dto';
import { DbLogEntity } from '../db-log.entity';
import { DatabaseLogsRepository } from '../db-logs.repository';

/**
 * Builds a log database-entity fixture, overriding only the fields under test.
 */
const logEntity = (overrides: Partial<DbLogEntity> = {}): DbLogEntity => ({
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
    seq: 1,
    type: 'line',
    content: 'building service',
    status: null,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('DatabaseLogsRepository', () => {
    const createDto: CreateLogDto = {
        deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
        seq: 1,
        type: 'line',
        content: 'building service',
        status: null,
    };

    let mockRepository: jest.Mocked<
        Pick<Repository<DbLogEntity>, 'find' | 'create' | 'save' | 'delete'>
    >;
    let sut: DatabaseLogsRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        sut = new DatabaseLogsRepository(
            mockRepository as unknown as Repository<DbLogEntity>,
        );
    });

    describe('getAllByDeployment', () => {
        it('finds log entries for the deployment ordered by sequence and maps them to domain', async () => {
            const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';
            const entity = logEntity();
            mockRepository.find.mockResolvedValue([entity]);

            const result = await sut.getAllByDeployment(deploymentId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { deploymentId },
                order: { seq: 'ASC' },
            });
            expect(result).toEqual([{
                id: entity.id,
                deploymentId: entity.deploymentId,
                seq: entity.seq,
                createdAt: entity.createdAt,
                type: 'line',
                data: entity.content,
            }]);
        });

        it('returns an empty list when the deployment has no log entries', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await sut.getAllByDeployment('deployment-1');

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe('createMany', () => {
        it('creates entities from the DTOs and saves them in one write', async () => {
            const entities = [
                logEntity(),
                logEntity({
                    seq: 2, type: 'end', content: null, status: 'success',
                }),
            ];
            const dtos: CreateLogDto[] = [
                createDto,
                {
                    deploymentId: createDto.deploymentId,
                    seq: 2,
                    type: 'end',
                    content: null,
                    status: 'success',
                },
            ];
            (mockRepository.create as jest.Mock).mockReturnValue(entities);
            (mockRepository.save as jest.Mock).mockResolvedValue(entities);

            await sut.createMany(dtos);

            expect(mockRepository.create).toHaveBeenCalledWith(dtos);
            expect(mockRepository.save).toHaveBeenCalledWith(entities);
        });
    });

    describe('deleteByDeployment', () => {
        it('deletes every entry of the deployment', async () => {
            await sut.deleteByDeployment('deployment-1');

            expect(mockRepository.delete).toHaveBeenCalledWith({ deploymentId: 'deployment-1' });
        });
    });

    describe('deleteCreatedBefore', () => {
        const threshold = new Date('2026-08-21T12:00:00.000Z');

        it('reads the oldest expired entries up to the bounded count, and deletes them by id', async () => {
            const expired = [logEntity({ id: 'log-1' }), logEntity({ id: 'log-2' })];
            mockRepository.find.mockResolvedValue(expired);
            (mockRepository.delete as jest.Mock).mockResolvedValue({ affected: 2, raw: [] });

            const result = await sut.deleteCreatedBefore(threshold, 500);

            expect(mockRepository.find).toHaveBeenCalledWith({
                select: { id: true },
                where: { createdAt: LessThan(threshold) },
                order: { createdAt: 'ASC' },
                take: 500,
            });
            expect(mockRepository.delete).toHaveBeenCalledWith({ id: In(['log-1', 'log-2']) });
            expect(result).toBe(2);
        });

        it('deletes nothing when no entry passed the moment', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await sut.deleteCreatedBefore(threshold, 500);

            expect(mockRepository.delete).not.toHaveBeenCalled();
            expect(result).toBe(0);
        });

        it('counts the entries it read when the driver reports no affected row', async () => {
            mockRepository.find.mockResolvedValue([logEntity({ id: 'log-1' })]);
            (mockRepository.delete as jest.Mock).mockResolvedValue({ affected: null, raw: [] });

            const result = await sut.deleteCreatedBefore(threshold, 500);

            expect(result).toBe(1);
        });
    });
});
