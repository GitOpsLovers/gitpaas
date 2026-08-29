import { Repository } from 'typeorm';

import { DbProjectNetworkEntity } from '../db-project-network.entity';
import { DbServiceNetworkEntity } from '../db-service-network.entity';
import { DatabaseServiceNetworksRepository } from '../db-service-networks.repository';

const projectId = 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f';
const networkId = '9f2a1c3e-4b5d-4e6f-8a7b-1c2d3e4f5a6b';
const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const daemonName = `gitpaas-${projectId}-${networkId}`;

/** Builds a project network database-entity fixture, overriding only the fields under test. */
const projectNetworkEntity = (overrides: Partial<DbProjectNetworkEntity> = {}): DbProjectNetworkEntity => ({
    id: networkId,
    projectId,
    name: 'private',
    daemonName,
    ...overrides,
});

/** Builds a join database-entity fixture, overriding only the fields under test. */
const serviceNetworkEntity = (overrides: Partial<DbServiceNetworkEntity> = {}): DbServiceNetworkEntity => ({
    serviceId,
    networkId,
    network: projectNetworkEntity(),
    ...overrides,
});

describe('DatabaseServiceNetworksRepository', () => {
    let mockRepository: jest.Mocked<
        Pick<Repository<DbServiceNetworkEntity>, 'find' | 'findOneBy' | 'create' | 'save' | 'delete'>
    >;
    let sut: DatabaseServiceNetworksRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };

        sut = new DatabaseServiceNetworksRepository(
            mockRepository as unknown as Repository<DbServiceNetworkEntity>,
        );
    });

    describe('listByService', () => {
        it('reads the joins of the service with their network, ordered by the name of the network', async () => {
            mockRepository.find.mockResolvedValue([]);

            await sut.listByService(serviceId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { serviceId },
                relations: { network: true },
                order: { network: { name: 'ASC' } },
            });
        });

        it('maps the network of every join into a project network model', async () => {
            mockRepository.find.mockResolvedValue([serviceNetworkEntity()]);

            expect(await sut.listByService(serviceId)).toEqual([
                {
                    id: networkId, projectId, name: 'private', daemonName,
                },
            ]);
        });

        it('returns an empty list when the service joined no network', async () => {
            mockRepository.find.mockResolvedValue([]);

            expect(await sut.listByService(serviceId)).toEqual([]);
        });

        it('never gives a row whose relation of the network is absent', async () => {
            mockRepository.find.mockResolvedValue([serviceNetworkEntity({ network: undefined })]);

            expect(await sut.listByService(serviceId)).toEqual([]);
        });
    });

    describe('listServiceIds', () => {
        it('reads the joins of the network ordered by the service', async () => {
            mockRepository.find.mockResolvedValue([]);

            await sut.listServiceIds(networkId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { networkId },
                order: { serviceId: 'ASC' },
            });
        });

        it('returns the id of the service of every join', async () => {
            mockRepository.find.mockResolvedValue([serviceNetworkEntity()]);

            expect(await sut.listServiceIds(networkId)).toEqual([serviceId]);
        });

        it('returns an empty list when no service joined the network', async () => {
            mockRepository.find.mockResolvedValue([]);

            expect(await sut.listServiceIds(networkId)).toEqual([]);
        });
    });

    describe('join', () => {
        it('saves the made join when the pair is absent', async () => {
            const entity = serviceNetworkEntity({ network: undefined });

            mockRepository.findOneBy.mockResolvedValue(null);
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.join(serviceId, networkId);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ serviceId, networkId });
            expect(mockRepository.create).toHaveBeenCalledWith({ serviceId, networkId });
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
        });

        it('writes nothing when the service already joined the network', async () => {
            mockRepository.findOneBy.mockResolvedValue(serviceNetworkEntity());

            await sut.join(serviceId, networkId);

            expect(mockRepository.create).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('leave', () => {
        it('deletes the row of the pair', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            await sut.leave(serviceId, networkId);

            expect(mockRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockRepository.delete).toHaveBeenCalledWith({ serviceId, networkId });
        });

        it('returns true when a row was deleted', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            expect(await sut.leave(serviceId, networkId)).toBe(true);
        });

        it('returns false when the service had not joined the network', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

            expect(await sut.leave(serviceId, networkId)).toBe(false);
        });

        it('returns false when the driver gives no count of the rows', async () => {
            mockRepository.delete.mockResolvedValue({ affected: undefined, raw: [] });

            expect(await sut.leave(serviceId, networkId)).toBe(false);
        });
    });
});
