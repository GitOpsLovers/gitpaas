import { Repository } from 'typeorm';

import { CreateLogDto } from '../../../domain/dtos/create-log.dto';
import { Log } from '../../../domain/models/log.model';
import { LogDbEntity } from '../log-db.entity';
import { LogsDatabaseRepository } from '../logs-db.repository';

/**
 * Builds a log fixture, overriding only the fields under test.
 */
function log(overrides: Partial<Log> = {}): Log {
    return {
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
        seq: 1,
        type: 'line',
        content: 'building service',
        status: null,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        ...overrides,
    };
}

describe('LogsDatabaseRepository', () => {
    const createDto: CreateLogDto = {
        deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
        seq: 1,
        type: 'line',
        content: 'building service',
        status: null,
    };

    let mockRepo: {
        find: jest.Mock;
        findOneBy: jest.Mock;
        create: jest.Mock;
        merge: jest.Mock;
        save: jest.Mock;
        delete: jest.Mock;
    };
    let repository: LogsDatabaseRepository;

    beforeEach(() => {
        mockRepo = {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            merge: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        repository = new LogsDatabaseRepository(
            mockRepo as unknown as Repository<LogDbEntity>,
        );
    });

    describe('getAllByDeployment', () => {
        it('finds log entries for the deployment ordered by sequence and returns them', async () => {
            const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';
            const logs = [log()];
            mockRepo.find.mockResolvedValue(logs);

            const result = await repository.getAllByDeployment(deploymentId);

            expect(mockRepo.find).toHaveBeenCalledWith({
                where: { deploymentId },
                order: { seq: 'ASC' },
            });
            expect(result).toEqual(logs);
        });
    });

    describe('findById', () => {
        it('finds a log entry by id and returns it', async () => {
            const found = log();
            mockRepo.findOneBy.mockResolvedValue(found);

            const result = await repository.findById(found.id);

            expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: found.id });
            expect(result).toEqual(found);
        });

        it('returns null when no log entry matches the id', async () => {
            mockRepo.findOneBy.mockResolvedValue(null);

            const result = await repository.findById('missing-id');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('creates an entity from the DTO, saves it, and returns the saved log entry', async () => {
            const entity = log();
            const saved = log();
            mockRepo.create.mockReturnValue(entity);
            mockRepo.save.mockResolvedValue(saved);

            const result = await repository.create(createDto);

            expect(mockRepo.create).toHaveBeenCalledWith(createDto);
            expect(mockRepo.save).toHaveBeenCalledWith(entity);
            expect(result).toEqual(saved);
        });
    });

    describe('createMany', () => {
        it('creates entities from the DTOs, saves them, and returns the saved log entries', async () => {
            const entities = [log(), log({ seq: 2, type: 'end', content: null, status: 'success' })];
            const dtos: CreateLogDto[] = [createDto, {
                deploymentId: createDto.deploymentId, seq: 2, type: 'end', content: null, status: 'success',
            }];
            mockRepo.create.mockReturnValue(entities);
            mockRepo.save.mockResolvedValue(entities);

            const result = await repository.createMany(dtos);

            expect(mockRepo.create).toHaveBeenCalledWith(dtos);
            expect(mockRepo.save).toHaveBeenCalledWith(entities);
            expect(result).toEqual(entities);
        });
    });

    describe('update', () => {
        it('returns null and does not save when the log entry is not found', async () => {
            mockRepo.findOneBy.mockResolvedValue(null);

            const result = await repository.update('missing-id', { content: 'edited' });

            expect(result).toBeNull();
            expect(mockRepo.save).not.toHaveBeenCalled();
        });

        it('merges the DTO into the existing entity, saves it, and returns it', async () => {
            const existing = log();
            mockRepo.findOneBy.mockResolvedValue(existing);
            mockRepo.save.mockImplementation((entity: Log) => Promise.resolve(entity));

            const result = await repository.update(existing.id, { content: 'edited' });

            expect(mockRepo.merge).toHaveBeenCalledWith(existing, { content: 'edited' });
            expect(mockRepo.save).toHaveBeenCalledWith(existing);
            expect(result).toEqual(existing);
        });
    });

    describe('delete', () => {
        it('returns true when a row was affected', async () => {
            mockRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

            const result = await repository.delete('some-id');

            expect(mockRepo.delete).toHaveBeenCalledWith('some-id');
            expect(result).toBe(true);
        });

        it('returns false when no rows were affected', async () => {
            mockRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

            const result = await repository.delete('some-id');

            expect(result).toBe(false);
        });

        it('returns false when affected is undefined', async () => {
            mockRepo.delete.mockResolvedValue({ affected: undefined, raw: [] });

            const result = await repository.delete('some-id');

            expect(result).toBe(false);
        });
    });
});
