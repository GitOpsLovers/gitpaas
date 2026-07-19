import { Log } from '../../domain/models/log.model';
import { LogsRepository } from '../../domain/repositories/logs.repository';
import { getLogsByDeploymentUseCase } from '../get-logs-by-deployment.use-case';

describe('getLogsByDeploymentUseCase', () => {
    const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'getAllByDeployment'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogsRepository = {
            getAllByDeployment: jest.fn(),
        };
    });

    it('delegates to the repository with the deployment id and returns its result', async () => {
        const logs: Log[] = [];
        mockLogsRepository.getAllByDeployment.mockResolvedValue(logs);

        const result = await getLogsByDeploymentUseCase(
            mockLogsRepository as unknown as LogsRepository,
            deploymentId,
        );

        expect(mockLogsRepository.getAllByDeployment).toHaveBeenCalledWith(deploymentId);
        expect(result).toBe(logs);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('db unreachable');
        mockLogsRepository.getAllByDeployment.mockRejectedValue(error);

        await expect(
            getLogsByDeploymentUseCase(mockLogsRepository as unknown as LogsRepository, deploymentId),
        ).rejects.toThrow(error);
    });
});
