import { LogEntry } from '../../domain/models/log-entry.models';
import { LogsRepository } from '../../domain/repositories/logs.repository';
import { getLogsByDeploymentUseCase } from '../get-logs-by-deployment.use-case';

import { Deployment, DeploymentStatus } from '@features/deployments/domain/models/deployment.models';
import { DeploymentsRepository } from '@features/deployments/domain/repositories/deployments.repository';

describe('getLogsByDeploymentUseCase', () => {
    const deploymentId = 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b';
    const createdAt = new Date('2026-07-11T00:00:00.000Z');

    const entry: LogEntry = {
        id: 'a1b2c3d4-0000-0000-0000-000000000000',
        deploymentId,
        seq: 1,
        createdAt,
        type: 'line',
        data: 'building…',
    };

    const deployment = (status: DeploymentStatus, finishedAt: Date | null): Deployment => ({
        id: deploymentId,
        serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        status,
        branch: 'main',
        commit: null,
        commitMessage: null,
        composerPath: 'docker-compose.yml',
        triggeredBy: 'operator@gitpaas.dev',
        error: null,
        createdAt,
        finishedAt,
    });

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'getAllByDeployment'>>;
    let mockDeploymentsRepository: jest.Mocked<Pick<DeploymentsRepository, 'findById'>>;

    const run = () => getLogsByDeploymentUseCase(
        mockLogsRepository as unknown as LogsRepository,
        mockDeploymentsRepository as unknown as DeploymentsRepository,
        deploymentId,
    );

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogsRepository = {
            getAllByDeployment: jest.fn(),
        };
        mockDeploymentsRepository = {
            findById: jest.fn(),
        };
    });

    it('delegates to the repository with the deployment id', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([entry]);

        await run();

        expect(mockLogsRepository.getAllByDeployment).toHaveBeenCalledTimes(1);
        expect(mockLogsRepository.getAllByDeployment).toHaveBeenCalledWith(deploymentId);
    });

    it('gives the entries as available when the archive holds output', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([entry]);

        await expect(run()).resolves.toEqual({ state: 'available', entries: [entry] });
    });

    it('asks nothing of the deployments when the archive holds output', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([entry]);

        await run();

        expect(mockDeploymentsRepository.findById).not.toHaveBeenCalled();
    });

    it('says the run has not ended for an empty archive of a deployment that runs', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([]);
        mockDeploymentsRepository.findById.mockResolvedValue(deployment('running', null));

        await expect(run()).resolves.toEqual({ state: 'running', entries: [] });
    });

    it('says the run has not ended for an empty archive of a deployment that waits', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([]);
        mockDeploymentsRepository.findById.mockResolvedValue(deployment('pending', null));

        await expect(run()).resolves.toEqual({ state: 'running', entries: [] });
    });

    it('says the output went away for an empty archive of a deployment that ended well', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([]);
        mockDeploymentsRepository.findById.mockResolvedValue(deployment('success', new Date('2026-07-11T00:05:00.000Z')));

        await expect(run()).resolves.toEqual({ state: 'expired', entries: [] });
    });

    it('says the output went away for an empty archive of a deployment that failed', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([]);
        mockDeploymentsRepository.findById.mockResolvedValue(deployment('failed', new Date('2026-07-11T00:05:00.000Z')));

        await expect(run()).resolves.toEqual({ state: 'expired', entries: [] });
    });

    it('says the output went away when a date of the end is stamped without a terminal status', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([]);
        mockDeploymentsRepository.findById.mockResolvedValue(deployment('running', new Date('2026-07-11T00:05:00.000Z')));

        await expect(run()).resolves.toEqual({ state: 'expired', entries: [] });
    });

    it('says the output went away for an empty archive of a deployment that no longer exists', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([]);
        mockDeploymentsRepository.findById.mockResolvedValue(null);

        await expect(run()).resolves.toEqual({ state: 'expired', entries: [] });
    });

    it('looks the deployment up by its identifier when the archive is empty', async () => {
        mockLogsRepository.getAllByDeployment.mockResolvedValue([]);
        mockDeploymentsRepository.findById.mockResolvedValue(deployment('running', null));

        await run();

        expect(mockDeploymentsRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockDeploymentsRepository.findById).toHaveBeenCalledWith(deploymentId);
    });

    it('propagates errors thrown by the logs repository', async () => {
        const error = new Error('db unreachable');
        mockLogsRepository.getAllByDeployment.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });

    it('propagates errors thrown by the deployments repository', async () => {
        const error = new Error('db unreachable');
        mockLogsRepository.getAllByDeployment.mockResolvedValue([]);
        mockDeploymentsRepository.findById.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
