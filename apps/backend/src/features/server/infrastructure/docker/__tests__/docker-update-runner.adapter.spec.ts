import {
    DOCKER_SOCKET_PATH,
    GITPAAS_INSTALL_DIR,
    UPDATE_CONTAINER_IMAGE,
    UPDATE_SCRIPT_PATH,
} from '../../../domain/constants/platform-update.constants';
import { DockerUpdateRunnerAdapter } from '../docker-update-runner.adapter';

import { GITPAAS_MANAGED_LABEL, GITPAAS_MANAGED_VALUE } from '@core/domain/constants/gitpaas-labels.constants';
import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

describe('DockerUpdateRunnerAdapter', () => {
    const updateId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    const stream = { pull: true } as unknown as NodeJS.ReadableStream;

    let mockContainerRuntime: jest.Mocked<
        Pick<DockerContainerRuntimeAdapter, 'pullImage' | 'followProgress' | 'runDetachedContainer'>
    >;
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: DockerUpdateRunnerAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockContainerRuntime = {
            pullImage: jest.fn().mockResolvedValue(stream),
            followProgress: jest.fn().mockImplementation((_stream, onFinished: (error: unknown) => void) => {
                onFinished(null);
            }),
            runDetachedContainer: jest.fn().mockResolvedValue('c0ffee'),
        };
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };
        sut = new DockerUpdateRunnerAdapter(
            mockContainerRuntime as unknown as DockerContainerRuntimeAdapter,
            mockLogger,
        );
    });

    it('pulls the image of the updater before it runs it', async () => {
        await sut.start(updateId, 'v2.2.0');

        expect(mockContainerRuntime.pullImage).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.pullImage).toHaveBeenCalledWith(UPDATE_CONTAINER_IMAGE);
        expect(mockContainerRuntime.followProgress).toHaveBeenCalledTimes(1);
    });

    it('runs the updater detached, on the image of the Docker CLI', async () => {
        await sut.start(updateId, 'v2.2.0');

        expect(mockContainerRuntime.runDetachedContainer).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.runDetachedContainer).toHaveBeenCalledWith(expect.objectContaining({
            image: UPDATE_CONTAINER_IMAGE,
            labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE },
        }));
    });

    it('mounts the installation and the socket of the Docker daemon', async () => {
        await sut.start(updateId, 'v2.2.0');

        const [options] = mockContainerRuntime.runDetachedContainer.mock.calls[0];

        expect(options.binds).toEqual([
            `${GITPAAS_INSTALL_DIR}:${GITPAAS_INSTALL_DIR}`,
            `${DOCKER_SOCKET_PATH}:${DOCKER_SOCKET_PATH}`,
        ]);
    });

    it('runs the script of the update on the row and on the version it received', async () => {
        await sut.start(updateId, 'v2.2.0');

        const [options] = mockContainerRuntime.runDetachedContainer.mock.calls[0];

        expect(options.command.slice(0, 2)).toEqual(['sh', '-c']);
        expect(options.command.slice(3)).toEqual(['sh', updateId, 'v2.2.0']);
        expect(options.command[2]).toContain(`exec sh "${UPDATE_SCRIPT_PATH}" --update-id "$1" --version "$2"`);
    });

    it('downloads the script of the target release when the installation carries none', async () => {
        await sut.start(updateId, 'v2.2.0');

        const [options] = mockContainerRuntime.runDetachedContainer.mock.calls[0];

        expect(options.command[2]).toContain(`if [ ! -f "${UPDATE_SCRIPT_PATH}" ]; then`);
        expect(options.command[2]).toContain('scripts/update.sh');
    });

    it('reports the container that carries the update', async () => {
        await sut.start(updateId, 'v2.2.0');

        expect(mockLogger.log).toHaveBeenCalledWith(
            'The update to v2.2.0 runs in the container c0ffee',
            'DockerUpdateRunnerAdapter',
        );
    });

    it('runs no container when the pull fails', async () => {
        const error = new Error('no such image');

        mockContainerRuntime.followProgress.mockImplementation((_stream, onFinished: (error: unknown) => void) => {
            onFinished(error);
        });

        await expect(sut.start(updateId, 'v2.2.0')).rejects.toThrow(error);
        expect(mockContainerRuntime.runDetachedContainer).not.toHaveBeenCalled();
    });

    it('propagates a failure of the daemon that refuses the container', async () => {
        const error = new Error('the daemon refused the container');

        mockContainerRuntime.runDetachedContainer.mockRejectedValue(error);

        await expect(sut.start(updateId, 'v2.2.0')).rejects.toThrow(error);
    });
});
