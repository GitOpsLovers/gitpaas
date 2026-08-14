import { Repository } from 'typeorm';

import { UpdateProjectDto } from '../../../domain/dtos/update-project.dto';
import { ProjectNameTakenError } from '../../../domain/errors/project.errors';
import { Project } from '../../../domain/models/project.models';
import { CreateProjectData } from '../../../domain/repositories/projects.repository';
import { DbProjectEntity } from '../db-project.entity';
import { DatabaseProjectsRepository } from '../db-projects.repository';

const namespaceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const otherNamespaceId = '0a9d7ef7-8b6c-4f42-a1c2-9de3e33a95a1';

/**
 * Builds a project database-entity fixture, overriding only the fields under test.
 */
const projectEntity = (overrides: Partial<DbProjectEntity> = {}): DbProjectEntity => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    name: 'gitpaas',
    namespaceId,
    services: [],
    ...overrides,
});

/**
 * Builds the PostgreSQL unique-violation failure the driver raises for a duplicate project name.
 */
const uniqueViolation = (): unknown => ({ code: '23505' });

describe('DatabaseProjectsRepository', () => {
    const createData: CreateProjectData = {
        name: 'new-project',
        namespaceId,
    };

    let mockRepository: jest.Mocked<
        Pick<
            Repository<DbProjectEntity>,
            'find' | 'findOne' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'
        >
    >;
    let sut: DatabaseProjectsRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            merge: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        sut = new DatabaseProjectsRepository(
            mockRepository as unknown as Repository<DbProjectEntity>,
        );
    });

    describe('getAll', () => {
        it('finds projects with services newest first and maps them to domain', async () => {
            const withServices = projectEntity({
                id: '11111111-1111-4111-8111-111111111111',
                name: 'with-services',
                services: [{}, {}, {}] as DbProjectEntity['services'],
            });
            const withoutServices = projectEntity({
                id: '22222222-2222-4222-8222-222222222222',
                name: 'no-services',
                services: undefined,
            });
            mockRepository.find.mockResolvedValue([withServices, withoutServices]);

            const result = await sut.getAll(namespaceId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { namespaceId },
                relations: { services: true },
                order: { id: 'DESC' },
            });
            expect(result).toEqual<Project[]>([
                { id: withServices.id, name: 'with-services', namespaceId, servicesCount: 3 },
                { id: withoutServices.id, name: 'no-services', namespaceId, servicesCount: 0 },
            ]);
        });

        it('always scopes the query to the namespace it received, and never issues an unfiltered find', async () => {
            mockRepository.find.mockResolvedValue([]);

            await sut.getAll(otherNamespaceId);

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { namespaceId: otherNamespaceId },
                relations: { services: true },
                order: { id: 'DESC' },
            });
        });

        it('returns an empty list when the namespace holds no project', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await sut.getAll(namespaceId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('finds a project by id with services and returns the mapped domain project', async () => {
            const entity = projectEntity({
                services: [{}, {}] as DbProjectEntity['services'],
            });
            mockRepository.findOne.mockResolvedValue(entity);

            const result = await sut.findById(entity.id);

            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { id: entity.id },
                relations: { services: true },
            });
            expect(result).toEqual<Project>({
                id: entity.id,
                name: entity.name,
                namespaceId,
                servicesCount: 2,
            });
        });

        it('looks a project up by id alone, leaving the namespace check to the use cases', async () => {
            const entity = projectEntity({ namespaceId: otherNamespaceId });
            mockRepository.findOne.mockResolvedValue(entity);

            const result = await sut.findById(entity.id);

            expect(result).toEqual<Project>({
                id: entity.id,
                name: entity.name,
                namespaceId: otherNamespaceId,
                servicesCount: 0,
            });
        });

        it('returns null when no project matches the id', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await sut.findById('missing-id');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('creates an entity from the write data, saves it, and maps it without reloading', async () => {
            const entity = projectEntity({ name: createData.name });
            const saved = projectEntity({ name: createData.name });
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.create(createData);

            expect(mockRepository.create).toHaveBeenCalledWith(createData);
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(mockRepository.findOne).not.toHaveBeenCalled();
            expect(result).toEqual<Project>({
                id: saved.id,
                name: createData.name,
                namespaceId,
                servicesCount: 0,
            });
            expect(result).not.toBe(saved);
            expect(result).not.toHaveProperty('services');
        });

        it('reports no services for a newly created project even when the saved entity has no relation loaded', async () => {
            const entity = projectEntity({ name: createData.name });
            const saved = projectEntity({ name: createData.name, services: undefined });
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.create(createData);

            expect(mockRepository.findOne).not.toHaveBeenCalled();
            expect(result).toEqual<Project>({
                id: saved.id,
                name: createData.name,
                namespaceId,
                servicesCount: 0,
            });
        });

        it('ignores any services echoed back by the save without mutating the saved entity', async () => {
            const entity = projectEntity({ name: createData.name });
            const saved = projectEntity({
                name: createData.name,
                services: [{}, {}] as DbProjectEntity['services'],
            });
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.create(createData);

            expect(mockRepository.findOne).not.toHaveBeenCalled();
            expect(mockRepository.findOneBy).not.toHaveBeenCalled();
            expect(result).toEqual<Project>({
                id: saved.id,
                name: createData.name,
                namespaceId,
                servicesCount: 0,
            });
            expect(saved.services).toHaveLength(2);
        });

        it('translates a unique violation on save into a ProjectNameTakenError', async () => {
            mockRepository.create.mockReturnValue(projectEntity({ name: createData.name }));
            mockRepository.save.mockRejectedValue(uniqueViolation());

            await expect(sut.create(createData)).rejects.toBeInstanceOf(ProjectNameTakenError);
        });

        it('names the namespace and the rejected name in the duplicate-name message', async () => {
            mockRepository.create.mockReturnValue(projectEntity({ name: createData.name }));
            mockRepository.save.mockRejectedValue(uniqueViolation());

            await expect(sut.create(createData)).rejects.toThrow(
                `Project ${createData.name} already exists in namespace ${namespaceId}`,
            );
        });

        it('rethrows a save failure that is not a unique violation untouched', async () => {
            const error = new Error('connection terminated');
            mockRepository.create.mockReturnValue(projectEntity({ name: createData.name }));
            mockRepository.save.mockRejectedValue(error);

            await expect(sut.create(createData)).rejects.toBe(error);
        });
    });

    describe('update', () => {
        it('returns null and does not merge or save when the project is not found', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            const result = await sut.update('missing-id', { name: 'renamed' });

            expect(result).toBeNull();
            expect(mockRepository.merge).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });

        it('merges the DTO into the found project, saves it, and maps it without reloading', async () => {
            const existing = projectEntity();
            const saved = projectEntity({
                name: 'renamed',
                services: [{}, {}, {}] as DbProjectEntity['services'],
            });
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(saved);

            const updateDto: UpdateProjectDto = { name: 'renamed' };
            const result = await sut.update(existing.id, updateDto);

            expect(mockRepository.merge).toHaveBeenCalledWith(existing, updateDto);
            expect(mockRepository.save).toHaveBeenCalledWith(existing);
            expect(mockRepository.findOne).not.toHaveBeenCalled();
            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: existing.id });
            expect(result).toEqual<Project>({
                id: saved.id,
                name: 'renamed',
                namespaceId,
                servicesCount: 0,
            });
            expect(result).not.toBe(saved);
            expect(result).not.toHaveProperty('services');
            expect(saved.services).toHaveLength(3);
        });

        it('reports no services when the saved entity has no relation loaded', async () => {
            const existing = projectEntity();
            const saved = projectEntity({ name: 'renamed', services: undefined });
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.update(existing.id, { name: 'renamed' });

            expect(mockRepository.findOne).not.toHaveBeenCalled();
            expect(result).toEqual<Project>({
                id: saved.id,
                name: 'renamed',
                namespaceId,
                servicesCount: 0,
            });
            expect(result).not.toBe(saved);
        });

        it('does not reload the project when it is not found', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            await sut.update('missing-id', { name: 'renamed' });

            expect(mockRepository.findOne).not.toHaveBeenCalled();
        });

        it('translates a unique violation on save into a ProjectNameTakenError', async () => {
            mockRepository.findOneBy.mockResolvedValue(projectEntity());
            mockRepository.save.mockRejectedValue(uniqueViolation());

            await expect(sut.update('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', { name: 'renamed' })).rejects.toBeInstanceOf(
                ProjectNameTakenError,
            );
        });

        it('reports the conflict against the namespace of the stored row and the requested name', async () => {
            mockRepository.findOneBy.mockResolvedValue(projectEntity({ namespaceId: otherNamespaceId }));
            mockRepository.save.mockRejectedValue(uniqueViolation());

            await expect(sut.update('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', { name: 'renamed' })).rejects.toThrow(
                `Project renamed already exists in namespace ${otherNamespaceId}`,
            );
        });

        it('rethrows a save failure that is not a unique violation untouched', async () => {
            const error = new Error('connection terminated');
            mockRepository.findOneBy.mockResolvedValue(projectEntity());
            mockRepository.save.mockRejectedValue(error);

            await expect(sut.update('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', { name: 'renamed' })).rejects.toBe(error);
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
