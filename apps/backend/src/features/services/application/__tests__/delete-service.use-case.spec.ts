import { Service } from '../../domain/models/service.models';
import { ServiceRuntimeResources } from '../../domain/ports/service-runtime-resources.port';
import { ServicesRepository } from '../../domain/repositories/services.repository';
import { deleteServiceUseCase } from '../delete-service.use-case';

import { Deployment } from '@features/deployments/domain/models/deployment.models';
import { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { LogStore } from '@features/logs/domain/ports/log-store.port';

describe('deleteServiceUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    const service: Service = {
        id,
        name: 'api-gateway',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    };

    const deployments = [
        { id: 'dep-1' },
        { id: 'dep-2' },
    ] as Deployment[];

    let mockServicesRepository: jest.Mocked<Pick<ServicesRepository, 'findById' | 'delete'>>;
    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'getAllByService'>>;
    let mockServiceRuntimeResources: jest.Mocked<Pick<ServiceRuntimeResources, 'remove'>>;
    let mockLogStore: jest.Mocked<Pick<LogStore, 'purge'>>;

    const run = (): Promise<boolean> => {
        return deleteServiceUseCase(
            mockServicesRepository as unknown as ServicesRepository,
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockServiceRuntimeResources,
            mockLogStore as unknown as LogStore,
            id,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockServicesRepository = {
            findById: jest.fn(),
            delete: jest.fn(),
        };
        mockDeploymentsRepository = {
            getAllByService: jest.fn(),
        };
        mockServiceRuntimeResources = {
            remove: jest.fn().mockResolvedValue(undefined),
        };
        mockLogStore = {
            purge: jest.fn().mockResolvedValue(undefined),
        };
    });

    it('returns false and does nothing else when the service is not found', async () => {
        mockServicesRepository.findById.mockResolvedValue(null);

        const result = await run();

        expect(result).toBe(false);
        expect(mockDeploymentsRepository.getAllByService).not.toHaveBeenCalled();
        expect(mockServiceRuntimeResources.remove).not.toHaveBeenCalled();
        expect(mockLogStore.purge).not.toHaveBeenCalled();
        expect(mockServicesRepository.delete).not.toHaveBeenCalled();
    });

    it('tears down the service runtime resources with the found service', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockDeploymentsRepository.getAllByService.mockResolvedValue(deployments);
        mockServicesRepository.delete.mockResolvedValue(true);

        await run();

        expect(mockServiceRuntimeResources.remove).toHaveBeenCalledTimes(1);
        expect(mockServiceRuntimeResources.remove).toHaveBeenCalledWith(service);
    });

    it('purges the log buffer of every enumerated deployment', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockDeploymentsRepository.getAllByService.mockResolvedValue(deployments);
        mockServicesRepository.delete.mockResolvedValue(true);

        await run();

        expect(mockDeploymentsRepository.getAllByService).toHaveBeenCalledWith(id);
        expect(mockLogStore.purge).toHaveBeenCalledTimes(2);
        expect(mockLogStore.purge).toHaveBeenNthCalledWith(1, 'dep-1');
        expect(mockLogStore.purge).toHaveBeenNthCalledWith(2, 'dep-2');
    });

    it('deletes the service row and returns its result', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockDeploymentsRepository.getAllByService.mockResolvedValue([]);
        mockServicesRepository.delete.mockResolvedValue(true);

        const result = await run();

        expect(mockServicesRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockServicesRepository.delete).toHaveBeenCalledWith(id);
        expect(result).toBe(true);
    });

    it('deletes the row before performing the external cleanup', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockDeploymentsRepository.getAllByService.mockResolvedValue(deployments);
        mockServicesRepository.delete.mockResolvedValue(true);

        await run();

        const deleteOrder = mockServicesRepository.delete.mock.invocationCallOrder[0];
        const removeOrder = mockServiceRuntimeResources.remove.mock.invocationCallOrder[0];
        const firstPurgeOrder = mockLogStore.purge.mock.invocationCallOrder[0];

        expect(deleteOrder).toBeLessThan(removeOrder);
        expect(deleteOrder).toBeLessThan(firstPurgeOrder);
    });

    it('leaves external state untouched when the row deletion removes nothing', async () => {
        mockServicesRepository.findById.mockResolvedValue(service);
        mockDeploymentsRepository.getAllByService.mockResolvedValue(deployments);
        mockServicesRepository.delete.mockResolvedValue(false);

        const result = await run();

        expect(result).toBe(false);
        expect(mockServicesRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockServiceRuntimeResources.remove).not.toHaveBeenCalled();
        expect(mockLogStore.purge).not.toHaveBeenCalled();
    });
});
