import { DaemonVolume } from '../../domain/models/daemon-volume.models';
import { Volume } from '../../domain/models/volume.models';
import { DaemonVolumesRepository } from '../../domain/repositories/daemon-volumes.repository';
import { VolumesRepository } from '../../domain/repositories/volumes.repository';
import { copyLegacyVolumesUseCase, getVolumeLegacyDaemonNameUseCase } from '../copy-legacy-volumes.use-case';

import { Service } from '@features/services/domain/models/service.models';

describe('copyLegacyVolumesUseCase', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service',
        description: '',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        providerId: null,
        composeProject: 'gitpaas_web',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    const legacyName = 'my-service_gitpaas-1';
    const daemonName = 'gitpaas_web_my-service_gitpaas-1';

    /** Builds a volume of the service, overriding only the fields under test. */
    const volume = (overrides: Partial<Volume> = {}): Volume => ({
        id: '9c858901-8a57-4791-81fe-4c455b099bc9',
        serviceId: service.id,
        name: 'data',
        daemonKey: 'gitpaas-1',
        origin: 'gitpaas',
        ...overrides,
    });

    /** Builds a volume the daemon holds, overriding only the fields under test. */
    const daemonVolume = (overrides: Partial<DaemonVolume> = {}): DaemonVolume => ({
        name: legacyName,
        driver: 'local',
        mountpoint: `/var/lib/docker/volumes/${legacyName}/_data`,
        ...overrides,
    });

    let mockVolumesRepository: jest.Mocked<Pick<VolumesRepository, 'listByService'>>;
    let mockDaemonVolumesRepository: jest.Mocked<Pick<DaemonVolumesRepository, 'findByName' | 'create' | 'copyData'>>;
    let onLine: jest.Mock<void, [string]>;

    /** Names the daemon holds a volume under, the others being absent. */
    const daemonHolds = (...names: string[]): void => {
        mockDaemonVolumesRepository.findByName.mockImplementation((name) =>
            Promise.resolve(names.includes(name) ? daemonVolume({ name }) : null));
    };

    const run = (): Promise<void> => {
        return copyLegacyVolumesUseCase(
            mockVolumesRepository as unknown as VolumesRepository,
            mockDaemonVolumesRepository as unknown as DaemonVolumesRepository,
            service,
            onLine,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockVolumesRepository = {
            listByService: jest.fn().mockResolvedValue([volume()]),
        };
        mockDaemonVolumesRepository = {
            findByName: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(undefined),
            copyData: jest.fn().mockResolvedValue(undefined),
        };
        onLine = jest.fn();
    });

    it('reads the volumes the service declares', async () => {
        await run();

        expect(mockVolumesRepository.listByService).toHaveBeenCalledTimes(1);
        expect(mockVolumesRepository.listByService).toHaveBeenCalledWith(service.id);
    });

    it('creates the volume of the new name and copies the data of the volume of the old name into it', async () => {
        daemonHolds(legacyName);

        await run();

        expect(mockDaemonVolumesRepository.findByName).toHaveBeenNthCalledWith(1, daemonName);
        expect(mockDaemonVolumesRepository.findByName).toHaveBeenNthCalledWith(2, legacyName);
        expect(mockDaemonVolumesRepository.create).toHaveBeenCalledWith(service, daemonName);
        expect(mockDaemonVolumesRepository.copyData).toHaveBeenCalledWith(legacyName, daemonName);
        expect(mockDaemonVolumesRepository.create.mock.invocationCallOrder[0])
            .toBeLessThan(mockDaemonVolumesRepository.copyData.mock.invocationCallOrder[0]);
    });

    it('writes one line for each volume it copies', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([
            volume(),
            volume({ id: '00000000-0000-4000-8000-000000000002', name: 'cache', daemonKey: 'gitpaas-2' }),
        ]);
        daemonHolds(legacyName, 'my-service_gitpaas-2');

        await run();

        expect(onLine).toHaveBeenCalledTimes(2);
        expect(onLine).toHaveBeenNthCalledWith(1, `▹ Copied the data of the volume data from ${legacyName} into ${daemonName}.`);
        expect(onLine).toHaveBeenNthCalledWith(
            2,
            '▹ Copied the data of the volume cache from my-service_gitpaas-2 into gitpaas_web_my-service_gitpaas-2.',
        );
    });

    it('copies nothing and writes no line when the daemon already holds the volume of the new name', async () => {
        daemonHolds(daemonName, legacyName);

        await run();

        expect(mockDaemonVolumesRepository.create).not.toHaveBeenCalled();
        expect(mockDaemonVolumesRepository.copyData).not.toHaveBeenCalled();
        expect(onLine).not.toHaveBeenCalled();
    });

    it('copies nothing and writes no line when the daemon holds no volume of the old name', async () => {
        daemonHolds();

        await run();

        expect(mockDaemonVolumesRepository.create).not.toHaveBeenCalled();
        expect(mockDaemonVolumesRepository.copyData).not.toHaveBeenCalled();
        expect(onLine).not.toHaveBeenCalled();
    });

    it('reads no volume of the daemon when the service declares none', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([]);

        await run();

        expect(mockDaemonVolumesRepository.findByName).not.toHaveBeenCalled();
        expect(onLine).not.toHaveBeenCalled();
    });

    it('copies the volume of the next one when one volume of the service needs none', async () => {
        mockVolumesRepository.listByService.mockResolvedValue([
            volume(),
            volume({ id: '00000000-0000-4000-8000-000000000002', name: 'cache', daemonKey: 'gitpaas-2' }),
        ]);
        daemonHolds(daemonName, legacyName, 'my-service_gitpaas-2');

        await run();

        expect(mockDaemonVolumesRepository.copyData).toHaveBeenCalledTimes(1);
        expect(mockDaemonVolumesRepository.copyData).toHaveBeenCalledWith('my-service_gitpaas-2', 'gitpaas_web_my-service_gitpaas-2');
    });

    it('propagates the failure of the copy, so the deployment never starts on empty data', async () => {
        const error = new Error('the daemon refused the copy');

        daemonHolds(legacyName);
        mockDaemonVolumesRepository.copyData.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
        expect(onLine).not.toHaveBeenCalled();
    });
});

describe('getVolumeLegacyDaemonNameUseCase', () => {
    const service = { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', name: 'My Service!' } as Service;

    it('joins the slug of the name of the service with the key of the volume', () => {
        expect(getVolumeLegacyDaemonNameUseCase(service, 'gitpaas-1')).toBe('my-service_gitpaas-1');
    });

    it('falls back to the identifier of the service when its name gives an empty slug', () => {
        expect(getVolumeLegacyDaemonNameUseCase({ ...service, name: '!!!' }, 'gitpaas-1'))
            .toBe(`service-${service.id}_gitpaas-1`);
    });
});
