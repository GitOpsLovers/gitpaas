import { Repository } from 'typeorm';

import { CreateProjectDto } from '../../../domain/dtos/create-project.dto';
import { UpdateProjectDto } from '../../../domain/dtos/update-project.dto';
import { Project } from '../../../domain/models/project.model';
import { ProjectDbEntity } from '../project-db.entity';
import { ProjectsDatabaseRepository } from '../projects-db.repository';

/**
 * Builds a project database-entity fixture, overriding only the fields under test.
 */
const projectEntity = (overrides: Partial<ProjectDbEntity> = {}): ProjectDbEntity => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    name: 'gitpaas',
    services: [],
    ...overrides,
});

describe('ProjectsDatabaseRepository', () => {
    const createDto: CreateProjectDto = {
        name: 'new-project',
    };

    let mockRepository: jest.Mocked<
        Pick<
            Repository<ProjectDbEntity>,
            'find' | 'findOne' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'
        >
    >;
    let sut: ProjectsDatabaseRepository;

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
        sut = new ProjectsDatabaseRepository(
            mockRepository as unknown as Repository<ProjectDbEntity>,
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
            mockRepository.find.mockResolvedValue([withServices, withoutServices]);

            const result = await sut.getAll();

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                relations: { services: true },
                order: { id: 'DESC' },
            });
            expect(result).toEqual<Project[]>([
                { id: withServices.id, name: 'with-services', servicesCount: 3 },
                { id: withoutServices.id, name: 'no-services', servicesCount: 0 },
            ]);
        });

        it('returns an empty list when there are no projects', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await sut.getAll();

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('finds a project by id with services and returns the mapped domain project', async () => {
            const entity = projectEntity({
                services: [{}, {}] as ProjectDbEntity['services'],
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
                servicesCount: 2,
            });
        });

        it('returns null when no project matches the id', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await sut.findById('missing-id');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        // NOTE: the SUT returns `repository.save(...)` directly WITHOUT running the
        // `toProject` transformer, so the raw saved entity is handed back by identity.
        it('creates an entity from the DTO, saves it, and returns the saved value', async () => {
            const entity = projectEntity({ name: createDto.name });
            const saved = projectEntity({ name: createDto.name });
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.create(createDto);

            expect(mockRepository.create).toHaveBeenCalledWith(createDto);
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(result).toBe(saved);
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

        // NOTE: like `create`, `update` returns `repository.save(...)` directly WITHOUT
        // running the `toProject` transformer, so the saved entity is returned by identity.
        it('merges the DTO into the found project, saves it, and returns the saved entity', async () => {
            const existing = projectEntity();
            const saved = projectEntity({ name: 'renamed' });
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(saved);

            const updateDto: UpdateProjectDto = { name: 'renamed' };
            const result = await sut.update(existing.id, updateDto);

            expect(mockRepository.merge).toHaveBeenCalledWith(existing, updateDto);
            expect(mockRepository.save).toHaveBeenCalledWith(existing);
            expect(result).toBe(saved);
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
