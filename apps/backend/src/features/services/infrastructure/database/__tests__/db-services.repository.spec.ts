import { Repository } from 'typeorm';

import { CreateServiceDto } from '../../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../../domain/dtos/update-service.dto';
import { DbServiceEntity } from '../db-service.entity';
import { DatabaseServicesRepository } from '../db-services.repository';

import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';
import { ProviderNotFoundError } from '@features/source-control/domain/errors/provider.errors';

/** The failure PostgreSQL raises when the project a service points at does not exist. */
const foreignKeyViolation = Object.assign(
    new Error('insert or update on table "services" violates foreign key constraint'),
    { code: '23503', driverError: { code: '23503' } },
);

/**
 * Builds a service database-entity fixture, overriding only the fields under test.
 */
const serviceEntity = (overrides: Partial<DbServiceEntity> = {}): DbServiceEntity => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    name: 'checkout',
    projectId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
    repositoryId: 'repo-1',
    deploymentBranch: 'main',
    composerPath: 'services/checkout',
    ...overrides,
});

describe('DatabaseServicesRepository', () => {
    const projectId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

    const createDto: CreateServiceDto = {
        name: 'new-service',
        projectId,
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
    };

    let mockRepository: jest.Mocked<
        Pick<Repository<DbServiceEntity>, 'find' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'>
    >;
    let sut: DatabaseServicesRepository;

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
        sut = new DatabaseServicesRepository(
            mockRepository as unknown as Repository<DbServiceEntity>,
        );
    });

    describe('getAll', () => {
        it('finds every service across all projects and maps them to domain', async () => {
            const services = [
                serviceEntity({ id: '11111111-1111-4111-8111-111111111111' }),
                serviceEntity({ id: '22222222-2222-4222-8222-222222222222' }),
            ];
            mockRepository.find.mockResolvedValue(services);

            const result = await sut.getAll();

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith();
            expect(result).toEqual(services);
        });

        it('returns an empty list when there are no services', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await sut.getAll();

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe('getAllByProject', () => {
        it('finds the project services newest first and maps them to domain', async () => {
            const services = [
                serviceEntity({ id: '11111111-1111-4111-8111-111111111111' }),
                serviceEntity({ id: '22222222-2222-4222-8222-222222222222' }),
            ];
            mockRepository.find.mockResolvedValue(services);

            const result = await sut.getAllByProject(projectId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { projectId },
                order: { id: 'DESC' },
            });
            expect(result).toEqual(services);
        });
    });

    describe('findById', () => {
        it('finds a service by id and maps it into the domain model', async () => {
            const entity = serviceEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);

            const result = await sut.findById(entity.id);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: entity.id });
            expect(result).toEqual(entity);
        });

        it('returns null when no service matches the id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            const result = await sut.findById('missing-id');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('creates an entity from the DTO, saves it, and returns the mapped service', async () => {
            const entity = serviceEntity({ name: createDto.name });
            const saved = serviceEntity({ name: createDto.name });
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.create(createDto);

            expect(mockRepository.create).toHaveBeenCalledWith(createDto);
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(result).toEqual(saved);
        });

        it('writes a service that names no provider and maps its provider to null', async () => {
            const dtoWithoutProvider: CreateServiceDto = { name: 'new-service', projectId };
            const entity = serviceEntity({ name: dtoWithoutProvider.name, providerId: null });
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            const result = await sut.create(dtoWithoutProvider);

            expect(mockRepository.create).toHaveBeenCalledWith(dtoWithoutProvider);
            expect(result.providerId).toBeNull();
        });

        it('raises ProviderNotFoundError when the write violates the provider foreign key', async () => {
            const providerViolation = Object.assign(
                new Error('insert or update on table "services" violates foreign key constraint'),
                { code: '23503', driverError: { code: '23503', constraint: 'FK_services_providerId' } },
            );
            mockRepository.create.mockReturnValue(serviceEntity());
            mockRepository.save.mockRejectedValue(providerViolation);

            await expect(sut.create(createDto)).rejects.toBeInstanceOf(ProviderNotFoundError);
            await expect(sut.create(createDto)).rejects.toThrow(`Provider ${createDto.providerId} not found`);
        });

        it('raises ProjectNotFoundError when the write violates the project foreign key', async () => {
            mockRepository.create.mockReturnValue(serviceEntity());
            mockRepository.save.mockRejectedValue(foreignKeyViolation);

            await expect(sut.create(createDto)).rejects.toBeInstanceOf(ProjectNotFoundError);
            await expect(sut.create(createDto)).rejects.toThrow(`Project ${projectId} not found`);
        });

        it('never leaks the driver message of a foreign-key violation', async () => {
            mockRepository.create.mockReturnValue(serviceEntity());
            mockRepository.save.mockRejectedValue(foreignKeyViolation);

            await expect(sut.create(createDto)).rejects.not.toThrow(/foreign key constraint/);
        });

        it('propagates any other write failure unchanged', async () => {
            const original = new Error('connection terminated');
            mockRepository.create.mockReturnValue(serviceEntity());
            mockRepository.save.mockRejectedValue(original);

            await expect(sut.create(createDto)).rejects.toBe(original);
        });
    });

    describe('update', () => {
        it('returns null and does not merge or save when the service is not found', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            const result = await sut.update('missing-id', { name: 'renamed' });

            expect(result).toBeNull();
            expect(mockRepository.merge).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });

        it('merges the DTO into the found service, saves it, and returns the mapped service', async () => {
            const existing = serviceEntity();
            const saved = serviceEntity({ name: 'renamed' });
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(saved);

            const updateDto: UpdateServiceDto = { name: 'renamed' };
            const result = await sut.update(existing.id, updateDto);

            expect(mockRepository.merge).toHaveBeenCalledWith(existing, updateDto);
            expect(mockRepository.save).toHaveBeenCalledWith(existing);
            expect(result).toEqual(saved);
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
