import { DeploymentsRepository } from '../../domain/repositories/deployments.repository';
import { deleteDeploymentUseCase } from '../delete-deployment.use-case';

describe('deleteDeploymentUseCase', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    let repository: jest.Mocked<DeploymentsRepository>;

    beforeEach(() => {
        repository = {
            getAllByService: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
    });

    it('delegates deletion to the repository with the provided id', async () => {
        repository.delete.mockResolvedValue(true);

        await deleteDeploymentUseCase(repository, id);

        expect(repository.delete).toHaveBeenCalledTimes(1);
        expect(repository.delete).toHaveBeenCalledWith(id);
    });

    it('returns true when the repository deletes a row', async () => {
        repository.delete.mockResolvedValue(true);

        const result = await deleteDeploymentUseCase(repository, id);

        expect(result).toBe(true);
    });

    it('returns false when the repository deletes nothing', async () => {
        repository.delete.mockResolvedValue(false);

        const result = await deleteDeploymentUseCase(repository, id);

        expect(result).toBe(false);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('database unavailable');
        repository.delete.mockRejectedValue(error);

        await expect(deleteDeploymentUseCase(repository, id)).rejects.toThrow(error);
    });
});
