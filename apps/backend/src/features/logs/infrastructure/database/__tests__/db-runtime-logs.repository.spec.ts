import { In, LessThan, MoreThanOrEqual, Repository } from 'typeorm';

import { CreateRuntimeLogDto } from '../../../domain/dtos/create-runtime-log.dto';
import { DbRuntimeLogEntity } from '../db-runtime-log.entity';
import { DatabaseRuntimeLogsRepository } from '../db-runtime-logs.repository';

/** Builds a runtime log database-entity fixture, overriding only the fields under test. */
const runtimeLogEntity = (overrides: Partial<DbRuntimeLogEntity> = {}): DbRuntimeLogEntity => ({
    id: '17',
    containerId: 'e3b0c44298fc',
    timestamp: new Date('2026-08-21T11:59:00.000Z'),
    source: 'stdout',
    text: 'listening on 3000',
    createdAt: new Date('2026-08-21T12:00:00.000Z'),
    ...overrides,
});

describe('DatabaseRuntimeLogsRepository', () => {
    const containerId = 'e3b0c44298fc';

    let mockRepository: jest.Mocked<
        Pick<Repository<DbRuntimeLogEntity>, 'find' | 'create' | 'save' | 'delete'>
    >;
    let sut: DatabaseRuntimeLogsRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            find: jest.fn().mockResolvedValue([]),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        sut = new DatabaseRuntimeLogsRepository(
            mockRepository as unknown as Repository<DbRuntimeLogEntity>,
        );
    });

    describe('createMany', () => {
        it('creates entities from the DTOs and saves them in one write', async () => {
            const dtos: CreateRuntimeLogDto[] = [{
                containerId,
                timestamp: new Date('2026-08-21T11:59:00.000Z'),
                source: 'stdout',
                text: 'listening on 3000',
            }];
            const entities = [runtimeLogEntity()];
            (mockRepository.create as jest.Mock).mockReturnValue(entities);
            (mockRepository.save as jest.Mock).mockResolvedValue(entities);

            await sut.createMany(dtos);

            expect(mockRepository.create).toHaveBeenCalledWith(dtos);
            expect(mockRepository.save).toHaveBeenCalledWith(entities);
        });
    });

    describe('getByContainer', () => {
        it('reads every line of the container in the order it was written, and maps it to domain', async () => {
            const entity = runtimeLogEntity();
            mockRepository.find.mockResolvedValue([entity]);

            const result = await sut.getByContainer(containerId);

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { containerId },
                order: { id: 'ASC' },
            });
            expect(result).toEqual([{
                id: entity.id,
                containerId,
                timestamp: entity.timestamp,
                source: 'stdout',
                text: entity.text,
                createdAt: entity.createdAt,
            }]);
        });

        it('reads the last lines and gives them back oldest first when the read asks for a tail', async () => {
            mockRepository.find.mockResolvedValue([
                runtimeLogEntity({ id: '3', text: 'third' }),
                runtimeLogEntity({ id: '2', text: 'second' }),
            ]);

            const result = await sut.getByContainer(containerId, { tail: 2 });

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { containerId },
                order: { id: 'DESC' },
                take: 2,
            });
            expect(result.map((line) => line.text)).toEqual(['second', 'third']);
        });

        it('keeps the lines of the instant the read starts at', async () => {
            const since = new Date('2026-08-21T11:00:00.000Z');

            await sut.getByContainer(containerId, { since });

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { containerId, timestamp: MoreThanOrEqual(since) },
                order: { id: 'ASC' },
            });
        });

        it('returns an empty list when the container wrote nothing', async () => {
            const result = await sut.getByContainer(containerId);

            expect(result).toEqual([]);
        });
    });

    describe('deleteCreatedBefore', () => {
        const threshold = new Date('2026-08-21T12:00:00.000Z');

        it('reads the oldest expired lines up to the bounded count, and deletes them by id', async () => {
            mockRepository.find.mockResolvedValue([runtimeLogEntity({ id: '1' }), runtimeLogEntity({ id: '2' })]);
            (mockRepository.delete as jest.Mock).mockResolvedValue({ affected: 2, raw: [] });

            const result = await sut.deleteCreatedBefore(threshold, 500);

            expect(mockRepository.find).toHaveBeenCalledWith({
                select: { id: true },
                where: { createdAt: LessThan(threshold) },
                order: { createdAt: 'ASC' },
                take: 500,
            });
            expect(mockRepository.delete).toHaveBeenCalledWith({ id: In(['1', '2']) });
            expect(result).toBe(2);
        });

        it('deletes nothing when no line passed the moment', async () => {
            const result = await sut.deleteCreatedBefore(threshold, 500);

            expect(mockRepository.delete).not.toHaveBeenCalled();
            expect(result).toBe(0);
        });

        it('counts the lines it read when the driver reports no affected row', async () => {
            mockRepository.find.mockResolvedValue([runtimeLogEntity({ id: '1' })]);
            (mockRepository.delete as jest.Mock).mockResolvedValue({ affected: null, raw: [] });

            const result = await sut.deleteCreatedBefore(threshold, 500);

            expect(result).toBe(1);
        });
    });
});
