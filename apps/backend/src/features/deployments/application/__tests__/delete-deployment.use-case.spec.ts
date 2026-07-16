import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { deleteDeploymentUseCase } from '../delete-deployment.use-case';

import { LogStoreRepository } from '@features/logs/domain/repositories/log-store.repository';

describe('deleteDeploymentUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let repository: jest.Mocked<DeploymentsRepository>;
    let logStore: jest.Mocked<LogStoreRepository>;

    beforeEach(() => {
        repository = {
            getAllByService: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        logStore = {
            append: jest.fn(),
            complete: jest.fn(),
            stream: jest.fn(),
            purge: jest.fn(),
        };
    });

    it('delegates deletion to the repository with the provided id', async () => {
        repository.delete.mockResolvedValue(true);

        await deleteDeploymentUseCase(repository, logStore, id);

        expect(repository.delete).toHaveBeenCalledTimes(1);
        expect(repository.delete).toHaveBeenCalledWith(id);
    });

    it('purges the buffered logs when a row was deleted', async () => {
        repository.delete.mockResolvedValue(true);

        await deleteDeploymentUseCase(repository, logStore, id);

        expect(logStore.purge).toHaveBeenCalledTimes(1);
        expect(logStore.purge).toHaveBeenCalledWith(id);
    });

    it('does not purge the buffered logs when nothing was deleted', async () => {
        repository.delete.mockResolvedValue(false);

        await deleteDeploymentUseCase(repository, logStore, id);

        expect(logStore.purge).not.toHaveBeenCalled();
    });

    it('returns true when the repository deletes a row', async () => {
        repository.delete.mockResolvedValue(true);

        const result = await deleteDeploymentUseCase(repository, logStore, id);

        expect(result).toBe(true);
    });

    it('returns false when the repository deletes nothing', async () => {
        repository.delete.mockResolvedValue(false);

        const result = await deleteDeploymentUseCase(repository, logStore, id);

        expect(result).toBe(false);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.delete.mockRejectedValue(error);

        await expect(deleteDeploymentUseCase(repository, logStore, id)).rejects.toThrow(error);
    });
});
