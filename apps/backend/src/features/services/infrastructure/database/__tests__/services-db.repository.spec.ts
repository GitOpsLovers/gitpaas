import { Repository } from 'typeorm';

import { CreateServiceDto } from '../../../domain/dtos/create-service.dto';
import { UpdateServiceDto } from '../../../domain/dtos/update-service.dto';
import { ServiceDbEntity } from '../service-db.entity';
import { ServicesDatabaseRepository } from '../services-db.repository';

/**
 * Builds a service entity fixture, overriding only the fields under test.
 */
function service(overrides: Partial<ServiceDbEntity> = {}): ServiceDbEntity {
    return {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        name: 'checkout',
        projectId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        repositoryId: 'repo-1',
        deploymentBranch: 'main',
        composerPath: 'services/checkout',
        ...overrides,
    };
}

describe('ServicesDatabaseRepository', () => {
    const projectId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

    const createDto: CreateServiceDto = {
        name: 'new-service',
        projectId,
    };

    let mockRepo: {
        find: jest.Mock;
        findOneBy: jest.Mock;
        create: jest.Mock;
        merge: jest.Mock;
        save: jest.Mock;
        delete: jest.Mock;
    };
    let repository: ServicesDatabaseRepository;

    beforeEach(() => {
        mockRepo = {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            merge: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        repository = new ServicesDatabaseRepository(
            mockRepo as unknown as Repository<ServiceDbEntity>,
        );
    });

    describe('getAllByProject', () => {
        it('finds the project services newest first and returns them', async () => {
            const services = [
                service({ id: '11111111-1111-4111-8111-111111111111' }),
                service({ id: '22222222-2222-4222-8222-222222222222' }),
            ];
            mockRepo.find.mockResolvedValue(services);

            const result = await repository.getAllByProject(projectId);

            expect(mockRepo.find).toHaveBeenCalledTimes(1);
            expect(mockRepo.find).toHaveBeenCalledWith({
                where: { projectId },
                order: { id: 'DESC' },
            });
            expect(result).toEqual(services);
        });
    });

    describe('findById', () => {
        it('finds a service by id and returns it', async () => {
            const entity = service();
            mockRepo.findOneBy.mockResolvedValue(entity);

            const result = await repository.findById(entity.id);

            expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: entity.id });
            expect(result).toEqual(entity);
        });

        it('returns null when no service matches the id', async () => {
            mockRepo.findOneBy.mockResolvedValue(null);

            const result = await repository.findById('missing-id');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('creates an entity from the DTO, saves it, and returns the saved value', async () => {
            const entity = service({ name: createDto.name });
            const saved = service({ name: createDto.name });
            mockRepo.create.mockReturnValue(entity);
            mockRepo.save.mockResolvedValue(saved);

            const result = await repository.create(createDto);

            expect(mockRepo.create).toHaveBeenCalledWith(createDto);
            expect(mockRepo.save).toHaveBeenCalledWith(entity);
            expect(result).toEqual(saved);
        });
    });

    describe('update', () => {
        it('returns null and does not merge or save when the service is not found', async () => {
            mockRepo.findOneBy.mockResolvedValue(null);

            const result = await repository.update('missing-id', { name: 'renamed' });

            expect(result).toBeNull();
            expect(mockRepo.merge).not.toHaveBeenCalled();
            expect(mockRepo.save).not.toHaveBeenCalled();
        });

        it('merges the DTO into the found service, saves it, and returns the saved entity', async () => {
            const existing = service();
            const saved = service({ name: 'renamed' });
            mockRepo.findOneBy.mockResolvedValue(existing);
            mockRepo.save.mockResolvedValue(saved);

            const updateDto: UpdateServiceDto = { name: 'renamed' };
            const result = await repository.update(existing.id, updateDto);

            expect(mockRepo.merge).toHaveBeenCalledWith(existing, updateDto);
            expect(mockRepo.save).toHaveBeenCalledWith(existing);
            expect(result).toEqual(saved);
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
