import { OrphanContainers } from '../../domain/ports/orphan-containers.port';
import { removeOrphanedContainersUseCase } from '../remove-orphaned-containers.use-case';

import { Service } from '@features/services/domain/models/service.models';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Builds a service fixture, overriding only the fields under test.
 */
const service = (overrides: Partial<Service> = {}): Service => {
    return {
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        name: 'checkout',
        projectId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
        repositoryId: 'repo-1',
        deploymentBranch: 'main',
        composerPath: 'services/checkout',
        ...overrides,
    };
};

describe('removeOrphanedContainersUseCase', () => {
    let mockOrphanContainers: jest.Mocked<Pick<OrphanContainers, 'removeOrphaned'>>;
    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'getAll'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockOrphanContainers = { removeOrphaned: jest.fn().mockResolvedValue({ removed: 0, names: [] }) };
        mockServicesRepository = { getAll: jest.fn().mockResolvedValue([]) };
    });

    it('computes known compose project names from every service and passes them to the repository', async () => {
        mockServicesRepository.getAll.mockResolvedValue([
            service({ name: 'Checkout API' }),
            service({ name: 'billing-svc' }),
        ]);

        await removeOrphanedContainersUseCase(
            mockOrphanContainers,
            mockServicesRepository as unknown as ServicesRepository,
        );

        expect(mockServicesRepository.getAll).toHaveBeenCalledTimes(1);
        expect(mockOrphanContainers.removeOrphaned).toHaveBeenCalledWith(['checkout-api', 'billing-svc']);
    });

    it('falls back to the id-based project name when the slug is empty', async () => {
        mockServicesRepository.getAll.mockResolvedValue([service({ id: 'svc-7', name: '///' })]);

        await removeOrphanedContainersUseCase(
            mockOrphanContainers,
            mockServicesRepository as unknown as ServicesRepository,
        );

        expect(mockOrphanContainers.removeOrphaned).toHaveBeenCalledWith(['service-svc-7']);
    });

    it('returns the result produced by the repository', async () => {
        const result = { removed: 2, names: ['stale-app-1', 'ghost-app-1'] };
        mockOrphanContainers.removeOrphaned.mockResolvedValue(result);

        const actual = await removeOrphanedContainersUseCase(
            mockOrphanContainers,
            mockServicesRepository as unknown as ServicesRepository,
        );

        expect(actual).toBe(result);
    });

    it('passes an empty known set when there are no services', async () => {
        await removeOrphanedContainersUseCase(
            mockOrphanContainers,
            mockServicesRepository as unknown as ServicesRepository,
        );

        expect(mockOrphanContainers.removeOrphaned).toHaveBeenCalledWith([]);
    });
});
