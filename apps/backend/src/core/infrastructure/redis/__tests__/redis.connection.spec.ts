import { Redis } from 'ioredis';

import type { AppLogger } from '../../../domain/ports/app-logger.port';
import { RedisConnection } from '../redis.connection';

jest.mock('ioredis', () => ({
    Redis: jest.fn().mockImplementation(() => ({
        quit: jest.fn().mockResolvedValue('OK'),
        disconnect: jest.fn(),
    })),
}));

/** The mocked `ioredis` constructor, one call per socket the connection opens. */
const RedisMock = Redis as unknown as jest.Mock;

/** A connection opened by the connection under test. */
interface FakeClient { quit: jest.Mock; disconnect: jest.Mock }

describe('RedisConnection', () => {
    let sut: RedisConnection;
    let mockLogger: jest.Mocked<AppLogger>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };
        sut = new RedisConnection(mockLogger);
    });

    it('opens the command connection once and keeps it in memory', () => {
        const first = sut.getClient();
        const second = sut.getClient();

        expect(first).toBe(second);
        expect(RedisMock).toHaveBeenCalledTimes(1);
    });

    it('keeps the blocking connection apart from the command connection', () => {
        const command = sut.getClient();
        const blocking = sut.getBlockingClient();

        expect(blocking).not.toBe(command);
        expect(RedisMock).toHaveBeenCalledTimes(2);
    });

    it('opens the blocking connection once and keeps it in memory', () => {
        const first = sut.getBlockingClient();
        const second = sut.getBlockingClient();

        expect(first).toBe(second);
        expect(RedisMock).toHaveBeenCalledTimes(1);
    });

    it('closes every connection it opened on shutdown', async () => {
        const command = sut.getClient() as unknown as FakeClient;
        const blocking = sut.getBlockingClient() as unknown as FakeClient;

        await sut.onModuleDestroy();

        expect(command.quit).toHaveBeenCalledTimes(1);
        expect(blocking.quit).toHaveBeenCalledTimes(1);
    });

    it('disconnects a connection that refuses to quit cleanly', async () => {
        const command = sut.getClient() as unknown as FakeClient;

        command.quit.mockRejectedValue(new Error('connection lost'));

        await expect(sut.onModuleDestroy()).resolves.toBeUndefined();
        expect(command.disconnect).toHaveBeenCalledTimes(1);
    });

    it('reports why a connection refused to quit cleanly', async () => {
        sut.getClient();

        const command = sut.getClient() as unknown as FakeClient;

        command.quit.mockRejectedValue(new Error('connection lost'));

        await sut.onModuleDestroy();

        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'Redis connection refused to quit cleanly, disconnecting it: Error: connection lost',
            'RedisConnection',
        );
    });

    it('logs nothing when every connection quits cleanly', async () => {
        sut.getClient();

        await sut.onModuleDestroy();

        expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('opens a new command connection after a shutdown', async () => {
        sut.getClient();

        await sut.onModuleDestroy();

        sut.getClient();

        expect(RedisMock).toHaveBeenCalledTimes(2);
    });
});
