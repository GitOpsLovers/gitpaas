import {
    RedisStreamEntry, toCreateLogDtos, toLogEventFromFields, toLogStreamKey, toProducerLeaseKey, toStreamFields,
} from '../redis-log-store.transformer';

describe('toLogStreamKey', () => {
    it('prefixes the deployment identifier with the log stream namespace', () => {
        expect(toLogStreamKey('deployment-1')).toBe('logs:deployment-1');
    });
});

describe('toProducerLeaseKey', () => {
    it('suffixes the stream key with the producer namespace', () => {
        expect(toProducerLeaseKey('deployment-1')).toBe('logs:deployment-1:producer');
    });
});

describe('toStreamFields', () => {
    it('maps a line event onto the type and content fields', () => {
        expect(toStreamFields({ type: 'line', data: 'building' })).toEqual(['type', 'line', 'content', 'building']);
    });

    it('maps an end event onto the type and status fields', () => {
        expect(toStreamFields({ type: 'end', status: 'failed' })).toEqual(['type', 'end', 'status', 'failed']);
    });

    it('keeps an empty line as an empty content field', () => {
        expect(toStreamFields({ type: 'line', data: '' })).toEqual(['type', 'line', 'content', '']);
    });
});

describe('toLogEventFromFields', () => {
    it('reads a line entry back into a line event', () => {
        expect(toLogEventFromFields(['type', 'line', 'content', 'building']))
            .toEqual({ type: 'line', data: 'building' });
    });

    it('reads an end entry back into an end event', () => {
        expect(toLogEventFromFields(['type', 'end', 'status', 'success'])).toEqual({ type: 'end', status: 'success' });
    });

    it('defaults a line entry with no content to an empty line', () => {
        expect(toLogEventFromFields(['type', 'line'])).toEqual({ type: 'line', data: '' });
    });

    it('returns null for an entry carrying no known type', () => {
        expect(toLogEventFromFields(['level', 'debug'])).toBeNull();
    });
});

describe('toCreateLogDtos', () => {
    it('numbers the rows from the order of the stream, starting at one', () => {
        const entries: RedisStreamEntry[] = [
            ['1-0', ['type', 'line', 'content', 'first']],
            ['2-0', ['type', 'line', 'content', 'second']],
            ['3-0', ['type', 'end', 'status', 'success']],
        ];

        expect(toCreateLogDtos('deployment-1', entries)).toEqual([
            { deploymentId: 'deployment-1', seq: 1, type: 'line', content: 'first', status: null },
            { deploymentId: 'deployment-1', seq: 2, type: 'line', content: 'second', status: null },
            { deploymentId: 'deployment-1', seq: 3, type: 'end', content: null, status: 'success' },
        ]);
    });

    it('skips an unreadable entry without leaving a gap in the sequence', () => {
        const entries: RedisStreamEntry[] = [
            ['1-0', ['level', 'debug']],
            ['2-0', ['type', 'line', 'content', 'first']],
        ];

        expect(toCreateLogDtos('deployment-1', entries)).toEqual([
            { deploymentId: 'deployment-1', seq: 1, type: 'line', content: 'first', status: null },
        ]);
    });

    it('returns no rows for an empty stream', () => {
        expect(toCreateLogDtos('deployment-1', [])).toEqual([]);
    });
});
