import { Service } from '../../domain/models/service.model';
import { ServiceFootprintRepository } from '../../domain/repositories/service-footprint.repository';
import { ServicesRepository } from '../../domain/repositories/services.repository';
import { deleteServiceUseCase } from '../delete-service.use-case';

import { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';
import { Deployment } from '@features/deployments/domain/models/deployment.model';
import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';

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

    let servicesRepository: jest.Mocked<ServicesRepository>;
    let deploymentsRepository: jest.Mocked<DeploymentsRepository>;
    let serviceFootprint: jest.Mocked<ServiceFootprintRepository>;
    let logStore: jest.Mocked<LogStoreRepository>;

    beforeEach(() => {
        servicesRepository = {
            getAllByProject: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        deploymentsRepository = {
            getAllByService: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        serviceFootprint = {
            remove: jest.fn().mockResolvedValue(undefined),
        };
        logStore = {
            append: jest.fn(),
            complete: jest.fn(),
            stream: jest.fn(),
            purge: jest.fn().mockResolvedValue(undefined),
        };
    });

    it('returns false and does nothing else when the service is not found', async () => {
        servicesRepository.findById.mockResolvedValue(null);

        const result = await deleteServiceUseCase(
            servicesRepository,
            deploymentsRepository,
            serviceFootprint,
            logStore,
            id,
        );

        expect(result).toBe(false);
        expect(deploymentsRepository.getAllByService).not.toHaveBeenCalled();
        expect(serviceFootprint.remove).not.toHaveBeenCalled();
        expect(logStore.purge).not.toHaveBeenCalled();
        expect(servicesRepository.delete).not.toHaveBeenCalled();
    });

    it('tears down the service Docker footprint with the found service', async () => {
        servicesRepository.findById.mockResolvedValue(service);
        deploymentsRepository.getAllByService.mockResolvedValue(deployments);
        servicesRepository.delete.mockResolvedValue(true);

        await deleteServiceUseCase(
            servicesRepository,
            deploymentsRepository,
            serviceFootprint,
            logStore,
            id,
        );

        expect(serviceFootprint.remove).toHaveBeenCalledTimes(1);
        expect(serviceFootprint.remove).toHaveBeenCalledWith(service);
    });

    it('purges the log buffer of every enumerated deployment', async () => {
        servicesRepository.findById.mockResolvedValue(service);
        deploymentsRepository.getAllByService.mockResolvedValue(deployments);
        servicesRepository.delete.mockResolvedValue(true);

        await deleteServiceUseCase(
            servicesRepository,
            deploymentsRepository,
            serviceFootprint,
            logStore,
            id,
        );

        expect(deploymentsRepository.getAllByService).toHaveBeenCalledWith(id);
        expect(logStore.purge).toHaveBeenCalledTimes(2);
        expect(logStore.purge).toHaveBeenNthCalledWith(1, 'dep-1');
        expect(logStore.purge).toHaveBeenNthCalledWith(2, 'dep-2');
    });

    it('deletes the service row and returns its result', async () => {
        servicesRepository.findById.mockResolvedValue(service);
        deploymentsRepository.getAllByService.mockResolvedValue([]);
        servicesRepository.delete.mockResolvedValue(true);

        const result = await deleteServiceUseCase(
            servicesRepository,
            deploymentsRepository,
            serviceFootprint,
            logStore,
            id,
        );

        expect(servicesRepository.delete).toHaveBeenCalledTimes(1);
        expect(servicesRepository.delete).toHaveBeenCalledWith(id);
        expect(result).toBe(true);
    });

    it('returns false when the final row deletion removes nothing', async () => {
        servicesRepository.findById.mockResolvedValue(service);
        deploymentsRepository.getAllByService.mockResolvedValue([]);
        servicesRepository.delete.mockResolvedValue(false);

        const result = await deleteServiceUseCase(
            servicesRepository,
            deploymentsRepository,
            serviceFootprint,
            logStore,
            id,
        );

        expect(result).toBe(false);
    });
});
