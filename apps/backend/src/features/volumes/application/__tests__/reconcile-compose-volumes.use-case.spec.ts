import { ComposeVolumeDeclaration, ServiceVolumeMount, Volume } from '../../domain/models/volume.models';
import { ServiceVolumesRepository } from '../../domain/repositories/service-volumes.repository';
import { VolumesRepository } from '../../domain/repositories/volumes.repository';
import { reconcileComposeVolumesUseCase } from '../reconcile-compose-volumes.use-case';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const volumeId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

/** Builds a volume of the database fixture, overriding only the fields under test. */
const volume = (overrides: Partial<Volume> = {}): Volume => ({
    id: volumeId, serviceId, name: 'data', daemonKey: 'data', ...overrides,
});

/** Builds the declaration of a volume of the compose file fixture, overriding only the fields under test. */
const declaration = (overrides: Partial<ComposeVolumeDeclaration> = {}): ComposeVolumeDeclaration => ({
    daemonKey: 'data',
    mount: { composeServiceName: 'app', containerPath: '/data', readOnly: false },
    ...overrides,
});

/** Builds a mount of the join of the database fixture, overriding only the fields under test. */
const storedMount = (overrides: Partial<ServiceVolumeMount> = {}): ServiceVolumeMount => ({
    volumeId, composeServiceName: 'app', containerPath: '/data', readOnly: false, ...overrides,
});

describe('reconcileComposeVolumesUseCase', () => {
    let mockVolumesRepository: jest.Mocked<Pick<VolumesRepository, 'listByService' | 'create' | 'delete'>>;
    let mockServiceVolumesRepository: jest.Mocked<Pick<ServiceVolumesRepository, 'listByService' | 'save' | 'delete'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockVolumesRepository = { listByService: jest.fn(), create: jest.fn(), delete: jest.fn() };
        mockServiceVolumesRepository = { listByService: jest.fn(), save: jest.fn(), delete: jest.fn() };

        mockVolumesRepository.listByService.mockResolvedValue([]);
        mockVolumesRepository.create.mockImplementation((created) => Promise.resolve(created));
        mockVolumesRepository.delete.mockResolvedValue(undefined);
        mockServiceVolumesRepository.listByService.mockResolvedValue([]);
        mockServiceVolumesRepository.save.mockResolvedValue(undefined);
        mockServiceVolumesRepository.delete.mockResolvedValue(undefined);
    });

    /** Runs the use case with the mocked ports. */
    const run = (declarations: ComposeVolumeDeclaration[]) => reconcileComposeVolumesUseCase(
        mockVolumesRepository as unknown as VolumesRepository,
        mockServiceVolumesRepository,
        serviceId,
        declarations,
    );

    describe('the insert', () => {
        it('records a volume the compose file declares and the database does not hold', async () => {
            await run([declaration()]);

            expect(mockVolumesRepository.create).toHaveBeenCalledTimes(1);
            expect(mockVolumesRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                serviceId, name: 'data', daemonKey: 'data',
            }));
        });

        it('caches the mount the compose file declares for the volume it records', async () => {
            await run([declaration()]);

            const [created] = mockVolumesRepository.create.mock.calls[0] ?? [];

            expect(mockServiceVolumesRepository.save).toHaveBeenCalledTimes(1);
            expect(mockServiceVolumesRepository.save).toHaveBeenCalledWith(serviceId, {
                volumeId: created?.id, composeServiceName: 'app', containerPath: '/data', readOnly: false,
            });
        });

        it('caches no mount for a volume no service of the compose file mounts', async () => {
            await run([declaration({ mount: null })]);

            expect(mockVolumesRepository.create).toHaveBeenCalledTimes(1);
            expect(mockServiceVolumesRepository.save).not.toHaveBeenCalled();
        });

        it('gives each recorded volume its own identifier', async () => {
            await run([declaration(), declaration({ daemonKey: 'uploads' })]);

            const [first] = mockVolumesRepository.create.mock.calls[0] ?? [];
            const [second] = mockVolumesRepository.create.mock.calls[1] ?? [];

            expect(first?.id).not.toBe(second?.id);
        });

        it('records nothing when the compose file declares no volume', async () => {
            await run([]);

            expect(mockVolumesRepository.create).not.toHaveBeenCalled();
            expect(mockVolumesRepository.delete).not.toHaveBeenCalled();
        });
    });

    describe('the update', () => {
        it('never records again a volume the database already holds', async () => {
            mockVolumesRepository.listByService.mockResolvedValue([volume()]);
            mockServiceVolumesRepository.listByService.mockResolvedValue([storedMount()]);

            await run([declaration()]);

            expect(mockVolumesRepository.create).not.toHaveBeenCalled();
        });

        it('writes the cache of the mount again when the path of the compose file changed', async () => {
            mockVolumesRepository.listByService.mockResolvedValue([volume()]);
            mockServiceVolumesRepository.listByService.mockResolvedValue([storedMount()]);

            await run([declaration({ mount: { composeServiceName: 'app', containerPath: '/srv/data', readOnly: false } })]);

            expect(mockServiceVolumesRepository.save).toHaveBeenCalledTimes(1);
            expect(mockServiceVolumesRepository.save).toHaveBeenCalledWith(serviceId, {
                volumeId, composeServiceName: 'app', containerPath: '/srv/data', readOnly: false,
            });
        });

        it('writes the cache of the mount again when the mode of the compose file changed', async () => {
            mockVolumesRepository.listByService.mockResolvedValue([volume()]);
            mockServiceVolumesRepository.listByService.mockResolvedValue([storedMount()]);

            await run([declaration({ mount: { composeServiceName: 'app', containerPath: '/data', readOnly: true } })]);

            expect(mockServiceVolumesRepository.save).toHaveBeenCalledWith(serviceId, {
                volumeId, composeServiceName: 'app', containerPath: '/data', readOnly: true,
            });
        });

        it('writes the cache of the mount again when another service of the compose file mounts the volume', async () => {
            mockVolumesRepository.listByService.mockResolvedValue([volume()]);
            mockServiceVolumesRepository.listByService.mockResolvedValue([storedMount()]);

            await run([declaration({ mount: { composeServiceName: 'worker', containerPath: '/data', readOnly: false } })]);

            expect(mockServiceVolumesRepository.save).toHaveBeenCalledWith(serviceId, {
                volumeId, composeServiceName: 'worker', containerPath: '/data', readOnly: false,
            });
        });

        it('leaves the cache untouched when the compose file declares the mount the database holds', async () => {
            mockVolumesRepository.listByService.mockResolvedValue([volume()]);
            mockServiceVolumesRepository.listByService.mockResolvedValue([storedMount()]);

            await run([declaration()]);

            expect(mockServiceVolumesRepository.save).not.toHaveBeenCalled();
            expect(mockServiceVolumesRepository.delete).not.toHaveBeenCalled();
        });

        it('caches the mount of a volume the database holds with no mount', async () => {
            mockVolumesRepository.listByService.mockResolvedValue([volume()]);

            await run([declaration()]);

            expect(mockServiceVolumesRepository.save).toHaveBeenCalledWith(serviceId, {
                volumeId, composeServiceName: 'app', containerPath: '/data', readOnly: false,
            });
        });
    });

    describe('the prune', () => {
        it('deletes the volume the compose file no longer declares', async () => {
            mockVolumesRepository.listByService.mockResolvedValue([volume({ daemonKey: 'uploads' })]);

            await run([]);

            expect(mockVolumesRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockVolumesRepository.delete).toHaveBeenCalledWith(volumeId);
        });

        it('keeps the volume the compose file still declares', async () => {
            mockVolumesRepository.listByService.mockResolvedValue([volume()]);

            await run([declaration()]);

            expect(mockVolumesRepository.delete).not.toHaveBeenCalled();
        });

        it('deletes the cache of the mount when no service of the compose file mounts the volume any more', async () => {
            mockVolumesRepository.listByService.mockResolvedValue([volume()]);
            mockServiceVolumesRepository.listByService.mockResolvedValue([storedMount()]);

            await run([declaration({ mount: null })]);

            expect(mockServiceVolumesRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockServiceVolumesRepository.delete).toHaveBeenCalledWith(serviceId, volumeId);
        });

        it('deletes no cache of a mount when the volume holds none', async () => {
            mockVolumesRepository.listByService.mockResolvedValue([volume()]);

            await run([declaration({ mount: null })]);

            expect(mockServiceVolumesRepository.delete).not.toHaveBeenCalled();
        });

        it('deletes each volume the compose file no longer declares, and records the one it added', async () => {
            mockVolumesRepository.listByService.mockResolvedValue([
                volume({ id: volumeId, daemonKey: 'uploads' }),
                volume({ id: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f', daemonKey: 'cache' }),
            ]);

            await run([declaration()]);

            expect(mockVolumesRepository.delete).toHaveBeenCalledTimes(2);
            expect(mockVolumesRepository.create).toHaveBeenCalledTimes(1);
        });
    });

    it('propagates the failure of the read of the volumes of the database', async () => {
        const error = new Error('database down');

        mockVolumesRepository.listByService.mockRejectedValue(error);

        await expect(run([declaration()])).rejects.toThrow(error);
    });
});
