import { Service } from '@features/services/domain/models/service.model';

import { Container } from '../../domain/models/container.model';
import { ContainersRepository } from '../../domain/repositories/containers.repository';
import { getContainersByServiceUseCase } from '../get-containers-by-service.use-case';

describe('getContainersByServiceUseCase', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'web-frontend',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    };

    const containers: Container[] = [
        {
            id: 'a1b2c3d4e5f6',
            name: 'web-frontend-app-1',
            image: 'web-frontend_app',
            state: 'running',
            status: 'Up 3 minutes',
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
        },
    ];

    let repository: jest.Mocked<ContainersRepository>;

    beforeEach(() => {
        repository = {
            listByService: jest.fn(),
        };
    });

    it('delegates the lookup to the repository with the provided service', async () => {
        repository.listByService.mockResolvedValue(containers);

        await getContainersByServiceUseCase(repository, service);

        expect(repository.listByService).toHaveBeenCalledTimes(1);
        expect(repository.listByService).toHaveBeenCalledWith(service);
    });

    it('returns the containers found by the repository', async () => {
        repository.listByService.mockResolvedValue(containers);

        const result = await getContainersByServiceUseCase(repository, service);

        expect(result).toBe(containers);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('daemon unreachable');
        repository.listByService.mockRejectedValue(error);

        await expect(getContainersByServiceUseCase(repository, service)).rejects.toThrow(error);
    });
});
