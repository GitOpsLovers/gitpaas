import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';

import { RUNTIME_LOG_STREAM_MAX_CONNECTIONS } from '../../../domain/constants/runtime-log-stream.constants';
import { MemoryStreamConnectionRegistryAdapter } from '../../../infrastructure/memory/memory-stream-connection-registry.adapter';
import { RuntimeLogStreamGuard } from '../runtime-log-stream.guard';

import { User } from '@features/users/domain/models/user.models';

const userId = '11111111-1111-1111-1111-111111111111';

/**
 * The response of one request, with the listener of its end the guard registers.
 */
interface FakeResponse {
    once: jest.Mock;
}

/** Builds the execution context of one request, with the user the token carried. */
const contextFor = (user: Partial<User> | undefined, response: FakeResponse): ExecutionContext => ({
    switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => response,
    }),
} as unknown as ExecutionContext);

/** Builds the response of one request, whose `once` keeps the listener of the end. */
const responseWithListener = (): FakeResponse => ({ once: jest.fn() });

describe('RuntimeLogStreamGuard', () => {
    let mockStreamConnectionRegistry: jest.Mocked<Pick<MemoryStreamConnectionRegistryAdapter, 'acquire' | 'release'>>;
    let sut: RuntimeLogStreamGuard;

    beforeEach(() => {
        jest.clearAllMocks();

        mockStreamConnectionRegistry = { acquire: jest.fn(), release: jest.fn() };
        sut = new RuntimeLogStreamGuard(
            mockStreamConnectionRegistry,
        );
    });

    it('takes one slot of the connections of the user of the request', () => {
        mockStreamConnectionRegistry.acquire.mockReturnValue(true);

        const result = sut.canActivate(contextFor({ id: userId }, responseWithListener()));

        expect(result).toBe(true);
        expect(mockStreamConnectionRegistry.acquire).toHaveBeenCalledTimes(1);
        expect(mockStreamConnectionRegistry.acquire).toHaveBeenCalledWith(userId);
    });

    it('refuses the connection when the user holds its limit of the open streams', () => {
        mockStreamConnectionRegistry.acquire.mockReturnValue(false);

        expect(() => sut.canActivate(contextFor({ id: userId }, responseWithListener())))
            .toThrow(HttpException);
    });

    it('answers the refusal with the status of the too many requests', () => {
        mockStreamConnectionRegistry.acquire.mockReturnValue(false);

        const error = (() => {
            try {
                sut.canActivate(contextFor({ id: userId }, responseWithListener()));
            } catch (caught: unknown) {
                return caught as HttpException;
            }

            return undefined;
        })();

        expect(error?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(error?.message).toContain(String(RUNTIME_LOG_STREAM_MAX_CONNECTIONS));
    });

    it('gives the slot back when the response of the stream ends', () => {
        const response = responseWithListener();
        mockStreamConnectionRegistry.acquire.mockReturnValue(true);

        sut.canActivate(contextFor({ id: userId }, response));

        expect(response.once).toHaveBeenCalledWith('close', expect.any(Function));

        const [, onClose] = response.once.mock.calls[0] as [string, () => void];

        onClose();

        expect(mockStreamConnectionRegistry.release).toHaveBeenCalledTimes(1);
        expect(mockStreamConnectionRegistry.release).toHaveBeenCalledWith(userId);
    });

    it('never gives the slot back before the response of the stream ends', () => {
        mockStreamConnectionRegistry.acquire.mockReturnValue(true);

        sut.canActivate(contextFor({ id: userId }, responseWithListener()));

        expect(mockStreamConnectionRegistry.release).not.toHaveBeenCalled();
    });

    it('takes no slot of a request that carries no user', () => {
        const response = responseWithListener();

        const result = sut.canActivate(contextFor(undefined, response));

        expect(result).toBe(true);
        expect(mockStreamConnectionRegistry.acquire).not.toHaveBeenCalled();
        expect(response.once).not.toHaveBeenCalled();
    });
});
