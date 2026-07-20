import { Repository } from 'typeorm';

import { CreateLogDto } from '../../../domain/dtos/create-log.dto';
import { LogDbEntity } from '../log-db.entity';
import { LogsDatabaseRepository } from '../logs-db.repository';

/**
 * Builds a log database-entity fixture, overriding only the fields under test.
 */
const logEntity = (overrides: Partial<LogDbEntity> = {}): LogDbEntity => ({
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
    seq: 1,
    type: 'line',
    content: 'building service',
    status: null,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('LogsDatabaseRepository', () => {
    const createDto: CreateLogDto = {
        deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
        seq: 1,
        type: 'line',
        content: 'building service',
        status: null,
    };

    let mockRepository: jest.Mocked<
        Pick<Repository<LogDbEntity>, 'find' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'>
    >;
    let sut: LogsDatabaseRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            merge: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        sut = new LogsDatabaseRepository(
            mockRepository as unknown as Repository<LogDbEntity>,
        );
    });

    describe('getAllByDeployment', () => {
        it('finds log entries for the deployment ordered by sequence and maps them to domain', async () => {
            const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';
            const logs = [logEntity()];
            mockRepository.find.mockResolvedValue(logs);

            const result = await sut.getAllByDeployment(deploymentId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { deploymentId },
                order: { seq: 'ASC' },
            });
            expect(result).toEqual(logs);
        });

        it('returns an empty list when the deployment has no log entries', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await sut.getAllByDeployment('deployment-1');

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('finds a log entry by id and maps it into the domain model', async () => {
            const found = logEntity();
            mockRepository.findOneBy.mockResolvedValue(found);

            const result = await sut.findById(found.id);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: found.id });
            expect(result).toEqual(found);
        });

        it('returns null when no log entry matches the id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            const result = await sut.findById('missing-id');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('creates an entity from the DTO, saves it, and returns the mapped log entry', async () => {
            const entity = logEntity();
            const saved = logEntity();
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.create(createDto);

            expect(mockRepository.create).toHaveBeenCalledWith(createDto);
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(result).toEqual(saved);
        });
    });

    describe('createMany', () => {
        it('creates entities from the DTOs, saves them, and returns the mapped log entries', async () => {
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
            mockRepository.save.mockResolvedValue(entities);

            const result = await sut.createMany(dtos);

            expect(mockRepository.create).toHaveBeenCalledWith(dtos);
            expect(mockRepository.save).toHaveBeenCalledWith(entities);
            expect(result).toEqual(entities);
        });
    });

    describe('update', () => {
        it('returns null and does not merge or save when the log entry is not found', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            const result = await sut.update('missing-id', { content: 'edited' });

            expect(result).toBeNull();
            expect(mockRepository.merge).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });

        it('merges the DTO into the existing entity, saves it, and returns the mapped log entry', async () => {
            const existing = logEntity();
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(existing);

            const result = await sut.update(existing.id, { content: 'edited' });

            expect(mockRepository.merge).toHaveBeenCalledWith(existing, { content: 'edited' });
            expect(mockRepository.save).toHaveBeenCalledWith(existing);
            expect(result).toEqual(existing);
        });
    });

    describe('delete', () => {
        it('returns true when a row was affected', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            const result = await sut.delete('some-id');

            expect(mockRepository.delete).toHaveBeenCalledWith('some-id');
            expect(result).toBe(true);
        });

        it('returns false when no rows were affected', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

            const result = await sut.delete('some-id');

            expect(result).toBe(false);
        });

        it('returns false when affected is undefined', async () => {
            mockRepository.delete.mockResolvedValue({ affected: undefined, raw: [] });

            const result = await sut.delete('some-id');

            expect(result).toBe(false);
        });
    });
});
