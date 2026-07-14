import { Repository } from 'typeorm';

import { CreateProjectDto } from '../../../domain/dtos/create-project.dto';
import { UpdateProjectDto } from '../../../domain/dtos/update-project.dto';
import { Project } from '../../../domain/models/project.model';
import { ProjectDbEntity } from '../project-db.entity';
import { ProjectsDatabaseRepository } from '../projects-db.repository';

/**
 * Builds a project entity fixture, overriding only the fields under test.
 */
function projectEntity(overrides: Partial<ProjectDbEntity> = {}): ProjectDbEntity {
    return {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        name: 'artifactory',
        services: [],
        ...overrides,
    };
}

describe('ProjectsDatabaseRepository', () => {
    const createDto: CreateProjectDto = {
        name: 'new-project',
    };

    let mockRepo: {
        find: jest.Mock;
        findOne: jest.Mock;
        findOneBy: jest.Mock;
        create: jest.Mock;
        merge: jest.Mock;
        save: jest.Mock;
        delete: jest.Mock;
    };
    let repository: ProjectsDatabaseRepository;

    beforeEach(() => {
        mockRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            merge: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        repository = new ProjectsDatabaseRepository(
            mockRepo as unknown as Repository<ProjectDbEntity>,
        );
    });

    describe('getAll', () => {
        it('finds projects with services newest first and maps them to domain', async () => {
            const withServices = projectEntity({
                id: '11111111-1111-4111-8111-111111111111',
                name: 'with-services',
                services: [{}, {}, {}] as ProjectDbEntity['services'],
            });
            const withoutServices = projectEntity({
                id: '22222222-2222-4222-8222-222222222222',
                name: 'no-services',
                services: undefined,
            });
            mockRepo.find.mockResolvedValue([withServices, withoutServices]);

            const result = await repository.getAll();

            expect(mockRepo.find).toHaveBeenCalledTimes(1);
            expect(mockRepo.find).toHaveBeenCalledWith({
                relations: { services: true },
                order: { id: 'DESC' },
            });
            expect(result).toEqual<Project[]>([
                { id: withServices.id, name: 'with-services', servicesCount: 3 },
                { id: withoutServices.id, name: 'no-services', servicesCount: 0 },
            ]);
        });
    });

    describe('findById', () => {
        it('finds a project by id with services and returns the mapped domain project', async () => {
            const entity = projectEntity({
                services: [{}, {}] as ProjectDbEntity['services'],
            });
            mockRepo.findOne.mockResolvedValue(entity);

            const result = await repository.findById(entity.id);

            expect(mockRepo.findOne).toHaveBeenCalledWith({
                where: { id: entity.id },
                relations: { services: true },
            });
            expect(result).toEqual<Project>({
                id: entity.id,
                name: entity.name,
                servicesCount: 2,
            });
        });

        it('returns null when no project matches the id', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            const result = await repository.findById('missing-id');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('creates an entity from the DTO, saves it, and returns the saved value', async () => {
            const entity = projectEntity({ name: createDto.name });
            const saved = projectEntity({ name: createDto.name });
            mockRepo.create.mockReturnValue(entity);
            mockRepo.save.mockResolvedValue(saved);

            const result = await repository.create(createDto);

            expect(mockRepo.create).toHaveBeenCalledWith(createDto);
            expect(mockRepo.save).toHaveBeenCalledWith(entity);
            expect(result).toBe(saved);
        });
    });

    describe('update', () => {
        it('returns null and does not merge or save when the project is not found', async () => {
            mockRepo.findOneBy.mockResolvedValue(null);

            const result = await repository.update('missing-id', { name: 'renamed' });

            expect(result).toBeNull();
            expect(mockRepo.merge).not.toHaveBeenCalled();
            expect(mockRepo.save).not.toHaveBeenCalled();
        });

        it('merges the DTO into the found project, saves it, and returns the saved entity', async () => {
            const existing = projectEntity();
            const saved = projectEntity({ name: 'renamed' });
            mockRepo.findOneBy.mockResolvedValue(existing);
            mockRepo.save.mockResolvedValue(saved);

            const updateDto: UpdateProjectDto = { name: 'renamed' };
            const result = await repository.update(existing.id, updateDto);

            expect(mockRepo.merge).toHaveBeenCalledWith(existing, updateDto);
            expect(mockRepo.save).toHaveBeenCalledWith(existing);
            expect(result).toBe(saved);
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
