import { RuntimeLogFollower } from '../../domain/ports/runtime-log-follower.port';
import { followRunningContainersUseCase } from '../follow-running-containers.use-case';

import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/** Builds the summary of a container the runtime lists, overriding only the fields under test. */
const containerSummary = (id: string): RuntimeContainerSummary => ({
    id,
    names: [`/${id}`],
    image: 'nginx:latest',
    state: 'running',
    status: 'Up 2 minutes',
    createdAt: new Date('2026-08-21T11:00:00.000Z'),
    projects: ['blog'],
    serviceId: null,
    ports: [],
    networks: [],
    mounts: [],
});

describe('followRunningContainersUseCase', () => {
    let followed: string[];
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'listContainers'>>;
    let mockFollower: jest.Mocked<Pick<RuntimeLogFollower, 'followed' | 'follow' | 'unfollow'>>;

    /** Runs the use case with the mocked collaborators, applying the casts one time. */
    const run = (): Promise<number> => followRunningContainersUseCase(
        mockContainerRuntime as unknown as ContainerRuntime,
        mockFollower,
    );

    beforeEach(() => {
        jest.clearAllMocks();

        followed = [];
        mockContainerRuntime = { listContainers: jest.fn().mockResolvedValue([]) };
        mockFollower = {
            followed: jest.fn(() => [...followed]),
            follow: jest.fn((containerId: string) => { followed.push(containerId); }),
            unfollow: jest.fn((containerId: string) => {
                followed = followed.filter((id) => id !== containerId);
            }),
        };
    });

    it('asks the runtime for the containers of GitPaaS that run', async () => {
        await run();

        expect(mockContainerRuntime.listContainers).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.listContainers).toHaveBeenCalledWith({ labels: getGitpaasLabels() }, false);
    });

    describe('when a container that runs is followed by none', () => {
        beforeEach(() => {
            mockContainerRuntime.listContainers.mockResolvedValue([containerSummary('container-1')]);
        });

        it('opens the stream of its output', async () => {
            await run();

            expect(mockFollower.follow).toHaveBeenCalledTimes(1);
            expect(mockFollower.follow).toHaveBeenCalledWith('container-1');
        });

        it('returns the number of the containers that run', async () => {
            const result = await run();

            expect(result).toBe(1);
        });
    });

    describe('when a container is followed already', () => {
        beforeEach(() => {
            followed = ['container-1'];
            mockContainerRuntime.listContainers.mockResolvedValue([containerSummary('container-1')]);
        });

        it('opens no second stream, and closes none', async () => {
            await run();

            expect(mockFollower.follow).not.toHaveBeenCalled();
            expect(mockFollower.unfollow).not.toHaveBeenCalled();
        });
    });

    describe('when a followed container stopped', () => {
        beforeEach(() => {
            followed = ['container-1', 'container-2'];
            mockContainerRuntime.listContainers.mockResolvedValue([containerSummary('container-2')]);
        });

        it('closes the stream of that container alone', async () => {
            await run();

            expect(mockFollower.unfollow).toHaveBeenCalledTimes(1);
            expect(mockFollower.unfollow).toHaveBeenCalledWith('container-1');
        });
    });

    describe('when a container stopped and another one started', () => {
        beforeEach(() => {
            followed = ['container-1'];
            mockContainerRuntime.listContainers.mockResolvedValue([containerSummary('container-2')]);
        });

        it('closes the one that stopped, and opens the one that runs', async () => {
            const result = await run();

            expect(mockFollower.unfollow).toHaveBeenCalledWith('container-1');
            expect(mockFollower.follow).toHaveBeenCalledWith('container-2');
            expect(followed).toEqual(['container-2']);
            expect(result).toBe(1);
        });
    });

    describe('when no container runs', () => {
        beforeEach(() => {
            followed = ['container-1'];
        });

        it('closes every stream it held', async () => {
            const result = await run();

            expect(mockFollower.unfollow).toHaveBeenCalledWith('container-1');
            expect(mockFollower.follow).not.toHaveBeenCalled();
            expect(result).toBe(0);
        });
    });

    describe('when the daemon does not answer', () => {
        it('propagates the failure, and touches no stream', async () => {
            const error = new Error('connect ENOENT /var/run/docker.sock');
            mockContainerRuntime.listContainers.mockRejectedValue(error);

            await expect(run()).rejects.toThrow(error);
            expect(mockFollower.follow).not.toHaveBeenCalled();
            expect(mockFollower.unfollow).not.toHaveBeenCalled();
        });
    });
});
