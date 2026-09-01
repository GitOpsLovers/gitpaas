import { RuntimeLogFollower } from '../../../domain/ports/runtime-log-follower.port';
import { FollowRunningContainersJob } from '../follow-running-containers.job';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

describe('FollowRunningContainersJob', () => {
    let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'listContainers'>>;
    let mockFollower: jest.Mocked<Pick<RuntimeLogFollower, 'followed' | 'follow' | 'unfollow'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: FollowRunningContainersJob;

    beforeEach(() => {
        jest.clearAllMocks();

        mockContainerRuntime = { listContainers: jest.fn().mockResolvedValue([]) };
        mockFollower = {
            followed: jest.fn().mockReturnValue([]),
            follow: jest.fn(),
            unfollow: jest.fn(),
        };
        mockLogger = {
            debug: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };
        sut = new FollowRunningContainersJob(
            mockContainerRuntime as unknown as DockerContainerRuntimeAdapter,
            mockFollower,
            mockLogger,
        );
    });

    it('delegates the reconciliation of the streams to the use case', async () => {
        await sut.followRunningContainers();

        expect(mockContainerRuntime.listContainers).toHaveBeenCalledWith({ labels: getGitpaasLabels() }, false);
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    describe('when the daemon does not answer', () => {
        const error = new Error('connect ENOENT /var/run/docker.sock');

        beforeEach(() => {
            mockContainerRuntime.listContainers.mockRejectedValue(error);
        });

        it('writes the failure into the log of the application, and throws nothing', async () => {
            await expect(sut.followRunningContainers()).resolves.toBeUndefined();

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to follow the output of the containers that run',
                error,
                'FollowRunningContainersJob',
            );
        });

        it('lets the next run try again', async () => {
            await sut.followRunningContainers();
            mockContainerRuntime.listContainers.mockResolvedValue([]);

            await sut.followRunningContainers();

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockContainerRuntime.listContainers).toHaveBeenCalledTimes(2);
        });
    });
});
