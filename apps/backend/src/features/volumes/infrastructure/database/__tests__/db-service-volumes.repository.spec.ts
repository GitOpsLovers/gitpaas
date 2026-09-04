/* eslint-disable no-secrets/no-secrets */
import { Repository } from 'typeorm';

import { DbServiceVolumeEntity } from '../db-service-volume.entity';
import { DatabaseServiceVolumesRepository } from '../db-service-volumes.repository';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
const mount = { composeServiceName: 'app', containerPath: '/data', readOnly: false };

/** Builds a service volume database-entity fixture, overriding only the fields under test. */
const joinEntity = (overrides: Partial<DbServiceVolumeEntity> = {}): DbServiceVolumeEntity => ({
    serviceId, volumeId, containerPath: '/data', readOnly: false, composeServiceName: 'app', ...overrides,
});

describe('DatabaseServiceVolumesRepository', () => {
    let mockRepository: jest.Mocked<
        Pick<Repository<DbServiceVolumeEntity>, 'find' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'>
    >;
    let sut: DatabaseServiceVolumesRepository;

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
        sut = new DatabaseServiceVolumesRepository(
            mockRepository as unknown as Repository<DbServiceVolumeEntity>,
        );
    });

    describe('listByService', () => {
        it('reads the mounts of the service, ordered by the mount path', async () => {
            mockRepository.find.mockResolvedValue([]);

            await sut.listByService(serviceId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { serviceId }, order: { containerPath: 'ASC' },
            });
        });

        it('maps every row into the mount of the domain', async () => {
            mockRepository.find.mockResolvedValue([joinEntity()]);

            await expect(sut.listByService(serviceId)).resolves.toEqual([{ volumeId, ...mount }]);
        });

        it('gives an empty list when the service mounts no volume', async () => {
            mockRepository.find.mockResolvedValue([]);

            await expect(sut.listByService(serviceId)).resolves.toEqual([]);
        });
    });

    describe('attach', () => {
        it('creates the join when the service does not mount that volume yet', async () => {
            const entity = joinEntity();

            mockRepository.findOneBy.mockResolvedValue(null);
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.attach(serviceId, volumeId, mount);

            expect(mockRepository.create).toHaveBeenCalledWith({
                serviceId, volumeId, composeServiceName: 'app', containerPath: '/data', readOnly: false,
            });
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
        });

        it('replaces the mount the service already holds for that volume', async () => {
            const entity = joinEntity();

            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.attach(serviceId, volumeId, { ...mount, containerPath: '/files', readOnly: true });

            expect(mockRepository.merge).toHaveBeenCalledWith(entity, {
                composeServiceName: 'app', containerPath: '/files', readOnly: true,
            });
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(mockRepository.create).not.toHaveBeenCalled();
        });
    });

    describe('detach', () => {
        it('deletes the join of the service and of the volume', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            await sut.detach(serviceId, volumeId);

            expect(mockRepository.delete).toHaveBeenCalledWith({ serviceId, volumeId });
        });

        it('gives true when a row was deleted', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            await expect(sut.detach(serviceId, volumeId)).resolves.toBe(true);
        });

        it('gives false when no row was deleted', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

            await expect(sut.detach(serviceId, volumeId)).resolves.toBe(false);
        });

        it('gives false when the driver reports no count', async () => {
            mockRepository.delete.mockResolvedValue({ affected: undefined, raw: [] });

            await expect(sut.detach(serviceId, volumeId)).resolves.toBe(false);
        });
    });
});
