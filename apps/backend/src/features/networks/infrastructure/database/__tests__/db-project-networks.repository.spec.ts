import { Repository } from 'typeorm';

import { DbProjectNetworkEntity } from '../db-project-network.entity';
import { DatabaseProjectNetworksRepository } from '../db-project-networks.repository';

const projectId = 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f';
const networkId = '9f2a1c3e-4b5d-4e6f-8a7b-1c2d3e4f5a6b';
const daemonName = `gitpaas-${projectId}-${networkId}`;

/** Builds a project network database-entity fixture, overriding only the fields under test. */
const projectNetworkEntity = (overrides: Partial<DbProjectNetworkEntity> = {}): DbProjectNetworkEntity => ({
    id: networkId,
    projectId,
    name: 'private',
    daemonName,
    ...overrides,
});

/** Builds the domain model that the fixture of the entity maps into. */
const projectNetwork = () => ({
    id: networkId, projectId, name: 'private', daemonName,
});

describe('DatabaseProjectNetworksRepository', () => {
    let mockRepository: jest.Mocked<
        Pick<Repository<DbProjectNetworkEntity>, 'find' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'>
    >;
    let sut: DatabaseProjectNetworksRepository;

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

        sut = new DatabaseProjectNetworksRepository(
            mockRepository as unknown as Repository<DbProjectNetworkEntity>,
        );
    });

    describe('listByProject', () => {
        it('reads the networks of the project ordered by name', async () => {
            mockRepository.find.mockResolvedValue([]);

            await sut.listByProject(projectId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { projectId },
                order: { name: 'ASC' },
            });
        });

        it('maps every row into a project network model', async () => {
            mockRepository.find.mockResolvedValue([projectNetworkEntity()]);

            expect(await sut.listByProject(projectId)).toEqual([projectNetwork()]);
        });

        it('returns an empty list when the project holds no network', async () => {
            mockRepository.find.mockResolvedValue([]);

            expect(await sut.listByProject(projectId)).toEqual([]);
        });
    });

    describe('findById', () => {
        it('reads the row by its id', async () => {
            mockRepository.findOneBy.mockResolvedValue(projectNetworkEntity());

            await sut.findById(networkId);

            expect(mockRepository.findOneBy).toHaveBeenCalledTimes(1);
            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: networkId });
        });

        it('maps the row into a project network model', async () => {
            mockRepository.findOneBy.mockResolvedValue(projectNetworkEntity());

            expect(await sut.findById(networkId)).toEqual(projectNetwork());
        });

        it('returns null when no row holds that id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.findById(networkId)).toBeNull();
        });
    });

    describe('create', () => {
        it('makes the entity with the id, the project, the display name and the name of the daemon', async () => {
            mockRepository.create.mockReturnValue(projectNetworkEntity());
            mockRepository.save.mockResolvedValue(projectNetworkEntity());

            await sut.create(projectNetwork());

            expect(mockRepository.create).toHaveBeenCalledTimes(1);
            expect(mockRepository.create).toHaveBeenCalledWith({
                id: networkId,
                projectId,
                name: 'private',
                daemonName,
            });
        });

        it('saves the made entity', async () => {
            const entity = projectNetworkEntity();

            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.create(projectNetwork());

            expect(mockRepository.save).toHaveBeenCalledTimes(1);
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
        });

        it('returns the saved row as a project network model', async () => {
            mockRepository.create.mockReturnValue(projectNetworkEntity());
            mockRepository.save.mockResolvedValue(projectNetworkEntity());

            expect(await sut.create(projectNetwork())).toEqual(projectNetwork());
        });
    });

    describe('rename', () => {
        it('merges the new display name into the stored row and saves it', async () => {
            const entity = projectNetworkEntity();

            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(projectNetworkEntity({ name: 'back office' }));

            await sut.rename(networkId, 'back office');

            expect(mockRepository.merge).toHaveBeenCalledTimes(1);
            expect(mockRepository.merge).toHaveBeenCalledWith(entity, { name: 'back office' });
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
        });

        it('returns the renamed row as a project network model', async () => {
            mockRepository.findOneBy.mockResolvedValue(projectNetworkEntity());
            mockRepository.save.mockResolvedValue(projectNetworkEntity({ name: 'back office' }));

            expect(await sut.rename(networkId, 'back office')).toEqual({
                ...projectNetwork(),
                name: 'back office',
            });
        });

        it('never keeps the name of the daemon out of step with the row', async () => {
            mockRepository.findOneBy.mockResolvedValue(projectNetworkEntity());
            mockRepository.save.mockResolvedValue(projectNetworkEntity({ name: 'back office' }));

            expect(await sut.rename(networkId, 'back office')).toMatchObject({ daemonName });
        });

        it('returns null and writes nothing when no row holds that id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.rename(networkId, 'back office')).toBeNull();
            expect(mockRepository.merge).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('deletes the row by its id', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            await sut.delete(networkId);

            expect(mockRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockRepository.delete).toHaveBeenCalledWith(networkId);
        });

        it('returns true when a row was deleted', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            expect(await sut.delete(networkId)).toBe(true);
        });

        it('returns false when no row was deleted', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

            expect(await sut.delete(networkId)).toBe(false);
        });

        it('returns false when the driver gives no count of the rows', async () => {
            mockRepository.delete.mockResolvedValue({ affected: undefined, raw: [] });

            expect(await sut.delete(networkId)).toBe(false);
        });
    });
});
