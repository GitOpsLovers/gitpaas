import { OrphanContainersRepository } from '../../domain/repositories/orphan-containers.repository';
import { removeOrphanedContainersUseCase } from '../remove-orphaned-containers.use-case';

import { Service } from '@features/services/domain/models/service.model';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';

/**
 * Builds a service fixture, overriding only the fields under test.
 */
function service(overrides: Partial<Service> = {}): Service {
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

describe('removeOrphanedContainersUseCase', () => {
    let orphanContainers: jest.Mocked<OrphanContainersRepository>;
    let servicesRepository: jest.Mocked<Pick<ServicesRepository, 'getAll'>>;

    beforeEach(() => {
        orphanContainers = { removeOrphaned: jest.fn().mockResolvedValue({ removed: 0, names: [] }) };
        servicesRepository = { getAll: jest.fn().mockResolvedValue([]) };
    });

    it('computes known compose project names from every service and passes them to the repository', async () => {
        servicesRepository.getAll.mockResolvedValue([
            service({ name: 'Checkout API' }),
            service({ name: 'billing-svc' }),
        ]);

        await removeOrphanedContainersUseCase(
            orphanContainers,
            servicesRepository as unknown as ServicesRepository,
        );

        expect(servicesRepository.getAll).toHaveBeenCalledTimes(1);
        expect(orphanContainers.removeOrphaned).toHaveBeenCalledWith(['checkout-api', 'billing-svc']);
    });

    it('falls back to the id-based project name when the slug is empty', async () => {
        servicesRepository.getAll.mockResolvedValue([service({ id: 'svc-7', name: '///' })]);

        await removeOrphanedContainersUseCase(
            orphanContainers,
            servicesRepository as unknown as ServicesRepository,
        );

        expect(orphanContainers.removeOrphaned).toHaveBeenCalledWith(['service-svc-7']);
    });

    it('returns the result produced by the repository', async () => {
        const result = { removed: 2, names: ['stale-app-1', 'ghost-app-1'] };
        orphanContainers.removeOrphaned.mockResolvedValue(result);

        const actual = await removeOrphanedContainersUseCase(
            orphanContainers,
            servicesRepository as unknown as ServicesRepository,
        );

        expect(actual).toBe(result);
    });

    it('passes an empty known set when there are no services', async () => {
        await removeOrphanedContainersUseCase(
            orphanContainers,
            servicesRepository as unknown as ServicesRepository,
        );

        expect(orphanContainers.removeOrphaned).toHaveBeenCalledWith([]);
    });
});
