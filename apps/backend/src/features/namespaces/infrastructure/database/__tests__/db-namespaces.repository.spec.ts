import type { CreateNamespaceDto, UpdateNamespaceDto } from '@gitpaas/contracts';
import { EntityManager, Repository } from 'typeorm';

import { Namespace } from '../../../domain/models/namespace.models';
import { DbNamespaceEntity } from '../db-namespace.entity';
import { DatabaseNamespacesRepository } from '../db-namespaces.repository';

/**
 * Builds a namespace database-entity fixture, overriding only the fields under test.
 */
const namespaceEntity = (overrides: Partial<DbNamespaceEntity> = {}): DbNamespaceEntity => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    name: 'default',
    description: 'The scope by default',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
});

describe('DatabaseNamespacesRepository', () => {
    const createDto: CreateNamespaceDto = {
        name: 'new-namespace',
        description: 'The scope of the new work',
    };

    let mockManager: jest.Mocked<Pick<EntityManager, 'query'>>;
    let mockRepository: jest.Mocked<
        Pick<
            Repository<DbNamespaceEntity>,
            'find' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'
        >
    > & { manager: jest.Mocked<Pick<EntityManager, 'query'>> };
    let sut: DatabaseNamespacesRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockManager = {
            query: jest.fn(),
        };
        mockRepository = {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            merge: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            manager: mockManager,
        };
        sut = new DatabaseNamespacesRepository(
            mockRepository as unknown as Repository<DbNamespaceEntity>,
        );
    });

    describe('getAll', () => {
        it('finds namespaces newest first and maps them to domain', async () => {
            const first = namespaceEntity({
                id: '11111111-1111-4111-8111-111111111111',
                name: 'platform',
            });
            const second = namespaceEntity({
                id: '22222222-2222-4222-8222-222222222222',
                name: 'default',
            });
            mockRepository.find.mockResolvedValue([first, second]);

            const result = await sut.getAll();

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                order: { id: 'DESC' },
            });
            expect(result).toEqual<Namespace[]>([
                {
                    id: first.id, name: 'platform', description: first.description, createdAt: first.createdAt,
                },
                {
                    id: second.id, name: 'default', description: second.description, createdAt: second.createdAt,
                },
            ]);
        });

        it('returns an empty list when there are no namespaces', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await sut.getAll();

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('finds a namespace by id and returns the mapped domain namespace', async () => {
            const entity = namespaceEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);

            const result = await sut.findById(entity.id);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: entity.id });
            expect(result).toEqual<Namespace>({
                id: entity.id,
                name: entity.name,
                description: entity.description,
                createdAt: entity.createdAt,
            });
        });

        it('returns null when no namespace matches the id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            const result = await sut.findById('missing-id');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('creates an entity from the DTO, saves it, and maps the saved row', async () => {
            const entity = namespaceEntity({ name: createDto.name, description: createDto.description });
            const saved = namespaceEntity({ name: createDto.name, description: createDto.description });
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.create(createDto);

            expect(mockRepository.create).toHaveBeenCalledWith(createDto);
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(mockRepository.findOneBy).not.toHaveBeenCalled();
            expect(result).toEqual<Namespace>({
                id: saved.id,
                name: createDto.name,
                description: saved.description,
                createdAt: saved.createdAt,
            });
            expect(result).not.toBe(saved);
        });

        it('propagates a persistence failure raised by the save', async () => {
            const error = new Error('duplicate key value violates unique constraint');
            mockRepository.create.mockReturnValue(namespaceEntity());
            mockRepository.save.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toBe(error);
        });
    });

    describe('update', () => {
        it('returns null and does not merge or save when the namespace is not found', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            const result = await sut.update('missing-id', { name: 'renamed' });

            expect(result).toBeNull();
            expect(mockRepository.merge).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });

        it('merges the DTO into the found namespace, saves it, and maps the saved row', async () => {
            const existing = namespaceEntity();
            const saved = namespaceEntity({ name: 'renamed', description: 'The renamed scope' });
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(saved);

            const updateDto: UpdateNamespaceDto = { name: 'renamed', description: 'The renamed scope' };
            const result = await sut.update(existing.id, updateDto);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: existing.id });
            expect(mockRepository.merge).toHaveBeenCalledWith(existing, updateDto);
            expect(mockRepository.save).toHaveBeenCalledWith(existing);
            expect(result).toEqual<Namespace>({
                id: saved.id,
                name: 'renamed',
                description: saved.description,
                createdAt: saved.createdAt,
            });
            expect(result).not.toBe(saved);
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

    describe('countProjects', () => {
        it('counts the projects of the namespace with a parameterised query', async () => {
            mockManager.query.mockResolvedValue([{ count: 3 }]);

            const result = await sut.countProjects('some-id');

            expect(mockManager.query).toHaveBeenCalledTimes(1);
            expect(mockManager.query).toHaveBeenCalledWith(
                'SELECT COUNT(*)::int AS "count" FROM "projects" WHERE "namespaceId" = $1',
                ['some-id'],
            );
            expect(result).toBe(3);
        });

        it('returns 0 when the namespace holds no project', async () => {
            mockManager.query.mockResolvedValue([{ count: 0 }]);

            expect(await sut.countProjects('some-id')).toBe(0);
        });

        it('returns 0 when the driver answers no row at all', async () => {
            mockManager.query.mockResolvedValue([]);

            expect(await sut.countProjects('some-id')).toBe(0);
        });

        it('coerces a count the driver reports as a string', async () => {
            mockManager.query.mockResolvedValue([{ count: '5' }]);

            expect(await sut.countProjects('some-id')).toBe(5);
        });

        it('propagates errors raised by the query', async () => {
            const error = new Error('database unavailable');
            mockManager.query.mockRejectedValue(error);

            await expect(sut.countProjects('some-id')).rejects.toBe(error);
        });
    });
});
