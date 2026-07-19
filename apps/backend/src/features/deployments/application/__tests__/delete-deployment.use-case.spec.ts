import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { deleteDeploymentUseCase } from '../delete-deployment.use-case';

import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';

describe('deleteDeploymentUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'delete'>>;
    let mockLogStoreRepository: jest.Mocked<Pick<LogStoreRepository, 'purge'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeploymentsRepository = {
            delete: jest.fn(),
        };
        mockLogStoreRepository = {
            purge: jest.fn(),
        };
    });

    it('delegates deletion to the repository with the provided id', async () => {
        mockDeploymentsRepository.delete.mockResolvedValue(true);

        await deleteDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockLogStoreRepository as unknown as LogStoreRepository,
            id,
        );

        expect(mockDeploymentsRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockDeploymentsRepository.delete).toHaveBeenCalledWith(id);
    });

    it('purges the buffered logs when a row was deleted', async () => {
        mockDeploymentsRepository.delete.mockResolvedValue(true);

        await deleteDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockLogStoreRepository as unknown as LogStoreRepository,
            id,
        );

        expect(mockLogStoreRepository.purge).toHaveBeenCalledTimes(1);
        expect(mockLogStoreRepository.purge).toHaveBeenCalledWith(id);
    });

    it('does not purge the buffered logs when nothing was deleted', async () => {
        mockDeploymentsRepository.delete.mockResolvedValue(false);

        await deleteDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockLogStoreRepository as unknown as LogStoreRepository,
            id,
        );

        expect(mockLogStoreRepository.purge).not.toHaveBeenCalled();
    });

    it('returns true when the repository deletes a row', async () => {
        mockDeploymentsRepository.delete.mockResolvedValue(true);

        const result = await deleteDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockLogStoreRepository as unknown as LogStoreRepository,
            id,
        );

        expect(result).toBe(true);
    });

    it('returns false when the repository deletes nothing', async () => {
        mockDeploymentsRepository.delete.mockResolvedValue(false);

        const result = await deleteDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockLogStoreRepository as unknown as LogStoreRepository,
            id,
        );

        expect(result).toBe(false);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        mockDeploymentsRepository.delete.mockRejectedValue(error);

        await expect(
            deleteDeploymentUseCase(
                mockDeploymentsRepository as unknown as DeploymentsRepository,
                mockLogStoreRepository as unknown as LogStoreRepository,
                id,
            ),
        ).rejects.toThrow(error);
    });
});
