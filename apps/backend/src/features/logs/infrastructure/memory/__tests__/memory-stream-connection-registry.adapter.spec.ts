import { RUNTIME_LOG_STREAM_MAX_CONNECTIONS } from '../../../domain/constants/runtime-log-stream.constants';
import { MemoryStreamConnectionRegistryAdapter } from '../memory-stream-connection-registry.adapter';

const userId = '11111111-1111-1111-1111-111111111111';
const otherUserId = '22222222-2222-2222-2222-222222222222';

describe('MemoryStreamConnectionRegistryAdapter', () => {
    let sut: MemoryStreamConnectionRegistryAdapter;

    /** Takes the given number of slots of one user, and gives what each call answered. */
    const acquireMany = (id: string, times: number): boolean[] =>
        Array.from({ length: times }, () => sut.acquire(id));

    beforeEach(() => {
        sut = new MemoryStreamConnectionRegistryAdapter();
    });

    it('gives a slot to the first connection of a user', () => {
        expect(sut.acquire(userId)).toBe(true);
    });

    it('gives a slot up to the limit of the connections of one user', () => {
        expect(acquireMany(userId, RUNTIME_LOG_STREAM_MAX_CONNECTIONS)).toEqual(
            Array.from({ length: RUNTIME_LOG_STREAM_MAX_CONNECTIONS }, () => true),
        );
    });

    it('refuses the connection that passes the limit of one user', () => {
        acquireMany(userId, RUNTIME_LOG_STREAM_MAX_CONNECTIONS);

        expect(sut.acquire(userId)).toBe(false);
    });

    it('counts the connections of each user apart', () => {
        acquireMany(userId, RUNTIME_LOG_STREAM_MAX_CONNECTIONS);

        expect(sut.acquire(otherUserId)).toBe(true);
    });

    it('gives a slot again to a user whose connection closed', () => {
        acquireMany(userId, RUNTIME_LOG_STREAM_MAX_CONNECTIONS);

        sut.release(userId);

        expect(sut.acquire(userId)).toBe(true);
    });

    it('holds the limit of the connections that stay open after one release', () => {
        acquireMany(userId, RUNTIME_LOG_STREAM_MAX_CONNECTIONS);
        sut.release(userId);
        sut.acquire(userId);

        expect(sut.acquire(userId)).toBe(false);
    });

    it('never lets the count of a user fall under zero', () => {
        sut.release(userId);
        sut.release(userId);

        expect(acquireMany(userId, RUNTIME_LOG_STREAM_MAX_CONNECTIONS)).toEqual(
            Array.from({ length: RUNTIME_LOG_STREAM_MAX_CONNECTIONS }, () => true),
        );
    });
});
