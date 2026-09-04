import { Repository } from 'typeorm';

import { Volume } from '../../../domain/models/volume.models';
import { DbVolumeEntity } from '../db-volume.entity';
import { DatabaseVolumesRepository } from '../db-volumes.repository';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

/** Builds a volume database-entity fixture, overriding only the fields under test. */
const volumeEntity = (overrides: Partial<DbVolumeEntity> = {}): DbVolumeEntity => ({
    id: volumeId,
    serviceId,
    name: 'data',
    daemonKey: `gitpaas-${volumeId}`,
    origin: 'gitpaas',
    ...overrides,
});

/** Builds a volume domain fixture, overriding only the fields under test. */
const volume = (overrides: Partial<Volume> = {}): Volume => ({
    id: volumeId, serviceId, name: 'data', daemonKey: `gitpaas-${volumeId}`, origin: 'gitpaas', ...overrides,
});

describe('DatabaseVolumesRepository', () => {
    let mockRepository: jest.Mocked<
        Pick<Repository<DbVolumeEntity>, 'find' | 'findOneBy' | 'create' | 'merge' | 'save'>
    >;
    let sut: DatabaseVolumesRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            find: jest.fn(), findOneBy: jest.fn(), create: jest.fn(), merge: jest.fn(), save: jest.fn(),
        };
        sut = new DatabaseVolumesRepository(mockRepository as unknown as Repository<DbVolumeEntity>);
    });

    describe('listByService', () => {
        it('reads the volumes of the service, ordered by name', async () => {
            mockRepository.find.mockResolvedValue([]);

            await sut.listByService(serviceId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({ where: { serviceId }, order: { name: 'ASC' } });
        });

        it('maps every row into the domain model', async () => {
            mockRepository.find.mockResolvedValue([volumeEntity()]);

            await expect(sut.listByService(serviceId)).resolves.toEqual([volume()]);
        });

        it('gives an empty list when the service holds no volume', async () => {
            mockRepository.find.mockResolvedValue([]);

            await expect(sut.listByService(serviceId)).resolves.toEqual([]);
        });
    });

    describe('findById', () => {
        it('reads the volume by its id', async () => {
            mockRepository.findOneBy.mockResolvedValue(volumeEntity());

            await sut.findById(volumeId);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: volumeId });
        });

        it('maps the row into the domain model', async () => {
            mockRepository.findOneBy.mockResolvedValue(volumeEntity());

            await expect(sut.findById(volumeId)).resolves.toEqual(volume());
        });

        it('gives null when no row carries that id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            await expect(sut.findById(volumeId)).resolves.toBeNull();
        });
    });

    describe('create', () => {
        it('creates the entity with the fields of the volume', async () => {
            mockRepository.create.mockReturnValue(volumeEntity());
            mockRepository.save.mockResolvedValue(volumeEntity());

            await sut.create(volume());

            expect(mockRepository.create).toHaveBeenCalledWith({
                id: volumeId,
                serviceId,
                name: 'data',
                daemonKey: `gitpaas-${volumeId}`,
                origin: 'gitpaas',
            });
        });

        it('saves the created entity and gives the mapped volume back', async () => {
            const entity = volumeEntity();

            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await expect(sut.create(volume())).resolves.toEqual(volume());
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
        });
    });

    describe('rename', () => {
        it('merges the new name into the row and saves it', async () => {
            const entity = volumeEntity();

            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(volumeEntity({ name: 'archive' }));

            await expect(sut.rename(volumeId, 'archive')).resolves.toEqual(volume({ name: 'archive' }));
            expect(mockRepository.merge).toHaveBeenCalledWith(entity, { name: 'archive' });
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
        });

        it('gives null and writes nothing when no row carries that id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            await expect(sut.rename(volumeId, 'archive')).resolves.toBeNull();
            expect(mockRepository.merge).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });
});
