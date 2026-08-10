import { Subject } from 'rxjs';

import { LogsRepository } from '../../../domain/repositories/logs.repository';
import { nextSequence } from '../db-log-sequencer';
import { SequencedLogEvent } from '../db-log-store.transformer';
import { StreamState } from '../db-log-stream-registry';

describe('nextSequence', () => {
    const id = '9c858901-8a57-4791-81fe-4c455b099bc9';

    /** Builds the live state of a stream, overriding only the fields under test. */
    const streamState = (overrides: Partial<StreamState> = {}): StreamState => ({
        events$: new Subject<SequencedLogEvent>(),
        pending: [],
        writing: [],
        writes: Promise.resolve(),
        producing: true,
        ...overrides,
    });

    let mockLogsRepository: jest.Mocked<Pick<LogsRepository, 'getMaxSeq'>>;

    /** Hands out the next sequence over the shared repository stand-in. */
    const sut = (streamId: string, state: StreamState): Promise<number> =>
        nextSequence(mockLogsRepository as unknown as LogsRepository, streamId, state);

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogsRepository = { getMaxSeq: jest.fn().mockResolvedValue(0) };
    });

    it('seeds the counter from the stored maximum for the requested stream', async () => {
        const state = streamState();

        await sut(id, state);

        expect(mockLogsRepository.getMaxSeq).toHaveBeenCalledTimes(1);
        expect(mockLogsRepository.getMaxSeq).toHaveBeenCalledWith(id);
    });

    it('starts at one when the stream has no stored entry', async () => {
        await expect(sut(id, streamState())).resolves.toBe(1);
    });

    it('continues from the highest stored sequence', async () => {
        mockLogsRepository.getMaxSeq.mockResolvedValue(7);

        await expect(sut(id, streamState())).resolves.toBe(8);
    });

    it('hands out a strictly increasing sequence on every call', async () => {
        const state = streamState();

        await expect(sut(id, state)).resolves.toBe(1);
        await expect(sut(id, state)).resolves.toBe(2);
        await expect(sut(id, state)).resolves.toBe(3);
    });

    it('leaves the next sequence on the state for the following caller', async () => {
        const state = streamState();

        await sut(id, state);

        expect(state.nextSeq).toBe(2);
    });

    it('queries the stored maximum only once per stream', async () => {
        const state = streamState();

        await sut(id, state);
        await sut(id, state);
        await sut(id, state);

        expect(mockLogsRepository.getMaxSeq).toHaveBeenCalledTimes(1);
    });

    it('shares one in-flight seed between concurrent callers', async () => {
        mockLogsRepository.getMaxSeq.mockResolvedValue(4);

        const state = streamState();
        const seqs = await Promise.all([sut(id, state), sut(id, state)]);

        expect(mockLogsRepository.getMaxSeq).toHaveBeenCalledTimes(1);
        expect(seqs).toEqual([5, 6]);
    });

    it('scopes the counter to the state it receives', async () => {
        const first = streamState();
        const second = streamState();

        await sut(id, first);
        await sut(id, first);

        await expect(sut('c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b', second)).resolves.toBe(1);
    });

    it('ignores the stored maximum when the counter is already seeded', async () => {
        mockLogsRepository.getMaxSeq.mockResolvedValue(99);

        const state = streamState({ nextSeq: 3, seeded: Promise.resolve(99) });

        await expect(sut(id, state)).resolves.toBe(3);
        expect(mockLogsRepository.getMaxSeq).not.toHaveBeenCalled();
    });

    it('propagates a failing seed query', async () => {
        const error = new Error('database down');

        mockLogsRepository.getMaxSeq.mockRejectedValue(error);

        await expect(sut(id, streamState())).rejects.toThrow(error);
    });

    it('keeps rejecting on a retry, since the failed seed promise is memoised', async () => {
        const error = new Error('database down');

        mockLogsRepository.getMaxSeq.mockRejectedValue(error);

        const state = streamState();

        await expect(sut(id, state)).rejects.toThrow(error);
        await expect(sut(id, state)).rejects.toThrow(error);
        expect(mockLogsRepository.getMaxSeq).toHaveBeenCalledTimes(1);
    });
});
