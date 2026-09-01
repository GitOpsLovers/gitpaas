/* eslint-disable no-secrets/no-secrets */
import type { RuntimeLogLine } from '@gitpaas/contracts';

import { RuntimeLogStore } from '../../../domain/ports/runtime-log-store.port';
import { MemoryRuntimeLogStoreAdapter } from '../../memory/memory-runtime-log-store.adapter';
import { DockerRuntimeLogFollowerAdapter } from '../docker-runtime-log-follower.adapter';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

/** A stream of the output of a container that a test drives line by line. */
interface FakeLogStream {
    stream: AsyncIterable<RuntimeLogLine>;
    returned: () => number;
    push: (line: RuntimeLogLine) => void;
    end: () => void;
    fail: (error: unknown) => void;
}

/** Builds a stream of the output a test pushes a line into, ends, or fails. */
const fakeLogStream = (): FakeLogStream => {
    const ready: RuntimeLogLine[] = [];
    const state = { returned: 0, done: false };

    let waiting: ((result: IteratorResult<RuntimeLogLine>) => void) | null = null;
    let failing: ((error: unknown) => void) | null = null;

    /** Hands the result the loop waits for, when it waits for one. */
    const release = (result: IteratorResult<RuntimeLogLine>): void => {
        const resolve = waiting;

        waiting = null;
        failing = null;
        resolve?.(result);
    };

    const iterator: AsyncIterator<RuntimeLogLine> = {
        next: () => new Promise<IteratorResult<RuntimeLogLine>>((resolve, reject) => {
            const line = ready.shift();

            if (line !== undefined) {
                resolve({ value: line, done: false });

                return;
            }

            if (state.done) {
                resolve({ value: undefined, done: true });

                return;
            }

            waiting = resolve;
            failing = reject;
        }),
        return: () => {
            state.returned += 1;
            state.done = true;
            release({ value: undefined, done: true });

            return Promise.resolve({ value: undefined, done: true });
        },
    };

    return {
        stream: { [Symbol.asyncIterator]: () => iterator },
        returned: () => state.returned,
        push: (line) => {
            if (waiting === null) {
                ready.push(line);

                return;
            }

            release({ value: line, done: false });
        },
        end: () => {
            state.done = true;
            release({ value: undefined, done: true });
        },
        fail: (error) => {
            const reject = failing;

            waiting = null;
            failing = null;
            reject?.(error);
        },
    };
};

/** Builds a line of the output of a container, overriding only the fields under test. */
const logLine = (overrides: Partial<RuntimeLogLine> = {}): RuntimeLogLine => ({
    timestamp: '2026-08-21T12:00:00.000Z',
    source: 'stdout',
    text: 'listening on 3000',
    ...overrides,
});

/** Lets the loop of the follower run the rounds a pushed line needs. */
const settle = (): Promise<void> => new Promise((resolve) => { setImmediate(resolve); });

describe('DockerRuntimeLogFollowerAdapter', () => {
    const containerId = 'container-1';

    let stream: FakeLogStream;
    let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'readContainerLogs'>>;
    let mockStore: jest.Mocked<Pick<RuntimeLogStore, 'append' | 'close'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: DockerRuntimeLogFollowerAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        stream = fakeLogStream();
        mockContainerRuntime = { readContainerLogs: jest.fn().mockReturnValue(stream.stream) };
        mockStore = { append: jest.fn(), close: jest.fn() };
        mockLogger = {
            debug: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };
        sut = new DockerRuntimeLogFollowerAdapter(
            mockContainerRuntime as unknown as DockerContainerRuntimeAdapter,
            mockStore as unknown as MemoryRuntimeLogStoreAdapter,
            mockLogger,
        );
    });

    afterEach(() => {
        sut.onModuleDestroy();
    });

    describe('follow', () => {
        it('opens one stream that follows the container and asks for no history', () => {
            sut.follow(containerId);

            expect(mockContainerRuntime.readContainerLogs).toHaveBeenCalledTimes(1);
            expect(mockContainerRuntime.readContainerLogs).toHaveBeenCalledWith(containerId, { follow: true, tail: 0 });
        });

        it('sends every line of that stream to the store, under the container it comes from', async () => {
            sut.follow(containerId);

            stream.push(logLine({ text: 'first' }));
            await settle();
            stream.push(logLine({ text: 'second', source: 'stderr' }));
            await settle();

            expect(mockStore.append).toHaveBeenNthCalledWith(1, containerId, logLine({ text: 'first' }));
            expect(mockStore.append).toHaveBeenNthCalledWith(
                2,
                containerId,
                logLine({ text: 'second', source: 'stderr' }),
            );
        });

        it('lists the container it follows', () => {
            sut.follow(containerId);

            expect(sut.followed()).toEqual([containerId]);
        });

        it('keeps one stream alone for a container it follows already', () => {
            sut.follow(containerId);
            sut.follow(containerId);

            expect(mockContainerRuntime.readContainerLogs).toHaveBeenCalledTimes(1);
            expect(sut.followed()).toEqual([containerId]);
        });
    });

    describe('unfollow', () => {
        beforeEach(() => {
            sut.follow(containerId);
        });

        it('closes the stream of the daemon, and ends the live stream of the store', async () => {
            sut.unfollow(containerId);
            await settle();

            expect(stream.returned()).toBe(1);
            expect(mockStore.close).toHaveBeenCalledWith(containerId);
            expect(sut.followed()).toEqual([]);
        });

        it('sends no further line to the store', async () => {
            sut.unfollow(containerId);
            stream.push(logLine({ text: 'late' }));
            await settle();

            expect(mockStore.append).not.toHaveBeenCalled();
        });

        it('ends the live stream one time alone', async () => {
            sut.unfollow(containerId);
            await settle();

            expect(mockStore.close).toHaveBeenCalledTimes(1);
        });

        it('does nothing for a container it does not follow', () => {
            sut.unfollow('container-9');

            expect(mockStore.close).not.toHaveBeenCalled();
        });
    });

    describe('when the container stops', () => {
        it('drops the container it followed, and ends the live stream of the store', async () => {
            sut.follow(containerId);

            stream.end();
            await settle();

            expect(sut.followed()).toEqual([]);
            expect(mockStore.close).toHaveBeenCalledWith(containerId);
        });

        it('lets a later run follow that container again', async () => {
            sut.follow(containerId);
            stream.end();
            await settle();

            sut.follow(containerId);

            expect(mockContainerRuntime.readContainerLogs).toHaveBeenCalledTimes(2);
            expect(sut.followed()).toEqual([containerId]);
        });
    });

    describe('when the stream of the daemon fails', () => {
        const error = new Error('socket hang up');

        it('writes the failure into the log of the application, and ends the live stream', async () => {
            sut.follow(containerId);

            stream.fail(error);
            await settle();

            expect(mockLogger.error).toHaveBeenCalledWith(
                `Failed to read the output of the container ${containerId}: socket hang up`,
                error,
                'DockerRuntimeLogFollowerAdapter',
            );
            expect(mockStore.close).toHaveBeenCalledWith(containerId);
            expect(sut.followed()).toEqual([]);
        });
    });

    describe('onModuleDestroy', () => {
        it('closes every stream it holds', async () => {
            const second = fakeLogStream();
            mockContainerRuntime.readContainerLogs.mockReturnValueOnce(stream.stream).mockReturnValueOnce(second.stream);
            sut.follow(containerId);
            sut.follow('container-2');

            sut.onModuleDestroy();
            await settle();

            expect(sut.followed()).toEqual([]);
            expect(stream.returned()).toBe(1);
            expect(second.returned()).toBe(1);
            expect(mockStore.close).toHaveBeenCalledTimes(2);
        });
    });
});
