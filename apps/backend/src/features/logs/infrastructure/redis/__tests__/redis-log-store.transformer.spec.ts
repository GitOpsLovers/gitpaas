import { StoredEvent, toLogEvent } from '../redis-log-store.transformer';

describe('toLogEvent', () => {
    it('maps a stored "line" event to a domain line event, dropping the seq', () => {
        const stored: StoredEvent = { seq: 5, type: 'line', data: 'Building image...' };

        expect(toLogEvent(stored)).toEqual({ type: 'line', data: 'Building image...' });
    });

    it('maps a stored "end" event to a domain end event carrying its status, dropping the seq', () => {
        const stored: StoredEvent = { seq: 12, type: 'end', status: 'failed' };

        expect(toLogEvent(stored)).toEqual({ type: 'end', status: 'failed' });
    });

    it('preserves a success terminal status', () => {
        const stored: StoredEvent = { seq: 1, type: 'end', status: 'success' };

        expect(toLogEvent(stored)).toEqual({ type: 'end', status: 'success' });
    });
});
