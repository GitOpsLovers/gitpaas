import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { deleteDeploymentUseCase } from '../delete-deployment.use-case';

import { LogStore } from '@features/logs/domain/ports/log-store.port';

describe('deleteDeploymentUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'delete'>>;
    let mockLogStore: jest.Mocked<Pick<LogStore, 'purge'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockDeploymentsRepository = {
            delete: jest.fn(),
        };
        mockLogStore = {
            purge: jest.fn(),
        };
    });

    it('delegates deletion to the repository with the provided id', async () => {
        mockDeploymentsRepository.delete.mockResolvedValue(true);

        await deleteDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockLogStore as unknown as LogStore,
            id,
        );

        expect(mockDeploymentsRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockDeploymentsRepository.delete).toHaveBeenCalledWith(id);
    });

    it('purges the buffered logs when a row was deleted', async () => {
        mockDeploymentsRepository.delete.mockResolvedValue(true);

        await deleteDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockLogStore as unknown as LogStore,
            id,
        );

        expect(mockLogStore.purge).toHaveBeenCalledTimes(1);
        expect(mockLogStore.purge).toHaveBeenCalledWith(id);
    });

    it('does not purge the buffered logs when nothing was deleted', async () => {
        mockDeploymentsRepository.delete.mockResolvedValue(false);

        await deleteDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockLogStore as unknown as LogStore,
            id,
        );

        expect(mockLogStore.purge).not.toHaveBeenCalled();
    });

    it('returns true when the repository deletes a row', async () => {
        mockDeploymentsRepository.delete.mockResolvedValue(true);

        const result = await deleteDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockLogStore as unknown as LogStore,
            id,
        );

        expect(result).toBe(true);
    });

    it('returns false when the repository deletes nothing', async () => {
        mockDeploymentsRepository.delete.mockResolvedValue(false);

        const result = await deleteDeploymentUseCase(
            mockDeploymentsRepository as unknown as DeploymentsRepository,
            mockLogStore as unknown as LogStore,
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
                mockLogStore as unknown as LogStore,
                id,
            ),
        ).rejects.toThrow(error);
    });
});
