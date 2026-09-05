import { DaemonVolume } from '../../domain/models/daemon-volume.models';
import { Volume } from '../../domain/models/volume.models';
import { DaemonVolumesRepository } from '../../domain/repositories/daemon-volumes.repository';
import { VolumesRepository } from '../../domain/repositories/volumes.repository';
import { adoptComposeVolumesUseCase } from '../adopt-compose-volumes.use-case';

import { Service } from '@features/services/domain/models/service.models';

const serviceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/** Builds a service fixture, overriding only the fields under test. */
const service = (overrides: Partial<Service> = {}): Service => ({
    id: serviceId,
    name: 'api',
    composeProject: 'gitpaas_web',
    ...overrides,
} as Service);

/** Builds a volume of the database fixture, overriding only the fields under test. */
const volume = (overrides: Partial<Volume> = {}): Volume => ({
    id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    serviceId,
    name: 'pgdata',
    daemonKey: 'pgdata',
    origin: 'compose',
    ...overrides,
});

/** Builds a volume of the daemon fixture, overriding only the fields under test. */
const daemonVolume = (overrides: Partial<DaemonVolume> = {}): DaemonVolume => ({
    name: 'gitpaas_web_pgdata',
    driver: 'local',
    mountpoint: '/var/lib/docker/volumes/gitpaas_web_pgdata/_data',
    ...overrides,
});

describe('adoptComposeVolumesUseCase', () => {
    let mockVolumesRepository: jest.Mocked<Pick<VolumesRepository, 'listByService' | 'create'>>;
    let mockDaemonVolumesRepository: jest.Mocked<Pick<DaemonVolumesRepository, 'listByService'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockVolumesRepository = { listByService: jest.fn(), create: jest.fn() };
        mockDaemonVolumesRepository = { listByService: jest.fn() };

        mockVolumesRepository.listByService.mockResolvedValue([]);
        mockDaemonVolumesRepository.listByService.mockResolvedValue([]);
        mockVolumesRepository.create.mockImplementation((created) => Promise.resolve(created));
    });

    /** Runs the use case with the mocked ports. */
    const run = () => adoptComposeVolumesUseCase(
        mockVolumesRepository as unknown as VolumesRepository,
        mockDaemonVolumesRepository as unknown as DaemonVolumesRepository,
        service(),
    );

    it('reads the volumes of the Compose project of the service', async () => {
        await run();

        expect(mockDaemonVolumesRepository.listByService).toHaveBeenCalledTimes(1);
        expect(mockDaemonVolumesRepository.listByService).toHaveBeenCalledWith(service());
    });

    it('records a volume of the daemon that the database does not hold, with the origin compose', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume()]);

        await run();

        expect(mockVolumesRepository.create).toHaveBeenCalledTimes(1);
        expect(mockVolumesRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            serviceId, name: 'pgdata', daemonKey: 'pgdata', origin: 'compose',
        }));
    });

    it('takes the key of the Compose file from the name of the daemon, without the prefix of the project', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume({ name: 'gitpaas_web_pg_data' })]);

        await run();

        expect(mockVolumesRepository.create).toHaveBeenCalledWith(expect.objectContaining({ daemonKey: 'pg_data' }));
    });

    it('records nothing when the database already holds the key of the volume', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume()]);
        mockVolumesRepository.listByService.mockResolvedValue([volume()]);

        await run();

        expect(mockVolumesRepository.create).not.toHaveBeenCalled();
    });

    it('keeps the record of a volume that a rename gave another display name', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([daemonVolume()]);
        mockVolumesRepository.listByService.mockResolvedValue([volume({ name: 'the database' })]);

        await run();

        expect(mockVolumesRepository.create).not.toHaveBeenCalled();
    });

    it('records each volume of the daemon the database does not hold', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([
            daemonVolume(),
            daemonVolume({ name: 'gitpaas_web_uploads' }),
        ]);
        mockVolumesRepository.listByService.mockResolvedValue([volume()]);

        await run();

        expect(mockVolumesRepository.create).toHaveBeenCalledTimes(1);
        expect(mockVolumesRepository.create).toHaveBeenCalledWith(expect.objectContaining({ daemonKey: 'uploads' }));
    });

    it('gives each recorded volume its own identifier', async () => {
        mockDaemonVolumesRepository.listByService.mockResolvedValue([
            daemonVolume(),
            daemonVolume({ name: 'gitpaas_web_uploads' }),
        ]);

        await run();

        const [first] = mockVolumesRepository.create.mock.calls[0] ?? [];
        const [second] = mockVolumesRepository.create.mock.calls[1] ?? [];

        expect(first?.id).not.toBe(second?.id);
    });

    it('records nothing when the daemon holds no volume of the project', async () => {
        await run();

        expect(mockVolumesRepository.create).not.toHaveBeenCalled();
    });

    it('propagates the failure of the read of the daemon', async () => {
        const error = new Error('daemon down');

        mockDaemonVolumesRepository.listByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
