import { toLogRows } from '../persistent-log-store.transformer';

describe('toLogRows', () => {
    it('produces one line row per captured line followed by a terminal end row', () => {
        const rows = toLogRows('d-1', ['pulling', 'building', 'starting'], 'success');

        expect(rows).toEqual([
            {
                deploymentId: 'd-1', seq: 1, type: 'line', content: 'pulling', status: null,
            },
            {
                deploymentId: 'd-1', seq: 2, type: 'line', content: 'building', status: null,
            },
            {
                deploymentId: 'd-1', seq: 3, type: 'line', content: 'starting', status: null,
            },
            {
                deploymentId: 'd-1', seq: 4, type: 'end', content: null, status: 'success',
            },
        ]);
    });

    it('carries a "failed" terminal status onto the end row', () => {
        const rows = toLogRows('d-2', ['boom'], 'failed');

        expect(rows).toEqual([
            {
                deploymentId: 'd-2', seq: 1, type: 'line', content: 'boom', status: null,
            },
            {
                deploymentId: 'd-2', seq: 2, type: 'end', content: null, status: 'failed',
            },
        ]);
    });

    it('emits only the end row (seq 1) when there are no captured lines', () => {
        const rows = toLogRows('d-3', [], 'success');

        expect(rows).toEqual([
            {
                deploymentId: 'd-3', seq: 1, type: 'end', content: null, status: 'success',
            },
        ]);
    });

    it('assigns monotonic sequences starting at 1 in line order', () => {
        const rows = toLogRows('d-4', ['a', 'b'], 'success');

        expect(rows.map((row) => row.seq)).toEqual([1, 2, 3]);
    });
});
