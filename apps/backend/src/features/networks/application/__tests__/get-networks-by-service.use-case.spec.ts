import { Network } from '../../domain/models/network.model';
import { NetworksRepository } from '../../domain/repositories/networks.repository';
import { getNetworksByServiceUseCase } from '../get-networks-by-service.use-case';

import { Service } from '@features/services/domain/models/service.model';

describe('getNetworksByServiceUseCase', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'web-frontend',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    };

    const networks: Network[] = [
        {
            id: 'f1e2d3c4b5a6',
            name: 'web-frontend_default',
            driver: 'bridge',
            scope: 'local',
            internal: false,
            attachable: false,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
        },
    ];

    let repository: jest.Mocked<NetworksRepository>;

    beforeEach(() => {
        repository = {
            listByService: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided service', async () => {
        repository.listByService.mockResolvedValue(networks);

        await getNetworksByServiceUseCase(repository, service);

        expect(repository.listByService).toHaveBeenCalledTimes(1);
        expect(repository.listByService).toHaveBeenCalledWith(service);
    });

    it('returns the networks found by the repository', async () => {
        repository.listByService.mockResolvedValue(networks);

        const result = await getNetworksByServiceUseCase(repository, service);

        expect(result).toBe(networks);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('daemon unreachable');
        repository.listByService.mockRejectedValue(error);

        await expect(getNetworksByServiceUseCase(repository, service)).rejects.toThrow(error);
    });
});
