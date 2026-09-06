import { Readable } from 'node:stream';

import type { RuntimeProgressStream } from '../../domain/models/container-runtime.models';
import type { ContainerRuntime } from '../../domain/ports/container-runtime.port';
import { pullImageUseCase } from '../pull-image.use-case';

describe('pullImageUseCase', () => {
    const reference = 'elestio/pgadmin:REL-9_17';

    let stream: RuntimeProgressStream;
    let mockContainerRuntime: jest.Mocked<Pick<ContainerRuntime, 'pullImage' | 'followProgress'>>;

    /** Runs the use case with the mocked port. */
    const run = (): Promise<void> =>
        pullImageUseCase(mockContainerRuntime as unknown as ContainerRuntime, reference);

    beforeEach(() => {
        jest.clearAllMocks();
        stream = Readable.from([]);
        mockContainerRuntime = {
            pullImage: jest.fn().mockResolvedValue(stream),
            followProgress: jest.fn((_stream, onFinished, _onProgress) => { onFinished(undefined); }),
        };
    });

    it('delegates the pull of the reference to the runtime, and follows its stream', async () => {
        await run();

        expect(mockContainerRuntime.pullImage).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.pullImage).toHaveBeenCalledWith(reference);
        expect(mockContainerRuntime.followProgress).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.followProgress).toHaveBeenCalledWith(stream, expect.any(Function), expect.any(Function));
    });

    it('resolves only once the stream of the pull ended', async () => {
        let end: (error: unknown) => void = () => undefined;
        let ended = false;
        mockContainerRuntime.followProgress.mockImplementation((_stream, onFinished, _onProgress) => { end = onFinished; });

        const pull = run().then(() => { ended = true; });

        await Promise.resolve();
        expect(ended).toBe(false);

        end(undefined);
        await pull;
        expect(ended).toBe(true);
    });

    it('propagates the failure the runtime reports as an error', async () => {
        const failure = new Error('no such image');
        mockContainerRuntime.followProgress.mockImplementation((_stream, onFinished, _onProgress) => { onFinished(failure); });

        await expect(run()).rejects.toBe(failure);
    });

    it('wraps a failure that is no error into one that carries its serialized shape', async () => {
        mockContainerRuntime.followProgress.mockImplementation((_stream, onFinished, _onProgress) => { onFinished({ message: 'denied' }); });

        await expect(run()).rejects.toThrow('{"message":"denied"}');
    });

    it('propagates the rejection of the pull itself, and follows no stream', async () => {
        const failure = new Error('the daemon is down');
        mockContainerRuntime.pullImage.mockRejectedValue(failure);

        await expect(run()).rejects.toBe(failure);
        expect(mockContainerRuntime.followProgress).not.toHaveBeenCalled();
    });

    it('never rejects when the stream ends with no failure', async () => {
        await expect(run()).resolves.toBeUndefined();
    });
});
